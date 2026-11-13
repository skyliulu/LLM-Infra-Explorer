# DeepInfer：新版 Skill 复核

日期：2026-11-13。范围：assessment，只评审，不修改页面、模型或布局，不部署。使用新版 Analyze Technical Principles 与 Develop Interactive Module 的 implementation-fidelity、reader-review 标准。保留已经获认可的展示；旧验收不自动证明实现一致性。

**结论：当前主线和交互可以保留；尚不能通过“深入后与真实实现一致”的技术验收。确认两项 P2，实现范围文案另有一项 P3。** 模型检查通过，不能抵消这两项来源约束差异。

## 发现

### F1 · P2 · 部分结果回写被标成最终合并完成

位置：`src/components/deepinfer/mechanism-model.js:15`，`lesson-model.js:40`，`MechanismPanels.jsx:28`。

复现：内核时间设为 4，选“按块衔接”的 A。页面已显示“合并结果已到达”，B 正在计算、C 尚未计算。纯模型也返回 A.returned=true、B.computing、C.waiting，见 [执行结果](reproductions.json) 和 [实际页面](evidence/kernel-t4-zh-light.jpg)。

固定的 [DeepGEMM SM100 FP8/FP4 内核](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1273-L1354) 确实允许 GEMM2 提前向来源 rank 的 combine 槽写入部分结果，因此通信/计算交叠的主张成立。但 [最终合并路径](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1410-L1441) 还要经过本 rank L2 写入的 grid 同步、发布 rank 就绪、等待选中专家所在 peer，再读取并归约输出。现图把部分结果可回写直接等同于最终输出可消费，且单一计算资源的 ABC 没有给出能支持这种提前完成的 rank/专家归属。

这不是“全 EP 所有 rank 必须同时结束”的全局屏障；无关 rank 仍可能计算。问题是页面缺失了所选来源、专家贡献与就绪条件，不能用示意时间免责声明替代依赖正确性。

修改边界：保留时间条和提前交叠，把部分结果回写、相关 rank 就绪、最终归约/输出分开；说明接收输入环形缓冲、专家 owner、来源 rank 和 top-k 槽的对应关系。无需复刻全部 SM 调度器，也不需要重做页面结构。

### F2 · P2 · EPLB 展示的物理布局不符合固定槽位约束

位置：`src/components/deepinfer/lesson-model.js:23–24,34`，`ExpertComparison.jsx`。

复现：每卡 4 Token、E1 热点、开启复制。EP8 共有 11 个物理权重副本，各卡数量为 `[1,2,2,2,1,1,1,1]`，表格显示额外 3 个，见 [实际页面](evidence/eplb-hot-zh-light.jpg)。

