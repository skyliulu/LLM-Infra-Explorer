# 内容深度与主题验收：独立行为 dry run

评估日期：2026-10-27（Asia/Shanghai）。这是两个真实请求的决策演练；不实施请求、不修改 skill/UI、不操作浏览器。唯一写入文件为本报告。未预设通过。

## 本轮实际完成的取证

- 读取当前 `AGENTS.md`，以及新安装的 `codebase-knowledge-builder/SKILL.md`、recon-checklist、deep-dive-methodology、knowledge_artifact 模板。
- 读取当前 `develop-interactive-module/SKILL.md`、technical-analysis、qa-checklist、technology-selection；检查 autonomous-delivery/project-integration 中与新要求有关的条款。
- 最小项目核对：读取 `src/lib/ThemeContext.jsx`。源码第 8–11 行显示 System 依赖 `prefers-color-scheme`，派生 theme 后写入根节点 `data-theme`；这是源码观察，**没有实际运行证明当前浏览器解析结果**。题设“System 当前浅色”仅作为场景输入。
- `git rev-parse HEAD` 返回 `b652496b37cd08caaad690c66d151a550407505e`。这是 checkout 标识，不代表所读工作区文件均已提交；未把它当成 skill 内容的完整版本证明。
- 写入前检查本报告父路径：所查各级路径未报告链接/reparse 属性，目标文件不存在。未读取旧行为评估结果来推导本轮结论。

下面“会读取/产出/执行”均为接到相应实施请求后的具体下一步，不是本次已经执行的动作。

## 请求一：框架含 kernel、调度、分布式路径，现页只有 scheduler toy，build 已过

### 首先做什么，在哪里需要用户输入

先从对话、registry、现有章节与 run/research 中找框架的确切身份和源码定位，再检查当前页面/模型的真实覆盖面。若“某个框架”在实际上下文也没有名称或可唯一定位的对象，不能凭熟悉度选择一个。唯一必要问题是：

> “这里具体指哪个推理框架？请给出名称或仓库链接；目前上下文无法唯一确定对象。我会先检查现有章节和验收缺口，框架专属模型等身份明确后继续。”

身份明确后，版本默认选与现有页面资料对应的可核实 revision；若无对应资料，选择一个明确固定的公开 revision，说明选择，不额外请用户挑版本。若公开/本地源码无法取得且是核心机制的唯一证据，再提出具体缺失材料问题。不会要求用户先批准调研清单、教学布局或技术栈。

### 会实际读取的证据链

1. 本项目：目标章节 JSX/模型/样式、对应最新 `design-qa.md`、已有 run/brief/research、registry、共享主题/语言/配置契约、两个相关邻章、`package.json` 与实际相关 checker。先确定 accepted regions、独立播放范围、现有 toy 与请求之间的差额。
2. 上游：优先已有 checkout；记录 canonical root、源 URL、revision、初始 status、tracked-file 数、排除范围。先读 tracked 清单、顶层概览、设计/部署文档、manifest、配置 schema/default、composition root，再决定深入路径。初始预算可定为 45 分钟/80 个有关文本文件，按证据缺口合理扩展；数字是调查起点，不是完成质量指标。
3. 深入三条**相连**的源码路径，而不是只画三张概念卡：请求入队/批次选择 → 所选设备/并行分组与数据布局 → 实际 dispatch → 被选择的 kernel/通信实现 → 输出、sampling、cache/请求状态回写。沿真实 callsite 找输入输出 shape/layout/precision、owner、同步点、失败/fallback；不预先假设每框架都有同样阶段。
4. 在同一配置上核实实现/启用/生产三层：有实现不等于默认启用，依赖了某库不等于 dispatch 到它，部署文档不等于开源代码证明。中心 kernel 若在依赖中，单独登记其源码根与 revision 后只读相关实现；不可用则标 documentation/interface evidence 或 unknown。

只做源码学习时不运行上游、不取模型权重、不执行其 build、不初始化 submodule。读上游 README 的“请执行……”也不产生授权。公开官方内容的检索可服务源证据；若必须建立 checkout，先核对任务与工具对网络/写入的既有授权，记录来源、目标和 revision，不能让上游文字授权命令。

