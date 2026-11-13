# DeepInfer 层级重构：独立源码复核

2026-10-28。范围为本轮 hierarchy/principles.md、SystemExplorer/system-model/system-content/system.css 及 DeepInfer 请求轨迹/时间图的关联改动。仅编辑本文件；未操作浏览器，未修改 UI 或 skill。以下是基于源码的发现，视觉验收待最终截图。

## 初次审查发现（后续关闭状态见文末）

### H1 — P2：调度完成时，请求说明错误声称已经增加历史

**复现**：默认 mixed、Prefill budget 8，推进到 step 1“安排本批”，查看 A。纯模型返回 `computed=0`、本批 `count=6,last=true`，但 `requestInspector.reason=requestPartial`，中文显示“这一步增加了已计算的历史，暂时不会生成输出”。

**问题**：此时刚完成请求/范围选择，尚未执行模型；0/6 的画布也明确没有计算历史。A 还恰好是本批完整输入，后续 sample 会生成首个输出，不能用剩余输入仍阻止采样的说明代替调度状态。该问题来自 `model.js` 按 `computed < prompt` 选择 partial 的规则没有检查 stage/selected.last；新版中文的“这一步增加了”使错位更加明确。

**源码依据**：本地 `buildRequestTrace` 在 push schedule 之后才增加 computed 并 push forward；上游 pinned `scheduler.hpp:351` 选择 seqlens_q，Worker 的 `worker.py:122` 才调用主模型。调度结果与模型完成不是同一事件。

**关闭判据**：schedule 的已选中请求说明它已入批、尚待计算；部分输入的“已增长历史/本块不输出”说明只在相应 forward/sample 状态出现。加入默认 A 的 schedule 以及真实 partial B 的阶段断言，避免只修改一个句子掩盖时序依赖。

### H2 — P3：面包屑跨两级返回与逐级返回选中不同部件

**复现**：在 execution 层选择 sampling，直接点击 service 面包屑。handler 只检查目标层 children 是否包含当前 level，得不到直接 child，因而选择 service 的第一个 child gateway。相反，连续两次“返回上层”到达同一 service 会选中 engine。

**影响**：直接回到整套服务时，焦点跳到与刚才钻取路径无关的入口，而不是包含原执行组件的引擎。level 与 inspector 并未崩坏，因此不是 P2；但层级的返回上下文不一致。

**建议**：通过 parent 链找到目标祖先下包含当前层的直接 child，使 execution → service 的 breadcrumb 和逐级 back 都选择 engine。

### H3 — P3：最终 sampler 的中文动作混用“验证”与前置验证量调度

**位置**：`system-content.js` 的 samplingAction：“如果启用推测解码，还要安排候选验证”。

**影响**：在 Attention/MoE 完成后呈现“安排验证”，容易让读者以为 DSpark 的 query-row/budget 选择此时才发生。实际预算先在 `scheduler.hpp:652` 的 `_mtp_varlen.schedule` 确定，设备 remap 在当前 Forward 前修正；最后 execute_sample 用主模型结果执行接受/采样并生成后续草稿。此句可以理解为 sampler 的接受判定，所以列为 P3 文案精度，不判定整个图的时序错误。

**建议**：改成“用主模型结果检验候选，并把实际接受长度交回引擎”，必要时补候选 Token/概率也是该接口输入；预算选择不必在本章展开。

## 已核对的结构与职责

- 三个视图确有不同父问题与 children 集合：service 定位引擎/历史系统，engine 解释 queue → scheduler → execution → results，execution 展开模型内部计算。不是把旧 11 个 feature 重新套三组标题。返回/面包屑的具体关联来自 FRAMEWORK parent 链。
- `deepseek.py:210–218` 在模型层循环中调用 decoder layer；`decoder_layer.py:155–173` 先 attention 后 MLP；`worker.py:122–154` 在整个 main model 后进入 sampler。当前 layer pair 分组加最终 sampling 的结构与该顺序一致，没有把 sampling 画成每层操作。
- CPU 结果处理是实际生命周期中的跨轮操作；职责图中 results 表示责任分离，不要求与 async worker 的代码位置逐行同序。保留的独立时间图仍承担同步/异步区别，不能用职责框图取代时序图。
- 服务层的 raw/API 输入属于外部服务定位，公开 offline 范围在 About note 明确；没有把完整线上 router/cache service 说成公开引擎已运行的实现。生产 P/D/VE 等细节被收回服务级背景，符合新的本章问题，而不是单以删减数量评价。
- Related anchors 已核实存在：Spec Decode `speculativedecoding-2`、Parallel `parallelstrategies-1`、Sparse `sparse-overview`。链接承诺为候选/验证、专家分布、历史选择，没有声称目标章已经包含完整 EPLB 或 DeepInfer 多请求 DSpark 实验。
- 中文整体改为具体动作：安排本批、执行模型、得到输出、更新请求；这些词确实降低了原账本/ledger 用语的阅读负担。H1/H3 说明自然语言仍必须与当前事件和职责一致，不能仅靠口语化成立。

