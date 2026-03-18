# LLM-Infra-Explorer 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **从 Token 到系统，真正理解大语言模型的运作方式。**

一个面向 **LLM 系统、推理工作流与 AI 基础设施**的**交互式探索项目**，通过可视化与动手实践帮助你建立深层理解。

🌐 在线体验：https://skyliulu.github.io/LLM-Infra-Explorer/

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
- Token 生成循环（Prefill & Decode 阶段）
- KV Cache 生命周期与内存增长
- MoE（稀疏）与 Dense 架构对比
- RoPE 位置编码与温度采样控制

### 🔹 并行策略（6D）
- 数据并行（DP）、张量并行（TP）、流水线并行（PP）
- 上下文并行（CP）：超长序列切分
- 专家并行（EP）与专家张量并行（ETP）：MoE 模型专属

实时对比六大并行维度的张量切分方式与 GPU 资源映射。

### 🔹 注意力机制与内存
- 标准 Attention 与 Flash Attention 对比
- SRAM/HBM IO 流量追踪与带因果掩码的分块计算
- Flash Decode：KV Cache 跨 SM 单元切分与两步归约

### 🔹 记忆增强机制
- DeepSeek Engram：N-gram 条件记忆检索增强 Transformer 层
- 微观张量流图与硬件级异步预取时间轴

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

- 🖥️ **LLM 推理可视化** — 逐步动画展示 Prefill/Decode 阶段、KV Cache 生命周期，支持 MoE 与 Dense 架构切换及温度采样控制
- 🔀 **6D 并行策略探索器** — 交互式 DP / TP / PP / CP / EP / ETP 拓扑，实时查看张量切分方式与 GPU 资源映射
- ⚡ **Flash Attention 深度讲解** — 标准 Attention 与 Flash Attention 对比，SRAM/HBM IO 流量追踪，以及带因果掩码跳过机制的分块计算可视化
- 🚀 **Flash Decode** — KV Cache 跨 SM 计算单元切分、并行两步归约，直观展示突破显存墙的解码优化路径
- 🧬 **Engram（DeepSeek）** — N-gram 条件记忆检索增强 Transformer 层，附微观张量流图与硬件级异步预取时间轴

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
