# LLM-Infra-Explorer 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **Understand how large language models really work — from tokens to systems.**

An **interactive playground** for exploring **LLM systems, inference workflows, and AI infrastructure** through visualization and hands-on interaction.

🌐 Live Demo: https://skyliulu.github.io/LLM-Infra-Explorer/

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
- Token generation loop (prefill & decode stages)
- KV cache lifecycle and memory growth
- MoE (sparse) vs Dense architecture comparison
- RoPE positional encoding and temperature-controlled sampling

### 🔹 Parallelism Strategies (6D)
- Data Parallel (DP), Tensor Parallel (TP), Pipeline Parallel (PP)
- Context Parallel (CP) for long-sequence splitting
- Expert Parallel (EP) and Expert-Tensor Parallel (ETP) for MoE models

Compare tensor slicing patterns and GPU resource mapping across all 6 dimensions.

### 🔹 Attention & Memory
- Standard Attention vs Flash Attention
- SRAM/HBM IO traffic tracking and tiled computation with causal mask skipping
- Flash Decode: KV cache splitting across SM units and parallel two-step reduction

### 🔹 Memory Augmentation
- DeepSeek Engram: n-gram conditional memory retrieval augmenting Transformer layers
- Micro-level tensor flow and hardware-level async prefetch timeline

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

- 🖥️ **LLM Inference Visualization** — step-by-step prefill/decode animation, KV cache lifecycle, MoE vs Dense architecture toggle, and temperature-controlled sampling
- 🔀 **6D Parallel Strategy Explorer** — interactive DP / TP / PP / CP / EP / ETP topology with real-time tensor slicing and GPU resource mapping
- ⚡ **Flash Attention Walkthrough** — Standard vs Flash Attention comparison, SRAM/HBM IO traffic tracking, and block-by-block tiled computation with causal mask skipping
- 🚀 **Flash Decode** — KV Cache splitting across SM compute units, parallel two-step reduction, and memory-wall-breaking decode optimization
- 🧬 **Engram (DeepSeek)** — n-gram conditional memory retrieval augmenting Transformer layers, with tensor flow visualization and hardware-level async prefetch timeline

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
