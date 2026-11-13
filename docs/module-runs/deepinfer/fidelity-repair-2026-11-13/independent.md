# 聚焦修复的独立来源复核

日期：2026-11-13。范围仅为此前 F1（提前写回与最终合并混淆）、F2（物理槽位布局）及相邻文案；只读源码，不修改实现，不要求重做布局。本次重新读取当前模型、组件及中英文文案，并重读固定版本的一手实现，不沿用旧结论作为验收依据。

**结论：这两项来源一致性问题在当前可见主路径中已解决，没有发现本范围内需要阻断交付的新问题。** 这是静态技术复核和纯 JavaScript 模型验证，不包含浏览器渲染、实际 GPU 数值、并行执行或性能复现。最终页面验收仍由 owner 完成。

## 固定来源与执行上下文

- DeepInfer：`553741557a57df44a46fb3ab72b6aafeaf945337`，本地 `C:/Users/29043/AppData/Local/Temp/deepinfer-primary-research`。
- 它的 DeepGEMM gitlink：`1fc9c66975ee322d628b3288534ca0e9ce12a64d`。本次重读此前从官方 raw 下载的同版本文件，位于 `C:/Users/29043/AppData/Local/Temp/deepgemm-fidelity-1fc9c66`。
- 核心对应为该 pin 的 SM100 FP8 activation / FP4 或 FP8 weight Mega MoE 分支。静态来源不证明所有平台都采用相同内部实现，也不证明生产性能。

## F1：写到来源卡，不等于最终可读——已解决

对应源码：[GEMM2 epilogue 写入远端贡献槽](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1273-L1354)；[本 rank 的 L2 写入完成、发布就绪、等待所选 peer，再读槽归约](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1410-L1460)。其中 grid sync 是每个 rank 的本地边界，后续等待只针对 token 所选专家的 peer；不能称为整个 EP 的全局完成屏障。

当前 `mechanism-model.js:9–27` 明确 A/B/C 属于同一 owner。先求该 owner 最后一次写回结束，再经过 readiness 阶段和 source-side reduction，最后才设置 `returned`。`MechanismPanels.jsx:10–11,23–30` 把对象标为 GPU 1 接收环、GPU 2 专家贡献槽、GPU 2 最终输出，明确 top-1 和同 owner 条件；图例和检查器分别显示“部分贡献已写入”“发布就绪 / 等待”“读取贡献并归约”。written 没有沿用 readable 的绿色样式，而用单独的黄色状态。

关键反例复测：

| 示意时刻 | fused A 贡献槽 | owner / 最终输出状态 | 是否已返回 |
| --- | --- | --- | --- |
| 4 | `written` | B 仍计算，等待 GPU 1 本轮写回 | 否 |
| 8 | `written` | 本轮写回结束，发布 / 等待 | 否 |
| 9 | `reading` | 读取贡献并归约 | 否 |
| 10 | `consumed` | 最终输出完成 | 是 |

serial 对应在 12 发布 / 等待、13 归约、14 完成。两条路径保留同样的最终依赖，时间只表达关系，不是预测测量值。`ConnectedReport.jsx:19,28,36` 和 `SystemAtlas.jsx:12,19` 也已把提前写回与最终输出区分开。此前最关键的“B 尚在同 owner 计算却已完成 A 合并”的错误不再出现。

本例没有表示 GPU 2 自己的非空专家工作。真实源码中 GPU 2 进入 combine 也必须经过它自己的本地 L2 边界；在这里 GPU 2 不承担所示专家计算，因此省略其其他空工作不造成当前反例。若未来增加 GPU 2 的专家工作，必须把它的本地完成条件也纳入，不能仅等 GPU 1。现阶段无须为了这一省略增加新面板。

## F2：固定等容量槽位与简化分流——已解决

对应源码：[EPLB 对总物理专家数向 EP 整除约束取整](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/eplb/__init__.py#L21-L28)；[DeepGEMM 对每 rank 专家数与总专家数的关系](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/csrc/apis/mega_moe.hpp#L41-L50)。

当前 `lesson-model.js:23–39` 在 EP8 开启冗余时始终保留 16 个物理槽，所有 rank 都是两个。额外映射 `[4,0,0,0,7,1,2,3]` 没有在同一 rank 中重复同一个专家，因此当前按 rank+逻辑专家分配与按逻辑专家汇总 `weight.tokens` 不会让一条输入被记到两个本地槽。E1 有四份，hot 流量轮流分配；其余普通流量使用主副本，闲置冗余槽仍计入驻留容量。

`ExpertComparison.jsx:4,15` 已分别显示驻留槽位、冗余槽位、激活副本，并在两种语言中说明这些槽即使不激活也占显存，且布局不复现历史统计驱动的重排及权重搬运。由此读者不会再把“三个额外副本”的玩具计数当作可运行的 DeepInfer EP8 物理布局。

复测 EP8：batch=4、hot 时，关闭冗余为 8 槽 / 5 激活 / 最忙 16 行；开启为 16 槽 / 8 激活 / 最忙 4 行。uniform 时，开启冗余仍为 16 驻留槽但只有 8 激活；这正确区分容量与活跃载荷。每轮 token–expert 工作量保持 32。batch=1 也保留相同槽容量，并且 hot 分流实际生效。EP2 继续维持四个完整组、共 32 槽的基线。

这种分流不是实际 gate 的 replica 选择算法，固定映射也不是从真实窗口统计求得的 EPLB 结果；页面已明示，作为简化教学模型可以接受。宽 EP 权重复用的直觉仍成立，不能从激活副本数、理想读取数或最忙 rank 行数推导实测吞吐倍率。

## 检查方式与边界

执行 Node 导入纯模型，检查 0–14 共 15 个时间点、两条路径：所有块只有在 final.end 后 returned；最终归约前不会把贡献槽标为 reading；开始最终处理前同 owner 的贡献写回全部结束。检查 EP `{2,8}` × batch `{1,4}` × routing `{uniform,hot}` × balance `{false,true}` 的 16 个配置：等容量槽约束、驻留总数、每 token 唯一路由及 slot 工作量守恒均通过。这里只执行教学模型，未执行上游 Python/CUDA。

当前入口 `DeepInfer.jsx:4,11` 渲染 `ConnectedReport`，进而使用修复后的 `KernelBuffers`。旧 `LessonExplorer` 中保留的另一套 KernelView 没有从该入口挂载；它不能作为本次已修复页面的技术证据，也没有在本次复核中被当作用户可见阻断问题。未来若重新接入，应单独同步其来源语义。

接收环属于对称分配的一部分：[MegaMoEBuffer 的 ring 布局](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/layout/mega_moe.cuh#L400-L453)。现在显式标注其 owner，已经消除了旧复核中最后降级为“对象映射不清”的 F3 疑点，无需另造初始化错误。

保持当前布局即可。未要求扩展为完整 SM 调度、所有 top-k 分支或完整生产 EPLB；当前省略的边界与教学目标相容。实际文本排布、Light/Dark/语言/响应式和连续阅读体验不由本静态复核背书。
