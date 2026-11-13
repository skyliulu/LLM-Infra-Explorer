# DeepInfer 重做：三条一手因果核查

日期：2026-10-28。只读核查；未读取既有 review 结论，未改运行代码或 Skill。DeepInfer 固定为 `553741557a57df44a46fb3ab72b6aafeaf945337`；本地 `git rev-parse HEAD` 已核对。该提交的 DeepGEMM gitlink 固定为 `1fc9c66975ee322d628b3288534ca0e9ce12a64d`，下文不把当前 main 的能力倒灌到该版本。

读者问题：**同样要在延迟约束内服务这些请求，DeepInfer 如何少做重复工作、让同一批设备完成更多有用工作？什么情况下收益会消失？**

## 1. 共享 KV、路由与 P/D 部署如何影响有效服务成本

### 官方支持的因果链

- **复用计算结果。** 持久 block KV 放在独立 3FS，所有 P 机器都能命中任意前缀；命中避免重复 prefill。SWA 状态另在主机内存，通过目录定位并跨机取回。不能把两类缓存都画成 SSD 上的一份 KV。[Q&A L129–177](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L129-L177)
- **解除命中位置与空闲算力的冲突。** 共享 block KV 让 P 的跨 DP 组路由按剩余 compute quota 拉取任务，无需为 prefix affinity 把请求送回持有缓存但繁忙的引擎；独立存储还能独立扩容，并使计算节点故障不直接丢失持久 KV。[Q&A L107–115、L139–141](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L107-L141)
- **减少慢 rank 拖累。** P 按上下文分桶并按预计耗时分配 quota，单 GPU 按时间预算求 chunk 大小；D 同时平衡请求数（每步 batch）与总 KV 长度（attention 成本）。只数“排队请求数”不能重现这两个负载维度。[Q&A L109–127](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L109-L127)
- **按阶段负载配置资源。** P/D 分离让 TTFT 与 TBT 的资源分配可以分别调整；P 用 HBM 容许的最小 EP2–8，D 用可用高速通信域内的大 EP64–128；P 按未命中 token 数扩缩，D 按运行请求数扩缩。这里是生产配置建议，不能从“阶段可分别调整”推出任意流量都适用同一 P:D 比例。[Q&A 部署 L25–67](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L25-L67)、[扩缩容 L193–211](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L193-L211)

### 可以画什么

一幅共存架构图：请求 → 元数据匹配 → P 负载选择；所有 P 均连共享 block KV，SWA 连主机目录；P → 搬运 KV → D，D 以“请求数 + 总 KV 长度”两把尺选负载。改变命中长度时，应同时改变**待算 token、缓存读取量、P 需求**；改变流量构成时，P 与 D 资源需求分别变化。不能把“缓存开/关”和“负载均衡开/关”当作彼此无关的收益按钮。

成本桥梁应明确标成解释模型：

\[
C_{\mathrm{useful}}=\frac{C_{\mathrm{GPU}}+C_{\mathrm{storage}}+C_{\mathrm{network}}+C_{\mathrm{reserve}}}{N_{\mathrm{served\ within\ SLO}}}.
\]

分子是同一观察窗口的费用，分母是质量要求不变且满足 TTFT/TBT 的有效服务量；若用 token，需固定输入/输出与缓存命中的计数口径。提高离线 tok/s 只支持因果中的一环，不能自动等于该分母增大相同比例。省去的 prefill 需要超过新增缓存匹配、读取、搬运及必要 replay 的成本，且共享存储与互联不能成为新瓶颈；这是推导条件，不是该仓库给出的实测成本公式。

### 必须保留的边界

