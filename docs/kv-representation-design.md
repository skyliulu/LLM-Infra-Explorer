# LLM Inference：KV 表示基础扩展

日期：2026-09-11。范围为规划第 1 项；第 2–4 项尚未开始。

## 变更契约

扩展现有序列/KV 卡片：底部增加可展开的 KV 表示显微镜。原顶栏、Dense/MoE、采样控件、推理时间轴、张量流水线、伪代码及其相对顺序保留。默认收起，按需在同一缓存区域放大。语言沿用父模块；结构实验的参数不控制主时间轴，界面有明确范围标签。

能力：multiple-modes、resource-metrics、structural-comparison、dense-layout、math。结构探索使用点选，不添加人为的播放阶段。

## 教学问题与证据

一个历史 token 在单层中保存什么？哪些 query heads 引用它？同样长度下占用如何变化？

| 主张 | 依据 | 模型约束与视觉证据 |
|---|---|---|
| MHA 每头独立 K/V；GQA 组内共享 | [GQA 论文](https://arxiv.org/abs/2305.13245) | 固定 8 个 query heads；组数整除 8；点击 head，高亮引用列。GQA 组数 1/8 对应 MQA/MHA 端点 |
| MLA 保存联合 latent 与解耦 RoPE key | [DeepSeek-V2 §2.1.2–2.1.3](https://arxiv.org/html/2405.04434v5#S2.SS1) | 全部头引用一条联合记录；放大时分别显示 latent 与额外位置 key，后者恒为 64 bytes |
| 内容 K/V 的上投影可以吸收 | 同上 | 展开的公式和概念伪代码显示 absorbed query；不画出每头完整 KV 常驻缓存 |
| 三种表示仍保留逐 token 历史 | 两篇论文中的缓存表示 | 1–16 token 滑块增减地址行，容量同步线性增长；选中某行仅用于检查，不表示 sparse Top-K |
| 容量与组数/维度有关，MLA 非总是最小 | 单层公式逐字段求和 | BF16 统一精度；default MHA/GQA/MLA 为 2048/512/320 bytes/token；MLA latent=256 大于 GQA=1 的容量 |

本例使用教学维度，非真实 checkpoint 配置。容量仅计逻辑 KV 数据，排除权重、临时张量、allocator、TP 副本及量化 metadata。不推导速度、模型质量或 V4.1 压缩倍数。

## 控件与单一模型

- 独立输入：表示模式、历史长度、GQA 组数、MLA latent 维度；组数和 latent 即使不属于当前选中模式，也会更新右侧相应比较项。
- 选择状态：query head、历史 token；长度缩短时 token 选择夹紧到合法范围。
- 展示偏好：语言与 details 展开状态；切换语言不重置数据。
- 派生值：所有者映射、引用集合、字段尺寸、字节数、共享比例尺、公式和代码，均来自 `deriveKvRepresentationModel`。
- 默认值恢复仅作用于这个局部实验；主时间轴 reset 维持原有语义。

## QA 入口

- `npm run check:llm`：保留 96 个原有状态检查，新增 6,144 个表示组合与非法输入/端点检查。
- `src/components/llm-inference/kv-qa-matrix.json`：三种模式 × 两种语言 × 两种视口，共 12 个浏览器状态。
- 最终实际结果记录于仓库 `design-qa.md` 的 2026-09-11 KV 表示扩展条目。
