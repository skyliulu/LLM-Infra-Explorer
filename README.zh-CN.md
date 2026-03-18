# LLM-Infra-Explorer 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **从 Token 到系统，真正理解大语言模型的运作方式。**

一个面向 **LLM 系统、推理工作流与 AI 基础设施**的**交互式探索项目**，通过可视化与动手实践帮助你建立深层理解。

🌐 在线体验：https://skyliulu.github.io/AI-Infra-Viz/

---

## ✨ 为什么做这个项目？

现代 LLM 系统**复杂、不透明，难以直观理解**：

- 推理过程中到底发生了什么？
- KV Cache 是如何随时间演化的？
- DP / TP / PP 对执行流程有什么影响？
- 为什么 Flash Attention 这类优化如此有效？

本项目帮助你**看见并亲手探索这些过程**，而不仅仅是阅读文字描述。

---

## 🧠 可以探索哪些内容

### 🔹 LLM 推理
- Token 生成循环（Prefill & Decode）
- KV Cache 生命周期与内存增长
- 端到端推理工作流

### 🔹 并行策略
- 数据并行（DP）
- 张量并行（TP）
- 流水线并行（PP）
- 专家并行（EP）

直观对比各策略如何拆分和调度跨 GPU 负载。

### 🔹 注意力机制与内存
- Flash Attention（SRAM 与 HBM 数据搬运）
- 分块计算与数据流
- 内存效率权衡

### 🔹 系统级洞察
- 时延与吞吐量权衡
- 计算瓶颈与内存瓶颈
- 面向基础设施的设计模式

---

## 🗂️ 模块

| 模块 | 描述 |
|---|---|
| LLM Inference | 端到端推理流程，覆盖 Prefill/Decode 与 KV Cache 数据流 |
| Parallel Strategies | 交互式 GPU 并行策略探索：DP / TP / PP / CP / EP / ETP |
| Flash Attention | Flash Attention 的 SRAM/HBM 分块数据搬运模拟 |
| Flash Decode | 高效注意力解码优化流程可视化与交互讲解 |
| Engram | DeepSeek Engram 记忆检索与张量流水交互展示 |

---

## 🎯 核心特点

- 🎮 **可交互** — 不只是图表，而是可探索的系统
- 🧩 **模块化** — 可独立学习各概念，也可端到端串联
- ⚙️ **系统视角** — 超越模型本身，深入真实基础设施
- 🔍 **内部可见** — 可视化通常隐藏在底层的运行细节

---

## 🖼️ 项目预览

> *（在此添加截图 / GIF）*

---

## 🚀 快速开始

```bash
git clone https://github.com/skyliulu/LLM-Infra-Explorer.git
cd LLM-Infra-Explorer
npm install
npm run dev
```

---

## 📄 开源协议

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE) 协议开源。
商业使用须遵守本协议条款。任何以网络服务形式部署的修改版本，须同样开源。
