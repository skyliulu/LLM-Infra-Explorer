# 六项章节修复与验收 · 2026-11-14

本轮承接 `../chapters-new-skills-2026-11-14/review.md` 的评审，按用户“可以改下”执行局部修复。保留既有章节、主要区域和学习顺序。DeepInfer 已接受的版本不在本轮改动中；Speculative 只修检查脚本。

## 修复结果

| 范围 | 原问题 | 本轮结果与边界 |
| --- | --- | --- |
| LLM Inference | 张量各自造数，PV 与 V 对不上；候选分布不决定固定输出 | 用同一个四维、六词词表的合成模型计算 32 层。Embedding、RMSNorm、QKV/RoPE、因果 Softmax、PV、投影/残差、Dense 或 Top-2 MoE、最终归一化/LM Head 贯通。固定 CDF 抽样的 ID 进入下一轮输入。不是训练模型；完整前缀计算是可复算参考，不声称真实增量内核性能。 |
| FlashAttention | V1 在 dS 产生前使用梯度；V3 缺第二次 PV 与排空；图/代码定义不一致 | V1 依次 dV/dP → dS → dQ/dK → 写回；阶段公式与伪代码统一 scaled-score 定义。V3 同一 Q、两块 KV，分开 K/V 就绪，保留合法交叠，补重缩放、PV1、等待和最终提交。时间为依赖示意，不是实测 GPU trace。 |
| DP Attention | 混淆本轮激活长度和历史缓存长度 | 普通逐 Token Decode 的本轮形状显式为长度 1，KV 单独用历史长度。Gather/FFN 不再把历史长度带入本轮激活；DP/TP/EP 原拓扑与复制比例保留。 |
| Engram | 只有抽象 hash/gate，难以核算 | 加入规范 ID → XOR/素数模 → head offset → 取行/拼接 → 共享 Value、分支 Key → RMSNorm 内积/带符号平方根/sigmoid 的小例子。可改碰撞窗口、同向/反向/正交 query，选择 head 追踪记忆。表、权重、尺寸为合成示例，明确停在短卷积之前。 |
| Linear / GLA | 一般双轴图容易被当作论文实际参数化 | 保留一般形式，实际可见的比较区说明主实验 beta=1、alpha 使用秩 16 投影；示例门来自预设序列/滑杆，不冒充训练权重。两种上下文都能看到说明。 |
| Speculative | 静态检查仍找旧 main 标签，误报阅读顺序失败 | 检查定位实际 `chapter-body`，并先断言定位存在。不因脚本误报重排页面。 |

## 独立技术复核

只读子 agent 对本轮模型、来源、检查与可见解释的对应关系进行复核，最终结论见 [source-review.md](source-review.md)。固定官方 Engram、DeepSeek-V3 源码及 GLA 论文版本写在该记录中。

复核发现并关闭：Standard 路径误带 Flash 的依赖 ID；碰撞窗口下固定 query 不再正交；图示与同步伪代码遗漏 sqrt(d) 的定义不一致。相应组合检查和公式已补。独立技术复核不替代下面的 owner 阅读/视觉验收。

## Owner 实际阅读复盘

主作者亲自读取 `http://127.0.0.1:4173/` 实际渲染页面，从页面开头按顺序读到相关章节/页脚，并检查关键分支。以连续页面正文、图形截图和真实控件操作交叉核对，不以源文件顺序或构建成功代替阅读。

| 页面与阅读路径 | 从页面重建的答案 | 操作与观察 |
| --- | --- | --- |
| `#llm`：序列/缓存 → 小模型说明 → Embedding → Attention → FFN/MoE → LM Head/采样 → 代码/状态 → 页脚 | 一个输出来自最后位置的模型前向、筛选与抽样；输出 ID 再成为 Decode 输入。历史 K/V 每层独立，新增位置读取全部历史。 | 完整播放 MoE，观察六个输出和最终 11/11、32/32 缓存；在 Decode 中检查一行 Q 对完整历史 K/V。切 Dense、修改 Top-K 清空旧输出/生命周期。英文输出 `will, The, ment, The, The, develop`，中文同 ID 重标记为 `会、人工、的、人工、人工、智能`。合成模型产生不通顺文本是页面明确说明的限制。最终归一化代码和舍入说明另行复读。 |
| `#flash`：内存/资源 → HBM 与片上对应块 → 执行管线 → 同步代码 → 设计差异/边界 → 页脚 | 不存完整 S/P 省 HBM；具体并行版本仍需遵守每一块的生产消费关系。V3 的交叠不允许跳过最后 PV 或提前提交。 | 实际走 V1 backward 的 dV/dP 阶段，dV 生成、dQ/dK 尚未生成；走 V3 forward 到 12/13 等待 PV1、13/13 提交、完成；检查 Standard backward 对照。等待与依赖文字、代码高亮、相同 Q/KV 块保持对应。 |
| `#dpattention`：Decode 条件 → 四 rank 数据路径 → 通信 → 返回本地矩阵 → 代码/解析 → 页脚 | DP 按请求分 KV，单卡历史变少；本轮每请求仍只有一个位置。MoE 通信取决于 TP-FFN 或 EP，而不是把整段 KV 历史重新计算。 | DP+EP 走到完成，25%/100%/1x；Standard TP 完成，100%/400%/4x。检查 TP-FFN Gather 的 `[B,1,H]` 以及 EP 按专家路由。 |
| `#engram`：层拓扑 → 微观图与数值例 → 伪代码 → 推理/训练时间轴 → 数学推导 → 页脚 | ID 决定地址，隐藏 query 决定取出的记忆注入多少；多头减轻碰撞但不保证无碰撞。共享 V 与分支 K 的角色不同。 | 基础、碰撞窗口；同向、反向、正交；head/拼接段选择。实际碰撞+正交得到分支 1 gate=0.500，其他地址/记忆保持对应。推进九步并读训练时间轴的 All-to-All 取行及反向边界，再回到推理路径。 |
| `#linearattn`：计算路径/成本 → 可寻址性 → GLA 一般式与论文特例 → 单步更新/Inspector → 页脚；再看 Prefill | 固定状态替代独立 KV；GLA 可衰减旧状态，仍有有限状态的信息损失。论文主实验是一般双轴式的特例，不能把一般图说成部署权重。 | 选择 GLA，切 t2、用键盘调门强度到 90%，确认实际状态改变；切 Prefill 并回到 Decode，检查特例说明两处都可见。System 后当前 Token 索引 1 与门强度 .9 保持。 |
| `#speculative`：效率 → 正确性例子 → 协作模型/KV → 算法与代码 → 边界/页脚 | 先建立 Target 决定接受/修正的原因，再进入树和 KV 实现。 | 当前实际顺序与修复后的静态检查一致；此页没有产品改动或新增整章认证。 |

