# AI-Infra-Viz 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **An interactive explorer for large-model infrastructure — not just visualization, but hands-on understanding.**

`AI-Infra-Viz` is an **interactive infrastructure learning playground** for the LLM era.
It bridges the cognitive gap between high-level concepts and low-level systems behavior through explorable modules, guided flows, and visual interaction.

### 🌟 Highlights
- **Interactive Infrastructure Learning**: Learn by interacting with model-serving pipelines, memory movement, and system-level trade-offs.
- **LLM End-to-End Inference**: Explore prefill/decode, KV cache evolution, and token generation loops.
- **Parallel Strategies**: Compare DP / TP / PP / CP / EP / ETP via interactive topology and workload decomposition.
- **Flash Attention Deep Dive**: Understand tiling and SRAM/HBM movement with step-by-step interaction.
- **Flash Decode**: Inspect low-latency decode optimization paths for real-time generation.
- **DeepSeek Engram**: Analyze memory-centric retrieval paths and tensor-level dataflow.

### 🗂️ Modules

| Module | Description |
|---|---|
| LLM Inference | End-to-end LLM inference with prefill/decode and KV-cache flow |
| Parallel Strategies | Interactive GPU parallelism explorer: DP / TP / PP / CP / EP / ETP |
| Flash Attention | Tiled SRAM/HBM data-movement simulation for Flash Attention |
| Flash Decode | Efficient attention decoding optimization walkthrough |
| Engram | DeepSeek Engram memory retrieval and tensor pipeline interaction |

### 🔗 Live Demo
Visit the [GitHub Pages](https://skyliulu.github.io/AI-Infra-Viz/) live demo.

### 📄 License
This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).
Commercial use is subject to the terms of this license. Any network-deployed modifications must also be open-sourced.