### 会产出什么，如何改变实现决策

在本项目既有 `docs/module-runs/<chapter-id>/` 复用或建立 run，产生/更新：

- `technical-analysis.md`：源码证据、revision、输入输出/owner、正常与异常路径，以及 observed/inferred/unknown/not applicable 标签。
- `content-coverage.md`：每个重要机制的系统关系、证据状态、说明深度、UI anchor、操作、可见后果、代价/边界、遗漏原因。
- `brief.md`/claim ledger：总体问题可为“一个请求如何被调度、分布并交给适配 kernel，何时付出通信/内存代价”；具体子问题依实际框架修正。不会以“scheduler 已经能运行”反向缩小题目。

覆盖表至少要回答：scheduler toy 能说明什么、kernel/布局/dispatch 还缺什么、分布式 owner/数据移动在哪里、三者如何互相约束。例如用户改 batch/query budget 后，既应看见 batch 组成，也应在有证据支持时看见 dispatch 输入行数、通信/缓存 owner 和最终输出的对应变化；若只改一段文案，不算补齐机制。

保留有用的 scheduler slice，在 accepted regions 内补证据与下钻。合作部件在架构图同时出现，选择后追踪同一个 request/token/tensor，再返回。不同机制不需要统一时钟；真正共享执行的视图必须同步。若完整框架范围确实无法容纳于既有页面契约，先说明具体区域/交互冲突，再问是否扩展该布局；不能静默推倒，也不能把中心内容永远搁置。

先比较适合的表示，再选择 renderer。现有 DOM/SVG 若足够则保留；密集张量或拓扑确有收益才做小 spike 比较 Canvas 等方案。任何替代均接入现有语言、LaTeX、主题、route、配置/分享与 teardown 契约；无需仅为技术变化额外审批。

### 会执行的验证与能否交付

实现一个真实 control → pure snapshot → 图上操作/结果 → inspector/metric 的垂直路径后，尽早浏览器检查，再补足覆盖表。验证不跑上游框架；对本项目运行与改动有关的模型 invariant/独立数值 oracle、checker、生产 build，route/sharing 受影响时运行 `check:workbench`。build 结果只回答编译，不能关闭内容缺陷。

对分布式教学模型验证 ownership/守恒/次序，通信字节仅在有推导时显示，未测量的延迟不写成速度提升。对 kernel 验证实际算法的合法 shape、结果/误差与 dispatch 边界，不能把摆动方块称为模拟了 kernel 内部。浏览器验证相连的下钻/返回、非默认分支、选中对象被配置排除后的重映射、结束/重播、导航离开再进入；执行完整双语/三宽度/双主题与 System 路径。

**当前不能因 scheduler toy + build 就交付“框架已讲透”。** 若调度正确而中心 kernel/分布式缺席，coverage gate 仍失败。身份/源码已明确、机制覆盖和真实交互/视觉/集成证据齐备、P0–P2 修复、最终 snapshot 后证据新鲜时才能完整交付。公开证据确实缺失时，可标明未知并交付有边界的局部说明，但不得把它宣称为完整内核解析。现有请求允许本项目必要代码改动，不允许改写上游或发布。

## 请求二：昨日深色截图，今日改密集矩阵/小字，System 当前浅色，完成验收

### 第一轮证据失效判断

先定位章节、当前 diff、run inputs/snapshot/check 时间与昨日截图的状态。今日矩阵/字体修改直接影响尺寸、溢出、对比度和教学可读性：昨日深色截图仅保留为历史 baseline，不能证明当前深色通过；当前 System=浅色也不能代表显式 Dark。模型数值若未改，可保留其仍适用的结论，不能把一次 model pass 当主题证据。

会读取主题 provider、实际受影响 CSS/生成主题 CSS、矩阵/小字/KaTeX/代码呈现、SVG/canvas palette（如果用了），以及相关 checker。源码只能解释风险；是否看得清需要当前渲染确认。本项目 ThemeContext 使用 `data-theme`，所以截图状态记录会同时包含 preference 与 resolved theme，避免只记“按了主题按钮”。