阅读中发现并修复后复看：

- Engram 新样例曾落入旧 700px 画布，已移出并在 390px 视口核对为 321px 宽；原复杂张量图继续在局部横向滚动。
- GLA 说明最初写入未使用的非 compact 组件，已转到真实比较区；验收实际可见内容，而非仅检查字符串存在。
- Flash backward 片上阶段曾套用 forward Softmax/提交 O 公式，现显示 dS/梯度写回；Standard 直接读取已保存 P 的说明也单独区分。
- LLM 数字字号从 7px 提到 9px，降低待执行态的淡化；在手机、平板和 1440px 中排列数值矩阵，在 1536px 断点另查并列矩阵，避免数字互相挤压。
- 英文 GLA 图例在 768px 曾撑宽页面，已将横排断点移到宽桌面；复看两主题该组合，不再溢出。

## 渲染矩阵与交互证据

五个产品改动页各 12 个组合：390×844、768×1024、1440×900 × 中/英 × Light/Dark，共 60 个。逐项生成实际截图和 DOM 几何/公式事实；最终 [matrix-summary.json](evidence/matrix-summary.json) 中各页 12 项，页面级溢出与 KaTeX 错误均为零。

逐项截图在 `evidence/<chapter>-<theme>-<lang>-<width>.png`，对应 JSON 记录实际视口尺寸；各页 `*-matrix.json` 汇总。主作者重点打开各章的浅/深色及不同尺寸截图，结合上面的分支检查判断颜色、文字、数字和控件；不声称独立 reviewer 逐像素复查了全部 60 张图。原有 FA/DPA/Engram 密集画布保留局部横向滚动，不能把它与页面级溢出混为一谈。

System 单独检查：当前 OS Dark，选择 System 后实际 `data-theme=dark`，GLA Token 索引 1、门强度 .9 不变。见 [system-resolution.json](evidence/system-resolution.json)。未切换操作系统本身的偏好。

内置浏览器尺寸能力未实际生效（设置 390 后仍为 1109），因此不使用它证明手机尺寸；改用 Chrome 并读取实际 `innerWidth`。所有临时 viewport 设置已恢复，用户原有内置浏览器恢复 DeepInfer、中文、浅色。

控制台曾出现重建 dist 后旧页面请求已删除 chunk 的错误，重载后恢复；还观察到浏览器扩展自己的异常。最终加载的应用没有新产生的应用脚本异常，不把扩展异常记为章节失败，也不声称整个浏览器控制台从未报错。

## 可执行验证与限制

- `check:llm`：96 个代表状态、6144 个 KV 表示状态、新数值链检查。独立比较 scaled QK、因果 Softmax、PV、RMSNorm、GELU/投影、残差、LM Head、跨层输入、旧 K/V 稳定性与 CDF 边界。
- `check:flash`：原模型扫描，加 dP/dS/dQ/dK 顺序、分开 K/V 就绪、PV1 排空、合法交叠、16 条 Standard/Flash 路径依赖存在性。
- `check:engram`：100 个生命周期状态，加地址 `[4,2,6,2]`、offset 行 `[4,7,18,25]`、gate .766599121/.233400879/.5、两窗口×三 query 语义。
- `check:dpa`、新增 `check:linear`（含已有 comparison 检查）、`check:speculative`、`check:workbench`、theme 检查通过。分享 schema 覆盖 13 章，新 Engram 设置可 round-trip。
- 五个产品页的 conventions 必需检查通过；Linear 的旧 Unicode 数学标签产生一项人工复查 warning，新公式均走 MathFormula。生产 build 和 `git diff --check` 通过。构建有过期 Browserslist 数据提示，不影响本次产物。

命令输出见 [checks.log](checks.log)、[build.log](build.log)。这不是上游 PyTorch/CUDA、训练权重、全部后端或设备性能验证；不据这些演示推导吞吐或质量指标。

以上描述修复验收完成时的状态：当时尚未提交、推送或部署。后续发布版本以 Git 提交和 GitHub Actions 记录为准。原有 `debug.log` 未改动。