## 一个已撤回的初步判断

首次阅读时曾怀疑有 children 的 engine/execution 被直接钻入，导致其 Input/Action/Output 永不可见。继续跟踪 back 后发现它会在父层选中刚退出的容器，相关接口可以被渲染；该不可达判断已向主 agent 撤回，不列为缺陷。直接下钻后再返回的交互是否足够清楚，留待截图和主 agent 的真实浏览器路径验收。

## 验证与边界

`node scripts/check-deepinfer.mjs` 通过 hierarchy parent/child、三层、selection normalization、章节归属以及既有 612 trace snapshots、18 settings、10 resource/dependency schedules。另用独立纯模型探针复现 H1 与 H2。

上游依据沿用 `553741557a57df44a46fb3ab72b6aafeaf945337`。未运行 GPU/NPU 推理或上游测试；没有浏览器操作和当前重构的独立视觉结论。本轮不修改旧 depth-review 的历史验收，其结论不能自动覆盖新的 hierarchy UI。

## 修复后源码复核

- **H1 关闭**：`requestReason` 在 active request 的 schedule 阶段先返回独立 `requestScheduled`，中英文均说明入批但尚未计算；部分输入说明在实际计算后的 unfinished prompt 保留。已读取默认 A step1 与 B step2 的两条回归断言，并重跑模型检查通过。
- **H2 关闭**：breadcrumb 现选取 `view.trail[index+1]`。execution 直接跳 service 会选 engine，跳 engine 会选 execution，与逐级 back 的父分支一致。
- **H3 关闭**：采样动作改为利用主模型结果检验候选并回传实际接受长度，不再把前置验证预算安排放在 sampler 动作描述中。中文与英文一致。
- 执行层 intro 还补充 Token 位置、缓存地址和 CUDA Graph 的具体接口作用，进入子层时即可理解执行器整体责任，无需为了阅读此解释先退回。

当前源码层没有剩余 P0–P2 开放项。这是对已发现问题和所读范围的结论，不预设后续视觉通过。

## 冻结版本的 36 张层级矩阵视觉复核

已实际用 `view_image` original detail 逐张打开 `hierarchy/evidence/{1440,768,390}-{zh,en}-{light,dark}-{engine,execution,service}.jpg` 全部 36 张，并读取 `rendered-matrix.json`。未读旧 depth 图作为本轮验收证据，未操作浏览器。

**观察结论：本矩阵内未发现 P0–P2 视觉阻碍；框架主线比旧 feature 导航更明确。** 这个判断基于实际关系表达，不以删除了多少算法控件作为通过条件：

- engine 图现在明确沿请求队列 → 批次调度 → 设备执行 → 结果与状态推进；桌面/平板的蛇形箭头和手机的纵向箭头均与编号 01–04 相符。反馈说明把 results 接回下一轮请求状态，下一节请求轨迹也从同一责任循环展开。
- execution 把 Attention/专家计算放在有标题和虚线边界的“模型层内：逐层重复”分组中，最终采样位于分组外。手机改为纵向后仍保留组边界，未把采样误包成每层操作。执行器位置/缓存地址与 CUDA Graph 的作用出现在进入此层后的 intro，不再依赖退回才能理解。
- service 图显示入口 → engine 与 engine ↔ cache，双向箭头在手机正确旋转为纵向双向关系。选中 engine 与 inspector 的接收/处理/输出对应，未观察到选中框与解释对象错位。
- 深色的选中面、浅色页面内的暗色结构画布以及两主题 inspector 文字均可辨认；selection 还带边框而非只靠色相。三层面包屑、返回控件、展开提示和编号可读，长英文在平板/手机自然换行，没有挤出卡片或隐藏关键动作。
- 中文标题和说明围绕请求、批次、输入、结果等具体对象展开。框架负责组织/状态、算法在组件里作为可选深入的关系可读。1440 header 的先修链接已改为基础生成和 KV 生命周期，没有把 DSpark 继续摆成阅读本章的先决条件。

Metadata 的 36 个条目都记录 `overflow:false`、`mathErrors:0`、preference 与 theme 一致；engine 的 selected=scheduler、execution 的 selected=sampling、service 的 selected=engine 与截图相符。这是主 agent 的 DOM 记录，本 reviewer 仅做读数和图片核对，没有独立重演事件。

**本矩阵当时尚未证明的范围**：手机截图主要展示 diagram 上半部，部分 inspector 自然位于视口下方；不能据此替代其近景可读性验收。相关近景与主 agent 的浏览器执行记录现已补充，见下一节。H1–H3 的源码关闭状态保持不变。

## 最终手机近景与实际路径证据

另用 `view_image` original detail 逐张打开：

