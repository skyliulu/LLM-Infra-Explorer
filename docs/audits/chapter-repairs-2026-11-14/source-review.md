# DPA、Engram、GLA：独立来源与检验基准

2026-11-14（Asia/Shanghai）。独立技术研究，只读现有页面/模型和官方来源；没有改动产品源码，没有浏览器或GPU验收。此记录给后续修复提供约束与独立预期，不代表尚未完成的实现已经通过。

## 固定来源

- Engram 官方 HEAD：`fb7f84a21f91223715394a33a1dc24bbfb7f788e`。通过 `git ls-remote ... HEAD` 取得，再从官方raw下载精确SHA的 `engram_demo_v1.py`，未执行该代码。
- DeepSeek-V3 官方 HEAD：`9b4e9788e4a3a731f7567338ed15d3ec549ce03b`。同样固定后读取 `inference/generate.py` 和 `inference/model.py`。
- GLA：论文 `arXiv:2312.06635v2`，§3.1一般门控和§3.4实际模型参数化。它支持原理层的对应，不是某个最新CUDA后端的执行审计。
- 临时只读副本：`C:/Users/29043/AppData/Local/Temp/chapter-source-review-2026-11-14/`。下述GitHub定位按下载文件保留空行的实际行号，未采用web解析器压缩后的行号。

## DPA：当前输入长度和历史长度不能混同