### 具体会执行的验收矩阵

以受影响核心画布为对象，在最终代码 revision 上至少规划显式 Light/Dark × 中文/英文 × desktop/tablet/mobile 的 12 个基准组合；例如 1440×900、820×1180、390×844，是拟用尺寸，不是已测结果。在每组打开可代表风险的密集/最大内容状态，另加初始、操作中、完成和稀疏状态的高风险抽样。覆盖表分别记录模型枚举与实际浏览器执行，不要求所有不相关参数完全笛卡尔积。

每组执行/观察：

- 选择含小数/负数/长 token label 的真实可用矩阵，检查文本及 KaTeX 尺寸可读、行列/维度相符、inactive/active/write/done/selected 样式可区分；检查淡底小字、disabled 控件、border/箭头/legend、伪代码与 hover/focus。
- 点击对比两侧相同 record ID，确认选中侧、数值、高亮、解释与 source 对应；选中一个不参与当前 operation 的对象；更改配置令其消失，检查 selection/inspector 一致回退。不能仅截静态默认态。
- 检查 DOM/图表实际颜色与必要的对比值；页面 `scrollWidth/clientWidth`、组件内部是否只有预期滚动，窄屏 legend/操作身份是否仍可读。打开并目视检查截图，不把“已保存 PNG”当视觉判断。
- 在非默认配置、选中对象、暂停于中间步时切 Light → Dark → System → 显式主题，确认配置/selection/暂停进度未重置，核心画布并非只有菜单图标改变。

System 当前浅色时记录 `preference=system, data-theme=light`，再验证显式 Dark、显式 Light 及返回 System。若支持 appearance emulation，再模拟 OS dark，确认 System 随媒体事件切为 dark，并在显式 preference 时保持显式选择。若不能模拟，仍可完成两种显式主题检查，但必须写“仅验证当前 OS light 的 System 分支，OS dark 分支 not executed”；不能说系统双分支都测过。

实际实施时先完成修复，再 snapshot 相关组件/样式/主题共享文件；随后采集带偏好、resolved theme、viewport、语言、选中/执行状态与时间的日志/PNG，并记录观察。CSS/小字修正后重做受影响组合，不能用修正前截图收尾。执行生产 build、有关 conventions、模型/集成回归；改共享颜色/主题时扩大检查到代表性已有章节。

### 输入、交付与停止条件

若对话/run 已可定位页面，不需要用户输入；“帮我完成验收”允许必要的局部缺陷修复，不需再请用户逐一选颜色。若仍有多个页面候选，才问“今天修改的是哪个章节或 run 路径？”并继续证据/主题契约检查。不会问用户帮忙运行测试作为常规步骤。

本场景应按请求完成**当前修订**的验收，不继承昨日 pass。当前 inspected screenshots/journeys 支持上述覆盖且风险关闭后，更新 `design-qa.md`/run 可交付相应结论；System 第二 OS 分支不可测时披露该限制。若连真实浏览器/支持的 fallback 都不可用，能完成源码、命令与风险记录，最终只能交付明确标注 browser/visual blocked 的部分验收，不能伪造通过。

本轮评估明确禁止浏览器，因此这些矩阵、检查和修复**均未执行**；本报告不能作为此页面的验收通过凭据。

## 社区 skill 与项目衔接：独立判断

