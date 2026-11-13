# DeepInfer 深度扩展独立复核

2026-10-27，独立复核 agent。此文件记录源码/模型审查，不代表主 agent 的交付完成判定。主 agent 同时修改代码，以下区分审查时仍存在的问题与已复核关闭的问题。

## 范围、方法与限制

- 审查本轮 `SystemExplorer.jsx`、`system-model.js`、`system-content.js`、`system.css`、DeepInfer 集成，以及 community analysis skill、`technical-analysis.md` 和 QA checklist 的新增要求。
- 上游只读目录：`C:/Users/29043/AppData/Local/Temp/deepinfer-primary-research`；HEAD 为 `553741557a57df44a46fb3ab72b6aafeaf945337`。主要核对生产 Q&A、`mlp.py`、`index_attn.py`、`attention_backend.py`、`mtp_varlen.hpp`。未运行上游代码、安装依赖或获取模型权重；未研究未提供的 kernel 依赖内部实现。
- 采用有边界的相关源码切片，而非完整仓库审计；本轮不操作浏览器。明暗主题、断点、键盘与分享链接的实际行为尚待主 agent 的浏览器证据及后续截图复核。
- `node scripts/check-deepinfer.mjs` 通过：12 个 MoE dispatch 配置、20 个 DSpark 分配案例及穷举前缀 oracle、8 个双语机制，原有 612 trace snapshots、18 settings 与 10 dependency schedules 也通过。
- 上游初始状态已有六个 vendor 链接/子模块路径显示删除；复核前后状态一致，未修改上游。

## 首轮发现历史

### D1 — P2：E/P/D 总览没有呈现 E 的实际分支

**observed**：`SystemExplorer.jsx` 的 `dis-system-flow` 仅有 Recipe → Prefill → Decode → response。VE 只在 `systemNote`/部署正文中出现；没有 image → VE embedding → Prefill 的节点或连接。Prefill/Decode 两个按钮也都只打开同一篇部署说明。

**复现**：进入本轮新增总览或选择 E/P/D。仅观察图形，无法区分文本输入与图像编码支路，也无法看到三个独立部署角色的输入输出。对框架架构的请求而言，这仍将官方 E/P/D 架构压成 P/D 流程；不是要求实现未开源的在线服务。

**source**：上游 `doc/inference_deployment_qa.md:31–65` 明确 disaggregated Vision Encoder / Prefill / Decode；`:119–123` 说明 Prefill 机器选择 VE 机器、按 image patches 负载选 GPU，再得到 embedding。该分支可以作为清楚标注的生产文档证据展示，无需伪装成 offline engine 实现。生产请求级负载均衡与 EPLB 的区别，也应保留可见边界。

**建议修复判据**：总览能看见 VE 并存支路及 embedding 接入 Prefill；保留文本路径、公开引擎/生产系统的证据等级区分。

### D2 — P2：Attention “kernel 链”仍是泛化说明，且混淆 paged 调用的适用阶段

**observed**：选择 `attentionKernel` 仅得到四段 `dl` 正文与一个 `attention_backend.py#L26` 链接，尚无实际调用链或张量/索引对象。正文统称 DeepGEMM 的 paged MQA 分数，而适用范围只在结尾泛称 Prefill/Decode 不同。

**复现**：选择 Attention kernel 链。读者无法从当前呈现判断哪个入口消费连续 Prefill KV、哪个入口消费 paged Decode cache；也无法沿一个 Query 的 Q/scale → score → Top-K → physical slot → FlashMLA 路径追踪对象。仅链接 backend 不能核对 indexer/DeepSelect 部分。这是当前新增教学深度的具体缺口，不是要求披露依赖内部 tile/SASS。

**source**：上游 `deepinfer/model_executor/models/v4_modules/index_attn.py:284–325` 的 Prefill 调用是 `fp8_fp4_mqa_logits` / `fp8_fp4_sparse_mqa_logits`；`:421–453` 的 Decode 调用才是 `fp8_fp4_paged_mqa_logits` / `fp8_fp4_paged_sparse_mqa_logits`。`deepinfer/model_executor/layers/attention_backend.py:26–75` 与 `:78–170` 分别给出 Prefill/Decode 的 query、index、cache shape/precision contract 及 fused/nonfused 分支。

**建议修复判据**：至少一个实际可核对的调用链，区分两个入口、标明关键对象/布局/精度和节点级源码；如只实现某一条链，明确其阶段边界。MoE 的分支条件图已经证明另一种有价值的浅层互动，但不能代替此 Attention 链。