[生成循环](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/inference/generate.py#L57-L69) 首次可输入整段前缀，随后更新 `prev_pos`，下一次普通逐Token Decode只输入新位置切片。[MLA.forward](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/inference/model.py#L446-L493) 从当前激活取得seqlen，令end_pos=start_pos+seqlen；只投影/写入本轮位置，却读取到end_pos为止的缓存。

最小保真关系：

- 当前激活/Query/Attention输出/MoE输入保持当前查询长度。普通Decode该长度为1；不能为了展示长历史，把所有旧位置重新送过投影和MoE。
- KV占用取历史长度，缓存追加只写本轮位置；请求分片后的本地Batch与当前查询长度是不同轴。
- DP→TP Gather汇集本轮各请求的Attention输出，不是汇集每个请求的所有历史激活。
- 这不要求扩大到prefill/chunk/投机验证。如果页面只讲普通Decode，直接固定查询长度1并明确条件，比泛化出未实现的模式准确。

独立oracle：设B=8、4个DP rank，历史128或1024，每卡当前输入都应是2请求×1位置×H；KV历史轴从128变1024，当前输入和MoE本轮行数不变。每卡/集群KV字节随历史增长8倍，已有复制比与请求归属关系保持不变。若代码并不允许改历史数值，至少形状符号必须不同、说明独立轴，不能用同一个未约束S冒充二者。

## Engram：可计算样本必须保留的关系

[hash路径](https://github.com/deepseek-ai/Engram/blob/fb7f84a21f91223715394a33a1dc24bbfb7f788e/engram_demo_v1.py#L264-L296) 使用压缩Token ID，当前位置先乘对应layer的第0个乘数，前一位置乘第1个，以此类推，对乘积做按位XOR。同一n-gram的mix被各head用不同素数取模；不是每head凭query随机生成地址。[表布局](https://github.com/deepseek-ai/Engram/blob/fb7f84a21f91223715394a33a1dc24bbfb7f788e/engram_demo_v1.py#L300-L325) 对各head加入独立offset，再从合并表中取行。

[投影与gate路径](https://github.com/deepseek-ai/Engram/blob/fb7f84a21f91223715394a33a1dc24bbfb7f788e/engram_demo_v1.py#L350-L377)：检索向量拼接后，key投影按HC分支独立，value投影共享。query来自该HC分支hidden state。key和query分别RMSNorm，内积除sqrt(D)，再进行带符号平方根（绝对值下限1e-6）和sigmoid。gate乘共享value并广播到分支，之后才进入短卷积及其残差。原demo本身声明是演示实现，不应称为生产kernel。

必须分清：地址由Token及layer决定，gate由当前hidden query与检索key决定。相同n-gram可预先算地址；query改变不应改变地址/检索行/shared value，却应允许gate/分支注入变化。小样本可以缩成2个head、2维向量、自定义素数和合成权重；必须明确这些是教学参数，不冒充实际tokenizer ID、训练权重、8-head配置或性能测量。

### 手算hash/lookup oracle

使用已给定的规范ID，时序为 `[3,2,1]`（最后1是当前），当前到过去乘数 `[3,5,7]`：

- 2-gram：`(1×3) XOR (2×5) = 9`，head素数5、7给地址4、2。
- 3-gram：`9 XOR (3×7) = 28`，head素数11、13给地址6、2。
- 四表容量5、7、11、13，offset为0、5、12、23，合并表行号为4、7、18、25。局部地址和物理offset须分开，不可让不同head意外共用一行。
- 重复同样规范ID得到完全相同的全部地址；改变hidden query不改变地址。
- 碰撞边界：2-gram `[2,1]` 的mix9和 `[6,1]` 的mix29在mod5都得到4，但mod7分别2和1。一个head碰撞不代表全部head相同，也不能声称多头彻底消除碰撞。
- JS按位操作是32位有符号；此小样本数值足够小可直接用XOR。若使用真实64位乘数，应BigInt/显式int64语义，不能把32位截断当作上游int64等价实现。

### 独立gate oracle

设D=2、norm增益1、eps=1e-6（教学数值选择，明确不声称PyTorch不同dtype默认eps/舍入的位精确复现），key `[1,1]`、共享value `[3,-1]`：

| query | 归一化内积/sqrt(D) | 带符号平方根 | sigmoid gate | gated value |
| --- | ---: | ---: | ---: | --- |
| `[1,1]` | 1.4142121482 | 1.1892065204 | 0.7665991210 | `[2.2997973630,-0.7665991210]` |
| `[-1,-1]` | -1.4142121482 | -1.1892065204 | 0.2334008790 | `[0.7002026370,-0.2334008790]` |
| `[1,-1]` | 0 | 0 | 0.5 | `[1.5,-0.5]` |
| `[0,0]` | 0 | 0 | 0.5 | `[1.5,-0.5]` |

这些数值由独立短Node参考公式计算，不导入章节模型。比较建议容差1e-8到1e-6，按展示精度另设舍入容差。特别要保留 `sign(0)=0`：clamp绝对值后不能把零相关性误变成正门控。

该小实验可停在gated value，并标注后续短卷积/残差仍在主图中；如果把小实验输出直接称为完整Engram output，就必须再计算对应卷积和残差，不能静默跳过。

## GLA：一般形式与采用的模型特例

[论文v2 §3.4 Parameter allocation](https://arxiv.org/html/2312.06635v2#S3.SS4) 明确去掉beta投影、令beta=1，并以低秩因子代替alpha的完整投影；中间秩为16，采用key维约模型维一半、value维约模型维。一般双轴门控依然有论文依据，不能把其矩阵递推改判为算法错误。

最小修复可保留通用双轴的图和计算，只把它称为一般形式，旁边解释实际采用beta=1的特例以及低秩alpha的原因。若UI新增论文特例切换，模型、门控矩阵、数值状态和解释必须一起改变；不能只改标题。HTML提取的低秩alpha温度公式存在排版歧义，不应直接从HTML字符串照抄成新的数值公式；本轮可只说明因子形状和beta固定，不扩展温度实现。

独立递推oracle：旧S=`[[1,2],[3,4]]`、alpha=`[0.8,0.5]`、beta=`[1,1]`、k=`[2,1]`、v=`[1,-1]`。G按alpha行衰减，所以G=`[[.8,.8],[.5,.5]]`；`S_new = G ⊙ S_old + kᵀv = [[2.8,-.4],[2.5,1]]`。q=`[1,2]`时，直接qS输出=`[7.8,1.6]`，没有核Linear的z归一化。一般式beta=`[.5,.25]`则得到S_new=`[[2.4,-1.6],[1.75,-.5]]`、输出=`[5.9,-2.6]`。这能检查两模式是真改变了递推，或验证所保留一般式的轴方向。

## 当前验收状态

来源与建议oracle已就绪；产品实现尚未在本记录中验收。没有运行上游依赖、训练权重、tokenizer、Python/CUDA或实际设备性能测试。后续只对本次改动的明确语义作独立复核，不把此报告当作整章/全部后端的通过证明。

## 工作区修复的独立技术复核

后续应主作者请求重新读取当前六项修复。执行 `check:llm`、`check:flash`、`check:dpa`、`check:engram`、`check:speculative`、`check:workbench`，全部通过；另外直接执行新增 `scripts/check-inference-numerics.mjs` 也通过。未调用浏览器或上游Python/CUDA。

已成立的关系：

- LLM数值样本现在由合成Embedding和逐层确定性权重真实计算：RMSNorm→QKV/RoPE→scaled QK/因果Softmax→PV/输出投影→残差→Dense或Top2混合FFN→最后一行LM Head。同一前缀延长后旧层K/V不变；小尺寸/untrained/full-prefix reference的边界明确，没有伪称真实权重或测得加速。原one-hot第一行反例已消除。固定CDF抽样返回sourceIndex，当前采样ID进入下一轮tokenIds，原预设词反馈缺口已闭合。
- Flash V1反向先产生dV/dP，再产生dS，再使用dS计算dQ/dK；V3拆开K/V就绪，PV0与下一块工作交叠，最终PV1、等待、epilogue补全。重缩放不早于PV0与下一块统计完成。保留异步重叠，没有无依据全部串行化。
- DPA现用当前输入长度1和历史 `T_KV`，MoE/Gather本轮输入不再用历史长度S；原请求归属和复制比例保留。
- Engram样本的hash、独立head offset、检索向量、共享value/分支key、归一化signed-root gate均为真实可算数据；停止在gated value并明确后续仍有短卷积，范围恰当。base样本符合上文数值oracle。
- GLA保留一般双轴图，改称一般形式并说明论文beta=1/低秩alpha的特例，没有把一般形式误报为数学错误；不需要为此强行新增模式。
- Speculative检查定位已改为实际导出组件后的chapter-body，脚本通过；未为假失败重排页面。

### 两个发现，已反馈主作者，待修复后复查

1. **Flash依赖元数据泄漏到Standard路径（P3，可就地修）。** `getPipeline`按实际modelType得到`key=standard`，却仍按`config.version/direction`查FLASH_DEPENDENCIES。`getPipeline({modelType:'standard',version:'v1',direction:'backward'})`得到`softmaxBwd.dependsOn=['dvdp']`，而Standard操作清单只有独立dv/dp，没有dvdp。建议按实际key查依赖，并遍历所有modelType/version/direction保证dependency ID存在于当前pipeline。数学数据在Standard中已先算dV/dP，此项主要影响图/解释的规范映射。
2. **Engram碰撞窗口下“正交于分支1”不成立（P2教学标签/状态关系，局部修复）。** preset=collision时branch1 key变为`[1,2/3]`，query=orthogonal仍固定`[1,-1]`，独立复现score=`0.2773497674`、gate=`0.6286991222`，而base组合是0和0.5。应按当前key生成同向、反向及正交query（例如正交为`[k1,-k0]`），或把控件名称改成明确固定向量。必须补两个preset×三query组合的语义回归，避免只测试base正交就通过。

因此本次主要修复方向成立，但不能在这两个已观察项关闭之前把全部新实验状态标记无误。源码复核不替代主作者实际阅读与渲染验收。

### 两项修复复验与缩放定义核对

主作者修复后独立重跑 `check:engram` / `check:flash`，均通过；另直接导入模型遍历Standard/Flash×4版本×2方向共16条路径，所有依赖ID均属于当前路径，原依赖泄漏已关闭。两个Engram preset×三个query的全部组合重新打印检查：query由当前分支1 key生成，同向/反向内积符号正确；两个正交状态score都为0、gate都为0.5。碰撞预设下该项也已关闭，没有继承base样本通过作为替代。

新绘制的阶段公式把dV/dP与dQ/dK分开，在缩放score定义 `S=QKᵀ/√d` 下，后两项分别为 `dSK/√d` 和 `dSᵀQ/√d`，数学上正确。复验时同时发现其同步伪代码仍使用未缩放的 `recomputeS=mma(Q,K.T)` 及未除√d的dqdk，已经反馈主作者统一定义；视觉公式正确不能自动替伪代码补上因子。建议按未预缩放Q的现有标签在score、dQ/dK处显式保留缩放，避免读者需要猜测预缩放约定。此记录不扩展为所有FA后端的数值审计。

### 最终复验结论（本轮范围）

主作者同步缩放后再次检查：Standard qk、V1 recomputeS、V3 S0/S1显式使用除√d的score；共用dq/dk及V1 dqdk也显式除√d，Standard反向图与V1阶段图采用相同定义。dV/dP不额外除√d，Softmax backward先产出相对scaled-score的dS，之后链式因子只在dQ/dK应用一次，这一对应正确。再次执行 `npm run check:flash` 通过。

**本轮六项修复的独立技术复核通过；本记录曾发现的两项边缘状态问题及后续缩放不一致均已关闭，当前范围无剩余阻断项。** 这仅确认本次小模型数学关系、依赖/尾部、形状语义、示例lookup/gate、GLA范围说明及检查脚本修复，不是所有FA版本、设备后端或真实模型权重的全面数值认证。没有浏览器、GPU或真实性能验证声明；主作者的实际阅读/视觉/交互验收仍另行负责。