[DeepInfer MLP 的物理布局](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/models/v4_modules/mlp.py#L196-L205) 要求物理专家数可被 EP 整除、每卡等额槽位；[resolve_num_extra_experts](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/eplb/__init__.py#L21-L28) 向上补齐。8 个逻辑专家、EP8，一旦要求至少 3 个额外槽位，需补为 8 个额外槽位，即 16 个总槽位、每卡 2 个。未激活的槽位也有驻留成本。

简单复制分摊热点的道理没有错，32 次 Token–专家计算的守恒也没有错；差异在于把不等容量的抽象布局当成该实现的物理布局和成本。修改时区分驻留槽位、逻辑专家、活跃副本及重分配；保留权重复用和热点交互。若只保留概念模型，必须在此处明确其与真实等额槽位的区别，不能声称已提供真实实现深度。

### F3 · P3 · 缓存数字的计算范围需要贴近指标说明

位置：`src/components/deepinfer/lesson-content.js:13–14`，`lesson-model.js:17`，首屏历史缩略图。

6×128=768 的历史和 2×128=256 的未覆盖后缀计算正确。问题是指标写“本次需要计算的位置”，结束说明写“Prefill 只计算剩余后缀”，容易被读成全部 Prefill 工作。折叠说明已有“只跟踪块 KV”，这是有效限定，故不判为核心模型错误；但主要数字旁没有这个范围。

[官方部署 Q&A 的 SWA 有界重放](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L179-L191) 还涉及缺失 SWA 时的恢复，以及 CED decoder 层的重放。256 不能直接代表完整服务的总计算量，更不能直接换成节省比例。生产设计中的 128 重放也不能无条件套用所有开源后端和默认配置。

修改边界：主要指标改为“块 KV 未覆盖的位置”，旁注不含 SWA 恢复/重放与逐层计算；本章保留必要接口，详细原理仍归 CED。无需把 CED 专题搬进来。

## 主作者实际阅读复盘

在 `http://127.0.0.1:4173/#deepinfer` 亲自按首屏→官方工作点→三个缩略机制→请求图及职责→DP/EP→专家副本与输入行→内核时间条和缓冲检查器→缓存→P/D 调度与 CPU 补充→官方曲线、成本、来源和页尾阅读。章节定位辅助长页移动，没有用源文件阅读替代实际页面。探索了热点/复制、时间 4 的 A、缓存完整路径和范围折叠、CPU 补充开关、系统图详情和返回。

现在默认阅读可重建的因果链是：P/D 的负载差异决定并行策略；宽 EP 汇集专家输入行以摊薄重复权重读取；共享历史减少块 KV 重算并放开路由选择；通信/计算交叠减少等待；最终要在服务速度目标和部署条件下看有效吞吐/总成本。低并发、热点、缓存低命中和存储/网络投入都限制收益。官方收入不等于利润或回本周期，页面对此已有正确区分。

主要阅读摩擦落在上述细节：内核绿色完成状态比源码允许的含义更强；额外副本指标未表达固定容量；缓存范围限制离主要数字较远。无需因这些发现推翻已获认可的整体视觉。中文比早期版本自然，仍应优先把这些术语改成具体对象和动作，而非再加一层泛泛总结。

## 覆盖、独立复核与限制

- 新执行 `npm run check:deepinfer`，24 缓存案例、64 专家快照和 13 个内核时间点检查通过，[日志](model-check.log)。另导入当前纯模型复现差异，[reproductions.json](reproductions.json)。检查自洽不能证明来源约束正确。
- 固定 DeepInfer `553741557a57df44a46fb3ab72b6aafeaf945337`，其 DeepGEMM gitlink 为 `1fc9c66975ee322d628b3288534ca0e9ce12a64d`。阅读了 MLP/EPLB、worker、部署 Q&A 及对应 SM100 FP8/FP4 Mega MoE 路径。worker 的前一轮 CPU 后处理与当前前向交叠在当前解释范围内成立；24/18 是示意时间。完整在线缓存/路由服务未随离线核心完整开放，不声称已验证其全部实现。
- 主作者实际覆盖中文浅色桌面连续阅读和关键交互，另查看英文暗色内核画布；[首屏](evidence/overview-zh-light.jpg)、[页尾](evidence/footer-zh-light.jpg)、[英文暗色](evidence/kernel-en-dark.jpg)。本次未重新执行平板/手机、全双语×双主题矩阵或 System 解析，不继承旧截图为本次覆盖。观察范围内无新增视觉阻断；这不是新的全矩阵视觉通过。
- [独立来源审查](independent-source.md) 最终确认 F1/F2。其初稿第三项“对称输入缓冲初始化错误”经过主作者质疑及进一步追踪后撤回：该名称可合理指接收环形缓冲，不能据此证明初始化错误。所有最终结论以其末尾更正及本报告为准。本报告源码行号按本地固定 blob 重新核对；独立初稿 MLP 的 207–216 定位偏移，正确约束在 196–205。
- 没有运行上游 CUDA/Python、GPU 性能/精度或生产费用复现。未改运行时代码，所以未重复构建或完整集成验收。只写评审证据并重开技术验收，未提交、推送、部署。

后续顺序：先修 F1 依赖与 F2 固定槽位，再修 F3 指标范围；补独立来源预期的回归；按保留布局的小修范围实渲染并通读复验。在此之前，当前章节不能标记为实现一致性通过。
