[![LLM Infra Explorer — From a single token to the whole system](./media/readme-hero.svg)](https://skyliulu.github.io/LLM-Infra-Explorer/)

**[Open the Workbench ↗](https://skyliulu.github.io/LLM-Infra-Explorer/)** · [English](./README.md) · [简体中文](./README.zh-CN.md)

React · Vite · Interactive matrices · Step-by-step execution · AGPL-3.0

**让大模型基础设施看得见。** 追踪执行，检查张量与显存，理解各个组件如何组成完整系统。

| 看整体系统 | 打开显微镜 | 跟随执行 |
| :--- | :--- | :--- |
| 对比架构、显存所有权与资源开销。 | 点击组件和矩阵记录，检查输入、输出与来源。 | 用播放、暂停与单步，按自己的节奏理解执行顺序。 |

## 带着问题选择章节

| 方向 | 工作台 | 可以探索什么 |
| :--- | :--- | :--- |
| 推理 | [**LLM Inference ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#llm) | Prefill/Decode、逐层 KV、Dense/MoE、温度与采样。 |
| 分布式 | [**Parallel Strategy ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#parallel) | DP/TP/PP/CP/EP/ETP、张量切片、GPU Rank 与运行时拓扑。 |
| Attention | [**Flash Attention ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#flash) | Standard 与 V1–V4、分块、SRAM/HBM 与 IO。 |
| Attention | [**Sparse Attention ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#sparseattn) | DSA、CSA、HCA、局部窗口、记录来源和单次 Query 执行。 |
| Attention | [**Flash Decode ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#flashdecode) | Split-K、分页 KV、Head 共享与并行归约。 |
| 生成 | [**Speculative Decoding ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#speculative) | Draft–Target 验证、拒绝修正、EAGLE-2 与 DSpark。 |
| 低精度 | [**Quantization ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#quantization) | BF16、INT4/INT8、FP8/FP4、离线算法与引擎执行。 |
| 存储 | [**Engram ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#engram) | N-gram 检索、上下文门控和数据移动。 |
| 存储 | [**Radix Cache ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#radixcache) | 前缀共享、引用锁、驱逐和 KV 分配。 |
| 分布式 | [**DP Attention ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#dpattention) | KV 所有权，以及连接 FFN/MoE 的通信路径。 |
| Attention | [**Linear Attention ↗**](https://skyliulu.github.io/LLM-Infra-Explorer/#linearattn) | Softmax、核函数、递归状态与 GLA 门控。 |

## 工作台预览

以下为当前**英文完整工作台的动态导览**：从总览开始，展示组件之间的联动，再进入细节。点击动画可打开对应章节；每组还提供高清原始视频与工作台全景图。

### 01 / Inference — tokens, cache and the execution pipeline

先看 Token 序列、逐层 KV Cache、张量流水线与引擎代码的整体关系，再重放 Prefill，进入 Attention 和 MoE，最后返回更新后的总览。

[![LLM Inference full workbench: tokens, layer KV, tensor pipeline and engine code](./media/previews/llm-inference.gif)](https://skyliulu.github.io/LLM-Infra-Explorer/#llm)

[Open chapter ↗](https://skyliulu.github.io/LLM-Infra-Explorer/#llm) · [HD video](./media/previews/llm-inference.mp4) · [Full workbench overview](./media/previews/llm-inference.png)

### 02 / Parallel strategies — from tensor shards to GPU topology

组合不同并行维度，同时观察张量所有权、层划分与物理 GPU 映射的变化。

[![Parallel Strategy full workbench: controls, logical tensor layout and physical GPUs](./media/previews/parallel-strategies.gif)](https://skyliulu.github.io/LLM-Infra-Explorer/#parallel)

[Open chapter ↗](https://skyliulu.github.io/LLM-Infra-Explorer/#parallel) · [HD video](./media/previews/parallel-strategies.mp4) · [Full workbench overview](./media/previews/parallel-strategies.png)

### 03 / Sparse Attention — tradeoffs, architecture and query execution

先看显存与读取量的对比，再沿整体架构执行一次 Query，最后保留系统视图下钻具体组件。

[![Sparse Attention full workbench: resource comparison, connected architecture and query execution](./media/previews/sparse-attention.gif)](https://skyliulu.github.io/LLM-Infra-Explorer/#sparseattn)

[Open chapter ↗](https://skyliulu.github.io/LLM-Infra-Explorer/#sparseattn) · [HD video](./media/previews/sparse-attention.mp4) · [Full workbench overview](./media/previews/sparse-attention.png)

### 04 / Quantization — precision, storage and runtime

从精度控制、存储与重建，继续查看离线准备和推理引擎的完整工作台。

[![Quantization full workbench: precision controls, storage, offline preparation and inference](./media/previews/quantization.gif)](https://skyliulu.github.io/LLM-Infra-Explorer/#quantization)

[Open chapter ↗](https://skyliulu.github.io/LLM-Infra-Explorer/#quantization) · [HD video](./media/previews/quantization.mp4) · [Full workbench overview](./media/previews/quantization.png)

### 05 / Engram — architecture, retrieval and system dataflow

同屏查看网络拓扑、N-gram 检索和引擎代码，再追踪投影、门控、残差融合与系统数据移动。

[![Engram full workbench: network topology, retrieval, gating, code and system timeline](./media/previews/engram.gif)](https://skyliulu.github.io/LLM-Infra-Explorer/#engram)

[Open chapter ↗](https://skyliulu.github.io/LLM-Infra-Explorer/#engram) · [HD video](./media/previews/engram.mp4) · [Full workbench overview](./media/previews/engram.png)

### 建议的探索方式

**对比方案 → 改一个参数 → 检查一条记录 → 单步跟踪结果。**

同一系统里的协作部件放在整体架构中，真实的替代方案使用切换。对有执行顺序的内容提供动态演示；Sparse Attention 默认**每步 2 秒**，可调速、暂停或单步。所有模块支持中英文。

> **如何理解数字：** 资源估算采用模块内注明的假设和来源。存储字节、传输字节、可容纳历史和实测延迟不是同一指标；动画节奏不代表 GPU 实际耗时。

## 本地运行

需要 Node.js 和 npm。

```bash
git clone https://github.com/skyliulu/LLM-Infra-Explorer.git
cd LLM-Infra-Explorer
npm install
npm run dev
```

打开 Vite 输出的本地地址。构建并预览生产版本：

```bash
npm run build
npm run preview
```

**技术栈：** React 18、Vite、Tailwind CSS、Framer Motion、KaTeX。应用为静态 SPA，部署在 GitHub Pages。

## 后续方向

- **Serving：** 连续批处理、请求调度与多级 KV 存储。
- **分布式执行：** Expert 负载均衡、互联与集合通信。
- **实测性能：** 硬件配置、TTFT/TPOT 与端到端权衡。

以上是候选方向，不代表固定交付计划。欢迎[建议主题或反馈问题](https://github.com/skyliulu/LLM-Infra-Explorer/issues)，尤其欢迎附带来源、模块和复现参数的技术纠错。

### 如何维护预览素材

`scripts/capture-readme-motion.cjs` 通过真实页面控件录制动画，同时把总览画面保存为高清 PNG。环境中已有 Playwright、Chromium 和 FFmpeg 时，启动应用后执行：

```bash
node scripts/capture-readme-motion.cjs
```

通过 `PREVIEW_URL` 指定其他本地服务地址。采集状态与运行时错误记录在 `media/previews/motion-capture.json`。GIF 最大宽度为 1600 像素，视频和静态图保留原始采集分辨率。



本地需要查看图片与 GIF 的完整渲染时，在环境中已有 `marked` 的情况下运行 `node scripts/preview-readme.cjs`，打开终端输出的浏览器地址。该预览使用 GFM 解析，GitHub 自身的外围样式由 GitHub 控制。

## 许可证

[GNU Affero General Public License v3.0](./LICENSE)。商业使用和网络部署须遵守该许可证条款。