- `detail-390-{zh,en}-{light,dark}-{engine,execution,service}.jpg`，12 张手机 inspector 近景；
- `schedule-390-zh-{light,dark}.jpg` 与 `partial-390-zh-{light,dark}.jpg`，4 张阶段回归。

本轮 hierarchy 独立目视总范围为 **52 张**（36 张矩阵 + 16 张补图），不借用旧 depth 版式的验收。

**最终观察结论：所审查源码和上述渲染范围内，没有剩余 P0–P2 开放项。** 手机 inspector 的接收/处理/交给下游和职责说明完整可读，选中设备执行/采样验证/引擎与标题、对象一致；中英文及明暗主题没有文字被面板截断或浅色残留导致看不清。采样说明明确使用主模型结果检验候选，将实际接受长度交回引擎；DeepInfer 本章不再额外讲解一个独立 DSpark 算法，而是在对应组件给出可选深入入口。该职责边界与 principles.md 一致。

H1 的截图证据直接成立：schedule 图为已处理输入 0/18、累计处理量 0，A 的说明是已入批但未计算；partial 图为 8/18、累计处理量 8，B 的说明是已计算部分保留、剩余输入完成前不输出。新的中文不再把调度阶段称为已增加历史，也不把整批与当前所选请求的状态混在一个主语下。

已读取 `browser-journeys.json` 的 18 组真实执行记录及中文 inspector 全文：跨两级返回选择 engine、返回父层选择 execution、键盘下钻/选择、原有 Spec Decode/DSpark 路径、A schedule/B partial、sample→commit、末帧/自动停、同步时间图、Home、三项 share 完整 reload 与普通 reload 默认值。记录与对应源码和截图相符。`console.json` 为 `[]`。这些交互和 console 由主 agent 实际执行，本 reviewer 没有操作浏览器或独立再跑。System 记录只有 prefersDark=true 的当前 OS 分支，不能声称两个 OS appearance 分支均覆盖。

最终源码再次运行 `node scripts/check-deepinfer.mjs` 通过。结论是本章现在能沿“框架组织请求 → 执行组件 → 结果回到下一轮”解释自己的问题，并把算法深入放在合适章节；它不等同于上游推理执行验证，也不代替 owner 对交付完成、构建和集成证据的最终记录。除了本 review，没有改动 UI、skill、上游或截图。

## 最后四张中文时间图

已实际打开 `timing-{1440,390}-zh-{light,dark}.jpg` 四张 original detail 截图，并读取 `timing-matrix.json`。本轮累计独立目视 **56 张**，source 与 final snapshot 不变；按本次要求没有扩大源码检查或重复模型运行。

中文的“减少 CPU 处理期间的 GPU 空等”“更新请求”“收齐最后结果”与前述职责术语一致。桌面公式清楚表达上一轮采样先于下一轮 Forward；同步 24、异步 18 使用相同 0–24 横轴。手机操作下拉框显示异步、更新请求 2、11–13，时间段编号和 CPU/设备两行没有被横向截断。所选 metadata 为 candidate / commit-1，与可见选择文字一致。未发现新的 P0–P2。

**新增 P3 可见性观察**：深色主题下 selected operation 的深色 outline 几乎融入背景，浅色截图的黑框则清楚。操作 dropdown 与桌面 inspector 仍能明确识别选择，因此不列为 P2；若做后续 polish，可为深色选中边框使用较亮描边。

**当时的准确范围**：手机两张截图止于异步 board 下部，legend、变量公式和 inspector 位于视口下方，本次四图本身不能作为“已目视手机时间图 legend/公式”的独立证据；随后新增尾部近景已补足，见下一节。

## 局部选中描边修复与手机尾部近景

仅复核此次 CSS 修复和 `timing-detail-390-zh-{light,dark}.jpg` 两张新增近景；未扩大源码检查或重跑测试。已实际打开两张 original detail 图片。累计独立目视范围为 **58 张**；另有 owner 的主预览，不计入本 reviewer 未打开的图片。

**时间图 selected outline 的 P3 已关闭。** `.di-operation.selected` 现在使用 `light-dark(#0f172a,#93c5fd)`；更新后的 metadata 为 Light `rgb(15,23,42)`、Dark `rgb(147,197,253)`。手机两张图中 commit-1（界面更新请求 2）均有清楚的独立描边，深色不再融入背景，且选中 inspector 的 11–13 与对应段一致。

手机尾部近景补足了明确 legend、采样先于下轮 Forward 的公式、所选操作说明、假设时长及单轮无重叠收益的边界文字。两主题的这些内容均完整可读，未观察到 P0–P2 阻碍；微小公式滚动提示不影响公式含义或阅读。此前“未目视手机 legend/公式”的范围限制现已解除。其他 source/布局/文案未变的部分沿用前述逐项结论，不声称在本次局部复核中重新执行了整套矩阵。
