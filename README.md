# LLM-Infra-Explorer 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **Understand how large language models really work — from tokens to systems.**

An **interactive playground** for exploring **LLM systems, inference workflows, and AI infrastructure** through visualization and hands-on interaction.

🌐 Live Demo: https://skyliulu.github.io/AI-Infra-Viz/

---

## ✨ Why this project?

Modern LLM systems are **complex, opaque, and hard to reason about**:

- What actually happens during inference?
- How does KV cache evolve over time?
- What do DP / TP / PP really change in execution?
- Why are optimizations like Flash Attention so effective?

This project helps you **see and interact with these processes**, instead of just reading about them.

---

## 🧠 What you can explore

### 🔹 LLM Inference
- Token generation loop (prefill & decode)
- KV cache lifecycle and memory growth
- End-to-end inference workflow

### 🔹 Parallelism Strategies
- Data Parallel (DP)
- Tensor Parallel (TP)
- Pipeline Parallel (PP)
- Expert Parallel (EP)

Compare how workloads are split and executed across GPUs.

### 🔹 Attention & Memory
- Flash Attention (SRAM vs HBM movement)
- Tiled computation and dataflow
- Memory efficiency trade-offs

### 🔹 System-Level Insights
- Latency vs throughput trade-offs
- Compute vs memory bottlenecks
- Infrastructure-aware design patterns

---

## 🗂️ Modules

| Module | Description |
|---|---|
| LLM Inference | End-to-end LLM inference with prefill/decode and KV-cache flow |
| Parallel Strategies | Interactive GPU parallelism explorer: DP / TP / PP / CP / EP / ETP |
| Flash Attention | Tiled SRAM/HBM data-movement simulation for Flash Attention |
| Flash Decode | Efficient attention decoding optimization walkthrough |
| Engram | DeepSeek Engram memory retrieval and tensor pipeline interaction |

---

## 🎯 Key Features

- 🎮 **Interactive** — not just diagrams, but explorable systems
- 🧩 **Modular** — learn concepts independently or end-to-end
- ⚙️ **System-focused** — beyond models, into real-world infra
- 🔍 **Under-the-hood** — visualize what usually stays hidden

---

## 🖼️ Preview

> *(Add screenshots / GIFs here)*

---

## 🚀 Getting Started

```bash
git clone https://github.com/skyliulu/LLM-Infra-Explorer.git
cd LLM-Infra-Explorer
npm install
npm run dev
```

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).
Commercial use is subject to the terms of this license. Any network-deployed modifications must also be open-sourced.
