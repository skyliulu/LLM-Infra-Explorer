# 其他章节：新版 Skill 初筛

日期：2026-11-14（Asia/Shanghai）。基准提交：`455137f46baefc6a06f99ebb82feb15fbbf4498f`。本次先提交推送已认可的 DeepInfer / Skill，再评审其他12章；不修改这些章节。

**结论：优先修 LLM Inference、FlashAttention、DP Attention 的讲解正确性，再补 Engram 的可检验机制。其余章节有局部改进空间，但没有证据支持统一重做。** 新 Skill 最有用的改变是把“对象画出来、测试通过”与“对象之间的真实关系成立”分开验收。

## 已提交与部署

- 已提交并推送 `main`：[`455137f`](https://github.com/skyliulu/LLM-Infra-Explorer/commit/455137f46baefc6a06f99ebb82feb15fbbf4498f)，包括章节、共享集成、两套 Skill、研究/修复/渲染证据；根目录临时 `debug.log` 未纳入。
- [GitHub Pages run #97](https://github.com/skyliulu/LLM-Infra-Explorer/actions/runs/43458667510) 的 build / deploy 均成功（总47秒）。GitHub CLI未登录，公共API受限，最终用公开Actions页面确认对应commit和Success，没有要求用户配置凭据。
- [线上 DeepInfer](https://skyliulu.github.io/LLM-Infra-Explorer/#deepinfer)。另外尝试直接打开线上页面时浏览器连续超时，故不声称完成了本次线上像素验收；本地 production 的实际浏览和既有修复验收另有证据。
- 本目录是推送后的本地评审产物，未再次提交或部署。

## 优先项

### 1 · P2 · LLM Inference：可读的数值没有形成同一条计算链

位置：`src/components/llm-inference/model.js:101,227`；`TensorWorkbench.jsx:250`；`LLMInference.jsx:133`。

在 Prefill、第1层、6个输入位置时，因果注意力第一行的概率是 `[1,0,0,0,0,0]`。根据页面的 `Context = PV`，第一行输出必须等于 V 的第一行。独立加权求和得到 `[0.56,-0.37,-0.97,-0.74]`，实际模型/面板输出却是 `[-0.91,-0.86,-0.07,0.79]`。主作者实际打开 Dense 分支、定位 Context 检查了可见数值，[截图](evidence/llm-context-values-light.jpg)；Node复现在 [reproductions.json](reproductions.json)。

原因是 Q/K/V、score、attentionOutput、FFN和logits使用不同 seed 独立生成。这能示意形状，却不能同时把这些数字当作乘法和归一化的结果。“代表性切片”也无法解释 one-hot 第一行的反例。[Transformer §3.2.1](https://arxiv.org/html/1706.03762v7#S3.SS2.SSS1) 定义的是同一组概率对 V 的加权求和。

建议保留小矩阵、32层状态机和当前布局，用确定性小权重真正算出一条 QK→mask/softmax→PV→输出、代表性FFN/LM Head计算；用手算one-hot行和独立参考结果回归。深层维度可以缩小，运算关系不能换成独立装饰数值。

次要改进（P3）：`LLMInference.jsx:345,357,630`使用固定生成词轨迹，温度/top-k/top-p改变分布却不参与生成词选择。预设词不是“不可能采到”，因此不报成采样数学错误。可加入固定随机数/种子的真正选择和反馈，或明确固定文本轨迹的展示范围。

### 2 · P2 · FlashAttention：执行依赖与尾部排空需要修正

位置：`src/components/flash-attention/model.js:105–106,142–149`；对应伪代码 `FlashAttention.jsx:581,584`。

- V1 backward：页面先执行 `dvdk`，其伪代码已经使用 dS；下一步 `softmaxBwd` 才产生 dS，且前面没有展示 dP 的生产。主作者切到V1/反向实际读到同样顺序。[FA1反向算法](https://arxiv.org/html/2205.14135#S7.SS4)保留这些生产/消费依赖；不能把尚未产生的 dS 用来算 dK。
- V3 forward：有第二块的QK1、Softmax1，但没有PV1/最终等待就提交O/LSE。主作者实际看到的时间条只有一项 `WGMMA output tile 0`，[可见时间条与代码](evidence/flash-v3-tail-light.jpg)。[FA3 Algorithm 2，论文第7页](https://tridao.me/publications/flash3/flash3.pdf)在epilogue之前还要处理最后一块PV并等待完成。

这里判的是教学执行图和伪代码，不是在报告上游FlashAttention实现存在bug。建议按真实块身份补齐生产/消费边、最后一块PV及等待，增加依赖DAG和尾部排空回归；保留有效异步并行。

**反证后撤回的过强结论：** TMA KV0与QK0、Softmax0与PV0的聚合条重叠，不能单独证明执行错误。K可能先于V就绪，概率子块也可以流式产生。独立审查初稿把这些重叠直接判错，主作者质疑后更正。当前图没有展示这些细粒度映射，可列为澄清点；不能据此把FA3全改成串行。

另一个就地文案问题：V1切反向后，“能力边界”仍说展示前向Algorithm1，说明版本与执行方向的解释也需要同步检查。

### 3 · P2 · DP Attention：Decode 当前输入和历史缓存用了同一个 S

位置：`src/components/DpAttention.jsx:12`；`src/components/dp-attention/model.js:95,104–109`。

副标题明确是Decode，但当前输入、Attention输出、MoE和返回均标 `[B/4,S,H]` / `[B,S,H]`；KV历史也使用S，界面仅把S解释为“序列”。主作者在idle及第3步Gather状态实际核对，数值复用比例成立，但长度语义没有区分。

普通逐Token Decode中，当前查询/新激活通常只有一个位置，KV历史继续增长。相同符号容易让读者以为每轮又把全部历史送过投影与MoE。[官方V3生成循环](https://github.com/deepseek-ai/DeepSeek-V3/blob/main/inference/generate.py)只传当前 `prev_pos:cur_pos` 切片，并更新位置；[MLA参考实现](https://github.com/deepseek-ai/DeepSeek-V3/blob/main/inference/model.py)区分当前seqlen和缓存区间。本轮读取的是当时main，后续实现修复前需固定提交。

建议把当前长度和历史长度分别标为查询长度/历史KV长度；Decode显示当前长度1，若讲chunk/prefill再显式展开对应分支。无需改动目前请求分片、KV复制比和通信拓扑，也不应把这些已成立的关系误判为错误。

### 4 · P2教学深度机会 · Engram：从流程追踪补到可检验的查表和门控

位置：`src/components/engram/model.js:55`；`Engram.jsx:796`附近的多头检索画布。

当前模型主要派生阶段、上下文文本、拓扑高亮和系统时间段。H1…H8、表向量、投影和gate均为固定结构/形状；更换Token后没有可比较的hash地址、检索行或gate数值。主作者手动推进到步骤7并实际查看检索和门控，[浅色](evidence/engram-gate-light.jpg)、[暗色门控](evidence/engram-gate-dark.jpg)。用户能跟随箭头，但不能用一个例子判断“重复n-gram怎样预先寻址、相同记忆怎样被不同query调节”。

这不是证明现有公式算错。其分支key投影、共享value投影和门控等结构与[官方demo](https://github.com/deepseek-ai/Engram/blob/main/engram_demo_v1.py)基本对应。改进应保留系统图，只补一条小型确定性样本：n-gram→多头地址→表行→两种query下的gate/输出，包含重复n-gram或单头碰撞边界；无需运行完整神经网络。暗色门控图中部分非当前步骤文字较弱，也宜把基础可读性与步骤强调分开检查，不用重画整章。

## 小修与深度对应

**Speculative Decoding · P3检查脚本假失败。** `scripts/check-speculative-decoding.mjs:127–128`仍查找已不存在的旧 `<main>`类名，得到-1，随后只截到末尾一个字符。实际入口已使用chapter-body，顺序仍是Race→Principles→Workbench→References。脚本失败及源码位置复现已保存；实际首屏也符合效率→正确性→实现的推进。应修检查定位，不应据此重排页面。本轮未改脚本，原失败如实保留在 [speculative.log](speculative.log)。

**Linear Attention · P3实现对应。** `linear-attention/content.js:29,65,128`等处讲一般双轴alpha/beta递推，同时使用“论文版GLA”措辞。双轴一般形式有论文依据，不是算法错误；但[GLA论文§3.4](https://arxiv.org/html/2312.06635v2#S3.SS4)实际采用beta=1、低秩alpha参数化等设计。建议补“通用形式→实际采用特例→为何省参数/执行”的现有下钻说明。没有独立check:linear入口是覆盖缺口，不等于算法不正确。

## 12章处理建议

| 章节 | 本轮建议 | 应保留的部分 |
| --- | --- | --- |
| LLM Inference | 第一批：修一致数值链；随后明确采样反馈范围 | Prefill到首Token、32层循环、每层KV、MHA/GQA/MLA表示 |
| Flash Attention | 第一批：修反向依赖和V3尾部；说明细粒度就绪 | HBM/片上分层、版本差异、资源口径 |
| DP Attention | 第一批：分开当前输入与KV历史长度 | 请求归属、复制比、TP/EP桥接 |
| Engram | 第二批：一个可计算的lookup/gate样本 | 原有系统拓扑、张量流、异步数据移动 |
| Linear Attention | 补论文实际参数化对应；完善独立模型检查入口 | 固定状态对比、S/z与GLA不同路径、直接递归可视化 |
| Spec Decode | 修陈旧检查定位；不依据假失败重排正文 | 效率→正确性→实现顺序，验证/纠正及KV状态 |
| Quantization | 保留主体，局部改进标题/控制布局即可；继续按具体后端抽查 | 固定SGLang路径、scale/分配/写入生命周期、真实数值与格式 |
| Radix HiCache | 保留；后续按真实用户困惑定点完善 | 连续请求、树/物理页联动、ack后发布、保护引用和失败回退 |
| Sparse Attention | 保留；密集画布的可读性可定点调优 | 缓存驻留/选择读取分开，独立indexer成本、来源与联合归一化 |
| DeepSeek CED | 保留，后续具体版本改动再重核参考实现 | KV owner与Top-K来源、层间共享、字节账本、SWA及会话恢复 |
| Parallel Strategy | 保留；减少首次阅读控制密度是可选体验优化 | 正交沙盒边界、rank映射、DCP复用TP等现实限制 |
| Flash Decode | 本轮无已证需阻断的问题，可补归约数值的可见过程 | Split/Unsplit、分页与逻辑分片、GQA映射及精确合并 |

“保留”表示本轮没有足够证据支持大改，不等于授予全部配置/后端正确性认证。Quantization标题在当前桌面宽度被长精度控件挤换行、Sparse/Linear画布需横向阅读等有局部体验空间；这些没有升级为算法缺陷，也不作为全面重做的理由。

## 覆盖和限制

- 使用新版 Analyze Technical Principles 和 Develop Interactive Module，包含implementation-fidelity/reader-review标准。主作者实际浏览全部12章中文浅色首屏、内容层次和可见结构；四个优先章另深入关键图/分支。阅读材料保存在各 `*-page.txt`，截图在 `evidence/`；保存整段DOM文本不等于整章通读，本轮不声称完成12章完整owner交付验收。
- 三个独立只读子审查各负责4章，查看入口、纯模型、测试和必要一手来源。主作者另外复现数值、读取实际页面，并质疑/更正FA3聚合重叠的过强判断；没有把子审查的自述直接当视觉验收。
- 新执行11组现有npm模型检查：10组通过，Speculative因陈旧静态定位失败；Linear没有独立npm检查入口。每组命令、执行时间和exitCode在 [checks.json](checks.json)，输出在对应log。所有检查通过的章节也仍可能存在跨张量、跨阶段的关系错误，LLM和Flash即为反例。
- [reproductions.json](reproductions.json)包含LLM独立PV求和、FA操作清单、DP形状、Engram派生字段及Speculative源码顺序。未执行上游Python/CUDA、GPU性能或精度测试。
- 本轮主要是中文桌面初筛，暗色只抽查Engram门控/DPA活跃状态；未执行全站中英×主题×设备矩阵，也没有给出全站视觉通过结论。后续修改各章时再按受影响范围做完整交付验收。
- 仅新增本地评审产物，章节/运行时未变；DeepInfer已认可提交和部署保持不变。建议修复顺序为LLM数值链→Flash依赖/排空→DP长度语义，再Engram确定性样本；Speculative检查定位可作为独立小修先处理。