## 已发现并复核关闭

### D3 — P2：机制切换丢失实验配置（已关闭源码层缺陷，浏览器待实测）

最初 `KernelPath` 与 `Verification` 使用组件局部 `useState`，二者又按 selection 条件挂载。Mega 改精度/域 → 切 DSpark → 返回，或 DSpark 改预算/分布 → 切其他机制 → 返回，会恢复默认值。

主 agent 已将五项配置改为 `useExperimentState`，并在 `experiment-sharing.js` 注册 bool、三种精度、整数预算 0–9 和两种 confidence profile 验证器。本 reviewer 已读取更新后的调用点与 schema，源码层问题关闭；跨机制/Home/分享链的真实持久性由主 agent 继续做浏览器验证。

## 没有发现反例的技术边界

- **observed**：`deriveMoeDispatch` 的布尔条件对应上游 `mlp.py:184–188`，没有把 Mega 与 separate 路径误画成串联必经步骤。`:530–563` 的对称 buffer/路由写入与 Mega 调用、`:565–616` 的 dispatch → routed experts → combine 支持其逻辑 stage map。该图只复现分支，不是 GPU 时间或完整 kernel 内部模拟；UI 已披露这一边界。
- **observed**：DSpark toy 使用逐位置条件概率的累积乘积，固定预算选择前缀收益，始终保留每请求一个主行。上游 `mtp_varlen.hpp:150–265` 支持 main rows、排序分配和硬件成本择预算；toy 明确省略后者，没有把“选择验证”写成“已接受”。当前数学变量解释也已补充。
- **observed**：生产 cache 的独立存储、SWA host state 和 128-token 近似 bounded replay 对应生产 Q&A 的 KV cache 部分；该数字应继续保持生产文档边界，不能替代公开引擎配置默认值。公开 release README 的 retained suffix 为 140，且必须覆盖 SWA 加 backtracking；两者不是相同配置的互相矛盾测量。
- **observed**：代码分析 skill 强制目标只读、证据等级、revision 和输出边界；technical-analysis 新增 breadth-before-question、actual dispatch/tensor contract 与机制连接要求；QA 明确 Light/Dark、System resolved theme、语言/宽度及实验状态保持。未发现这些修订本身有 P0–P2 级阻碍。是否真正执行，不能由文档措辞或模型枚举替代渲染证据。

## 第二次源码复核：D1 关闭，D2 仍有索引语义错误

主 agent 新增 `dis-vision` 图像 → VE → embedding → 汇入 Prefill 支路；正文保留生产文档与公开 offline 引擎边界。**D1 在源码层关闭**，视觉连接清晰度待截图。

Attention 已新增两条节点级 source 链，并正确限定 paged MQA 属于 Decode；旧的“只有正文”和 paged 泛化问题已修。但 **D2 仍为 P2 开放项**：`AttentionPath` 对 Prefill、Decode 都放置“逻辑位置 → 物理槽位”，且两条链的 Top-K/slot 节点均链接 Decode 的 `index_attn.py:494` / `:508`。

**复现**：选择 Attention kernel 链，检查 Prefill 行的 Top-K 后继节点和链接。它宣称 Prefill 将 Top-K 结果转换成 paged-cache 物理槽，实际源码没有此步骤。

**source**：`index_attn.py:327–376` 的 `_topk_prefill` 用 `output_idx_offset=ks[chunk]`，必要时 restore candidate indices，然后直接返回；`:543–545` 的 forward 返回契约说明 Prefill 为拼接 key sequence 的 global index。只有 `_topk_decode` 的 `:506–513` 调用 `convert_kv_index(..., input_metadata.block_tables)` 转为物理 KV slot。两种索引域正是区分入口的重要对象，不能只改入口名称而复用后续相同节点。

**关闭判据**：Prefill Top-K 链接 `:362–375`，后继说明拼接 KV 的全局索引（或明确无 paged physical-slot 转换）；Decode 保留 block table 到 physical slot 的映射。上游 backend 的 Prefill/Decode source 节点继续保留。

再次执行 `node scripts/check-deepinfer.mjs` 通过；现有纯模型测试不覆盖上述源码节点/索引域对应，因此通过不构成 D2 关闭证据。尚未开展本轮独立视觉审查，等待主 agent 的 `depth-*` 截图。