- cache match 要在路由之前完成，官方明确它不能被隐藏；fetch 异步，逐层 H2D 的目标是与 forward 重叠，不能写成“所有缓存开销为零”。[Q&A L155–157](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L155-L157)
- 存储服务器、物理冗余、网络和备用 quota 均有成本；跨数据中心还需带宽和可靠性预算。官方保留空闲扩容池，quota 使用率超过 0.8 时禁止缩容；不能把 GPU 利用率画成始终 100%。[Q&A L71–91、L193–211](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L71-L91)
- 无重复前缀、缓存读取慢、流量低到无法填满大 D 实例、P/D 搬运占主导时，净收益可能变小或逆转。这是由上述资源项推出的条件，不能伪装成官方量化结论。
- 开源发布是离线引擎；完整 KV 系统、VE/P/D 分离服务和跨副本负载均衡未包含。生产系统的 155T token/day、$38/GPU-hour **收入**不能称为开源引擎复现实测、成本或利润。[README L3](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/README.md#L3)、[未包含部分 L38–42](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/README.md#L38-L42)、[Q&A L17–21](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L17-L21)

## 2. Wide-EP：固定总卡数与 token 的最小权重摊薄模型

官方结论限于 **MoE expert 部分每步内存流量降低**，有良好 EPLB 时提高 TPS；Attention 是 DP，DP 数与 EP 数相同。P/D 采用不同 EP 规模，不是同一层同时采用两个替代算法。[Q&A L29–57](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L29-L57)

### 模型条件与守恒量

固定总 GPU 数 \(G\)、本步真实 token 总数 \(T\)、逻辑专家数 \(E\)、每 token top-k \(k\)、专家形状和每专家权重字节 \(W\)。EP 组宽为 \(s\)，独立组数为 \(G/s\)，每组持有完整逻辑专家集合并分布在组内，每组接收 \(B=Ts/G\) 个 token。保持相同 token 路由选择；暂不计共享专家、冗余专家、padding、缓存层次、权重重复 tile 加载及通信。

在**每组所有专家均激活、组内每专家本步权重只读取一遍**的理想示意条件下：

\[
Q_W(s)=\frac{G}{s}EW,\qquad
M_{\mathrm{expert}}=\frac{kTs}{GE}.
\]

\(Q_W\) 是全体 GPU 的示意权重读取量；\(M_{\mathrm{expert}}\) 是每组每专家平均处理的 token 数。增大 \(s\) 后，独立组少了，同一套专家权重不再跨这些组重复读取；每个专家在更大的 token 批上复用权重。总 token-expert 次数仍为 \(kT\)，路由专家 GEMM 的数学 FLOPs 没减少。这里的“一遍”是讲解所用的权重复用上界条件，不是对真实 kernel HBM 流量的逐字节预测。

**可视例：** 同为 8 张卡、64 token、8 专家、top-2；EP2 是 4 组，每组 16 token、每专家平均 4 次，EP8 是 1 组、64 token、每专家平均 16 次。若每组专家全覆盖且忽略 EPLB 冗余，完整专家集合的示意读取次数由 4 份变 1 份，token-expert 次数均为 128。必须让小组各持有一份完整专家集合，不能拿 2 卡与 8 卡直接比吞吐。权重条变少、每专家 token 条变长、总计算计数不变，是这幅图的核心关系。

### 低负载边界也应可见

若每 token 从 \(E\) 个专家均匀无放回选 \(k\) 个、不同 token 独立，则每组预计激活专家数为：

\[
A(B)=E\left[1-\left(1-\frac{k}{E}\right)^B\right],\qquad
Q_W(s)\approx\frac{G}{s}WA(Ts/G).
\]

当每组 token 很少时，\(A(B)\approx kB\)，示意读取量接近 \(kTW\)，合并 EP 组几乎不能消除重复专家读取。它解释了为什么不能让“EP 宽度”机械地产生线性吞吐收益。若使用实际固定路由列表，直接数各组激活专家的并集，比概率模型更适合最小交互。

其他必要条件：同一个高速 scale-up 域；内存读取确为限制或更大 M 能改善 GEMM 效率；EPLB 避免热门专家卡成为尾部；有足够请求维持批量。Wide-EP 的激活分发/结果回收仍需通信，EP 增大并不保证网络字节下降；EPLB 冗余专家也破坏简单“一组一套权重”的精确计数。[Q&A L93–103、L199–211](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L93-L103)

**不能宣称：** EP8→EP64 必然 8 倍 TPS；GPU 数增加本身证明摊薄；MoE 参数/FLOPs减少；共享专家或 attention 流量也按同一比例降低；低并发与跨慢互联无代价。官方图只能按其给定硬件、batch/latency 和模型配置解释，不能拿示意字节比例替代基准结果。

## 3. Mega MoE：改变执行组织，而不是消灭必要数据

### 固定版本可以直接核对的事实

- DeepInfer 分离路径先 gate，调用 DeepEP dispatch 并等待结果，再 GEMM1 → SwiGLU/转换 → GEMM2，最后 combine 并等待。它已经使用异步通信 API，shared expert 与部分通信存在重叠安排，不能画成“传统实现绝无重叠”。[mlp.py L406–459、L461–511、L565–616](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/models/v4_modules/mlp.py#L406-L616)
- DeepGEMM 定义把 EP dispatch、两次 linear、SwiGLU、EP combine 融合入一个 mega-kernel，以 NVLink 通信与 Tensor Core 计算交叠；需要 symmetric memory。输入和输出仍在接口中。[固定 DeepGEMM README L93–121](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/README.md#L93-L121)
- DeepInfer 启用条件包含 EP 组位于 NVLink 域；gate 仍在 mega-kernel 调用之前产生 top-k，存在输入 symmetric buffer 和 BF16 输出；shared expert 在未融合配置下另算。[mlp.py L184–188、L528–563](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/models/v4_modules/mlp.py#L528-L563)
- **反证“所有 HBM 中间状态消失”：** 固定 DeepGEMM `MegaMoEBuffer` 明确包含 workspace、input、routed L1/L2 ring buffers 与 combine token buffer；API 将 raw symmetric buffer 切为这些张量视图。[layout/mega_moe.cuh L345–365、L426–455](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/layout/mega_moe.cuh#L345-L455)、[API L94–152](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/csrc/apis/mega_moe.hpp#L94-L152)
- **反证“通信量归零”：** kernel 的 L2 epilogue 经 NVLink 将 GEMM 输出写入远端 combine buffer，之后读取、归约 top-k 结果并写回。[SM100 kernel L1273–1365、L1453–1516](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1273-L1516)

### 可以画什么与不能画什么

同一批 token、同一专家选择和数学输出关系：上轨显示跨 kernel 的 dispatch 完成边界 → 专家计算 → combine；下轨按块显示 token 到达即可开始对应计算、完成块即可回传，使通信条与计算条重叠，同时保留 symmetric ring buffer。不同块可并行，单块仍遵守 dispatch → GEMM1 → activation → GEMM2 → combine 的数据依赖。说明收益来自更细粒度的生产/消费、减少 launch/阶段等待、复用并收紧部分中间数据的生命周期；未经 profiling 不标固定百分比或精确 HBM 节省。

可用 \(T_D+T_C+T_R\) 与“依赖允许的重叠后关键路径”作**时间示意**，但 \(\max(T_D,T_C,T_R)\) 只可标为理想稳态下界，需另计流水填充、排空、同步和资源争用；不可当实测时长或吞吐计算器。

**不能宣称：** gate、专家权重读取、HBM 中间缓存、top-k 输出归约或 NVLink 通信被删除；单 kernel 自动意味着全程在 SRAM；融合改变路由数量或减少数学 FLOPs；分离路径完全没有 overlap；任意互联、硬件与精度都适用；官方“scale-up 域内更快”的结论等于每种参数都具有同一固定加速比。

## 连续阅读自检

按“服务有效工作量 → 缓存与路由 → 阶段资源配置 → MoE 权重摊薄 → MoE 执行重叠”读完，结论应为：缓存减少需要重新计算的 token；共享可达性使负载分配不必为命中位置让步；P/D 各按自身负载分配资源；Wide-EP 在受控条件下合并专家计算批、摊薄重复权重读取；Mega MoE 在必要通信和缓存仍存在的前提下缩短执行关键路径。它们共同影响满足延迟要求的服务量与资源成本，单独的模型计数不能乘成端到端收益，更不能推出利润。
