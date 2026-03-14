# AI-Infra-Viz 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **一个面向大模型基础设施的交互式探索器——不仅可视化，更强调可交互理解。**

`AI-Infra-Viz` 是一个面向 LLM 时代的**交互式基础设施学习项目**。
它通过可探索模块、引导式流程与交互式可视化，帮助你在“高层概念”与“底层系统行为”之间建立直觉。

### 🌟 亮点
- **交互式基础设施学习**：通过交互理解模型服务链路、内存访问路径与系统级权衡。
- **LLM 端到端推理**：覆盖 Prefill/Decode、KV Cache 演进与 Token 生成循环。
- **并行策略**：以交互方式比较 DP / TP / PP / CP / EP / ETP 的拓扑与负载拆分。
- **Flash Attention 深入解析**：通过步骤化交互理解分块与 SRAM/HBM 数据搬运。
- **Flash Decode**：观察低时延解码优化路径，理解实时生成性能提升。
- **DeepSeek Engram**：分析存储中心检索路径与张量级数据流。

### 🗂️ 模块

| 模块 | 描述 |
|---|---|
| LLM Inference | 端到端推理流程，覆盖 Prefill/Decode 与 KV Cache 数据流 |
| Parallel Strategies | 交互式 GPU 并行策略探索：DP / TP / PP / CP / EP / ETP |
| Flash Attention | Flash Attention 的 SRAM/HBM 分块数据搬运模拟 |
| Flash Decode | 高效注意力解码优化流程可视化与交互讲解 |
| Engram | DeepSeek Engram 记忆检索与张量流水交互展示 |

### 🔗 在线体验
访问 [GitHub Pages](https://skyliulu.github.io/AI-Infra-Viz/) 在线演示。