## 第三次源码复核：D2 索引语义关闭

再次读取最终 `AttentionPath`：Prefill 的 Top-K 节点现链接 `index_attn.py:362`，索引节点链接 `:370` 并标为“加 ks 偏移 → 拼接 KV 全局索引”；Decode 分别保留 `:494` 和 `:508` 的 Top-K / physical slot 路径。中英文正文也明确只有 Decode 经 block table 映射物理槽。与上游 `_topk_prefill`、`_topk_decode` 和返回契约一致，**D2 在源码层关闭**。

`node scripts/check-deepinfer.mjs` 再次通过。至此 D1、D2、D3 均无剩余源码层 P0–P2 开放项；这不替代主 agent 的浏览器操作与即将到来的明暗主题截图审查。问题历史保留在前文，第二次复核中的“仍开放”仅描述当时版本。

## 第四次源码复核：precision / graphs / modelFusion 扩展

### D4 — P2：precision 机制名与 MoE 控件共用字典键

**observed，开放**：`system-content.js` 的两个语言对象均先定义机制 `precision`（低精度与存储契约 / Precision & storage contracts），随后又以同一键定义 MoE 控件标签（激活 × 权重 / Activation × weight）。JavaScript 后项覆盖前项。因此点击 precision 时，导航与机制标题会显示激活/权重，却展示 KV 的单记录字节账本。

**复现**：导入 `systemI18n` 读取 `zh.precision` / `en.precision`，或打开该机制观察导航/标题；当前结果为控件标签。Key parity 测试不能发现对象字面量中的重复键。建议 MoE 控件单独使用 `moePrecision`，保留机制 ID 对应的 precision 标题。

### 字节边界复核

**observed**：上游 `tilelang_ops/cache_common.py:26–101` 定义 `quantized_bytes`、`num_scales`、scale 物理 dtype 与 `bytes_per_token`；`:106–141` 给出 V41 FP8、V41 Main FP4 与 FP4 index 格式。E4M3 与 UE8M0 scale 在缓存中各占 1 B，即使 UE8M0 在某些 API 边界打包为整数，也不能额外按每组 4 B 计算。

独立读取本地纯模型得到：Main 为 256 B data + 32 B scale = **288 B**；SWA 为 512 B + 16 B = **528 B**；Indexer 为 64 B + 4 B = **68 B**。与上述源码格式相符。UI 说明已排除 block alignment、metadata、全部层与全部 Token，并说明 index block 将 data/scale 分区存储，因此不能把 68 B 条形误当连续 interleaved token 物理布局。未发现该账本的 P0–P2 数值错误。

**P3 解释建议**：当前记录选择旁只显示元素数、位宽和 scale 格式，未显示模型中 `group` 的 16/32。可把“每 16/32 元素一份 scale”列在记录属性中，方便独立复算 scale 字节；这不影响当前数值正确性。

### 新增文字机制边界

`graphs` 的 graph-size >= total-q、固定 storage/padding 与 profile 成本曲线说明对应 `cuda_graph_runner.py:41–51,143–148` 及 `model_runner.py:562–640`；没有把浏览器教学时长说成真实 profile。

Engram 在层循环前 fetch、每层消费 hook 的说明对应 `deepseek.py:177–215`；mHC 的 no-intervention、lazy-post 和 Mega/fallback 边界对应 `hc.py:174–228`，输出布局可对接 Mega MoE 对应 `:256–313`。没有发现新增 prose 的 P0–P2 技术反例；这些仍是源代码解释，不能声称三项都有独立运行时模拟。

再次执行模型检查通过：12 dispatch、20 allocation、3 source-format byte oracles、11 双语机制及既有 trace 检查。

**D4 后续关闭**：最新源码已将 MoE 控件改用 `moePrecision`，两语机制标题保留 `precision`，并加入两者语义必须不同的断言；本 reviewer 已读取调用点与字典并重跑检查。D4 源码层关闭。三个字节值及 graphs/modelFusion 的以上核对结论保持有效；当前无源码层 P0–P2 开放项，本轮独立视觉审查仍未进行。

## 独立视觉复核：DSpark 明暗主题矩阵

使用 `view_image` 以 original detail 实际打开全部 12 张 `evidence/depth-theme-{1440,768,390}-{en,zh}-{light,dark}.jpg`，并读取 `depth-theme-matrix.json`。重点逐张比较平板双语明暗，另检查桌面及手机全部组合；本 reviewer 没有操作浏览器。