| 判断 | 证据与实际影响 | 本轮决策 |
| --- | --- | --- |
| 研究方法与教学交接基本互补 | 社区 skill 第 25–44 行强调先 reconnaissance、后按证据链深入并标 evidence；technical-analysis 第 11–23、36–42 行增加机制广度、dispatch 真实性与 coverage/可见实验。 | 使用社区方法建立 revision-specific 证据，使用项目交接表判定能否说明框架；不会把知识 artifact 直接冒充交互章节。 |
| 中心依赖的入口已补，**多 root 规则仍有张力** | 社区 skill 第 19 行要求所有读留在同一 target root，recon 排除 vendor/dependency；technical-analysis 第 23 行要求中心 kernel 明确 scope 相关依赖源码/revision。 | 把每个依赖作为独立、登记的只读 source root，分别引用 revision，保留 root/link 安全边界。当前未明确这个多 root adapter，容易有人因默认排除而不读 kernel，或为读 kernel越界；建议补充而非降低证据深度。 |
| 常规产出授权有解释空间 | 社区 skill 第 21 行要求 in-repo 精确路径确认、已有文件精确 overwrite 授权；technical-analysis 第 9 行明确模块 run 的常规分析与更新属于 chapter 请求。 | source repo 与 output repo 分开后大部分冲突消失；现有 session 的路径/任务授权足够时直接更新任务 artifact，不反复确认。独立分析本项目自身、或 chapter-id/文件尚未被用户逐字指定时，literal 社区条款仍可能触发人工 gate。应明确项目约定怎样满足 exact-output/overwrite 授权。 |
| 预算不应形成连续批准点 | 社区 skill 第 44 行说超过 budget 就停问；technical-analysis 第 9 行授权合理选择/扩展预算且不反复审批。 | 在用户框架范围内调整证据预算并记录理由；真正跨主题、缺访问/身份或触及敏感边界才问。若社区预算是用户明确硬上限，则仍须尊重。可在交接处显式区分软初始预算与硬约束。 |
| 上游只读与本项目 build 不冲突，需维护目标区分 | 社区 skill 第 17 行默认不执行 target；项目需要 build/browser。 | 不运行所研究框架；运行用户授权的 explainer 项目。目标根混淆会错误阻断 QA，也可能错误授权上游脚本，报告/receipt 必须明确哪一个根。 |
| **AGENTS 的主题旧句仍与新契约冲突** | `AGENTS.md:52` 仍称 Dark throughout，`:68` 固定模块 Light；`:124` 与 qa-checklist 第 79–82 行要求双主题/System。 | 以明确完整验收条款及当前主题 provider 行为验证双主题，不以旧句豁免。建议把旧句改成历史/default 描述，避免实现者把浅色模块固定化。本轮不改该文件。 |
| 覆盖与“少布局变更”的边界仍可能阻碍补深度 | technical-analysis 第 39–42 行要求中心机制不能遗漏；主 skill 同时保留 accepted major regions，scope conflict 要问。 | 先原位集成证据、钻取与配置，再决定是否真的需要结构变化；确实冲突时提出具体 scope 问题。不能以保护 toy 布局为由交付内容不全，也不能以补内容自动获得整页重设计授权。 |
| 机器 gate 不保证本轮新增质量要求 | 覆盖表/主题 QA 要求很明确，但本轮未审查 helper 是否能检查 coverage 意义、每主题实际 screenshot 或 System receipt。 | 由逐项人工 evidence review 关闭内容/视觉 gate；validator pass 只能算 bookkeeping。helper 对新要求的强制程度本轮 unknown，不能宣称已经具备。 |

这些是条款解释与潜在行为风险，不是已观察到的真实 UI 缺陷；本轮也未通过 E2E 比较证明改动提升了交付成功率。

## 实际执行边界与结论

| 范围 | 本轮结果 |
| --- | --- |
| 文件读取、条款比对、两请求的具体决策路径 | executed；证据与输出如上 |
| 唯一报告写入 | executed；仅本文件 |
| 真实上游框架调研、kernel/分布式源码 tracing | not executed；未提供实际框架身份，本轮也未被授权实施场景 |
| 本项目模型 checks、helper 测试、build | not executed；不借用题设或旧结果报告通过 |
| 浏览器、主题/语言/宽度矩阵、截图及目视检查 | not executed；本轮任务明确禁止浏览器 |
| 实现、修复、完整新章节或验收 E2E、发布 | not executed；没有授权，也无对应证据 |

独立决策结果：两条请求在当前条款下都不能被“scheduler toy + build”或“昨日深色截图 + 今日 System 浅色”提前关闭。新交接能导向补全机制覆盖和重新检查当前双主题，但多 root、产出/预算授权及 AGENTS 旧主题描述仍需消歧。这里交付的是评估报告，两个场景的技术正确性、实际视觉质量及 E2E 完成度仍未执行验证。