**本矩阵结论：未发现 P0–P2 视觉阻碍。** 覆盖状态为 DSpark uneven profile、额外预算 5、5 个 selected drafts / 8 个总 Query rows。选中 draft 同时使用描边、色面与 Selected/已选择文字；未选中与必需主行有不同语义和可读标签。浅色与深色均保留上述区别，未见浅色残留面板导致的文字消失。公式、4.15 预期值、预算/分布控件及变量说明均可读；手机主行换行而非截断，四列 draft 排列及总行数仍完整。平板的左右说明列和下方矩阵没有互相覆盖；header 在截图视口顶部，未见其侵入本次核心矩阵。

Metadata 记录每张的 preference/resolved 一致、`mathErrors: 0`、`pageOverflow: false`，并在切换主题后保持预算 5、总行数 8。此项与截图观察一致；它不是本 reviewer 独立执行的交互测试。可见边界和文字颜色足以辨认，不以 theme menu 图标代替实际画布检查。

**仍未覆盖的视觉范围**：这些 12 张都是同一 DSpark 中间配置，不能代替 kernel 分支、precision 字节轨、attention 调用链、旧请求 trace / timing 的主题状态，也不证明 System 的两个 OS appearance 分支。主 agent 已说明还会补相应边界截图；本 reviewer 等待该组证据后继续核对。当前 source 层 D1–D4 关闭状态不变。

## 最终补图与边界复核

已用 `view_image` original detail 逐张打开 16 张补图：`depth-{mega,precision,attention}-{1440-en,390-zh}-{light,dark}.jpg` 共 12 张，以及 `depth-trace-{1440-en,390-zh}-{light,dark}.jpg` 共 4 张；另读取 `depth-supplement.json` 与 `depth-browser-journeys.json`。结合前述 12 张 DSpark 矩阵，本 reviewer 实际目视范围为 28 张截图。

**最终 bounded visual verdict：上述范围未发现剩余 P0–P2 视觉阻碍，D1–D4 源码关闭状态不变。**

- Mega 桌面英文显示 separate branch、手机中文显示 fused branch；两主题下操作节点、verdict、复选框与 precision control 可辨认。换行仍保留阅读顺序，未见节点被容器截断。
- Precision 显示 Indexer 128 values、4 bits、UE8M0、group size 32，字节 64+4=68 与共有 528 B 标尺一致；scale 细条虽然很窄，但有明确数字账本，不依赖只看色宽。两主题公式完整且未见横向 scrollbar。此前 group 16/32 的 P3 解释建议已落实。
- Attention 两入口现可直接看见不同的索引语义：Prefill 是 ks/拼接 KV 全局索引，Decode 是 logical → physical slots。手机节点合理换行，两个入口保持独立标题，链接文字在明暗主题均可读。该图仍只是 source-call map，不是内部数值 kernel 模拟。
- Trace 桌面与手机明暗图保持同一 sample step 3：A 完成 6/6 Prompt 并有未提交 A1，B 仅 2/4 且没有新输出，C 未进入工作；选中 B 的观察与全局 sample operation 分离。待采样/已计算/未计算及操作阶段仍可区分；短预算公式没有出现此前的水平 scrollbar。

源码最后的小修也已读取：cache boundary 区分生产文档 128-token replay 与 public compact 默认保留 140；README:25 支持后者且要求覆盖窗口和 backtracking。structured boundary 的 NVIDIA batch-invariant + fixed seq_seed + MTP varlen disabled 对应 README:27–28，不把 seed 单独说成充分条件。

Journey metadata 记录了预算 0/9、低置信度、kernel 平台/通信域/精度分支、3 种 cache byte 值、跨机制/Home/分享恢复、sample→commit→terminal、11 个 inspector 和 System resolved dark 保留 paused progress。它们是主 agent 的执行记录，本 reviewer 读取并核对一致性，没有再次操作浏览器。截图/metadata 均没有证明 System 的 light OS 分支被执行；当前只有 prefersDark=true 的 System 分支。模型检查在最终源码上再次通过。

剩余范围限制：没有运行上游 GPU 推理或验证未提供依赖的 kernel 内部实现；没有独立重复 live browser journeys。该结论仅说明已检查的源码、模型与渲染证据中没有观察到阻碍，不替主 agent 标记项目完成。

本复核没有改动 UI、skill 或上游；仅新增并更新本文件。
