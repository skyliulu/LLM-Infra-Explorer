# DeepInfer：实现一致性修复与验收

2026-11-13，用户在新版 Skill 评审后授权修复。范围是此前两项 P2、一项 P3，保留已认可的首屏、连续正文、组件图、专家比较、内核时间条和控件位置。基线见 [此前评审](../review-new-skills-2026-11-13/review.md)，不是全章重做或全站源码审计。

## 来源 → 模型 → 页面

| 修复 | 固定来源与上下文 | 当前可观察关系 | 验证与剩余抽象 |
| --- | --- | --- | --- |
| F1：部分写回与最终输出分开 | DeepInfer `553741557a57df44a46fb3ab72b6aafeaf945337` 引用 DeepGEMM `1fc9c66975ee322d628b3288534ca0e9ce12a64d`；[SM100 FP8/FP4 GEMM2 写回](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1273-L1354)、[本地 L2 完成、发布、所选 peer 等待及最终归约](https://github.com/deepseek-ai/DeepGEMM/blob/1fc9c66975ee322d628b3288534ca0e9ce12a64d/deep_gemm/include/deep_gemm/impls/sm100_fp8_fp4_mega_moe.cuh#L1410-L1460) | 保留 ABC 时间条，添加来源卡输出轨道。接收环、专家贡献槽、最终输出标明归属；written 是黄色的贡献存在状态，不等于最终可读/完成。t4 A 已写回，B 仍计算，最终输出等待；t8 发布/等待，t9 归约，t10 fused 输出完成；serial 到 t14 完成 | 15 时间点×两路径的源码依赖预期；真实浏览器检查 t4/8/9/10、路径/块选择及播放自然到14停。ABC 在同一 GPU1 owner，top1，来源 GPU2 本轮无本地专家工作；实际 top-k 需等所选专家所在卡。不是全 EP 全局屏障，不推断所有后端采用相同调度，时间不代表测量 |
| F2：EPLB 固定容量 | [MLP 等额槽位](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/models/v4_modules/mlp.py#L196-L205)、[额外槽位按 EP 补齐](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/eplb/__init__.py#L21-L28) | EP8 开启冗余时每卡2槽，共16；与 batch、routing 无关。E1 四份，其余槽也画出。表格分别列激活副本、驻留权重槽和冗余槽；普通流量中未激活副本仍可选、仍计容量。hot batch4 由8槽/5激活/最忙16行变为16槽/8激活/最忙4行，Token–专家计算仍32 | 固定容量/整除/唯一归属/守恒回归；浏览器 off/on、batch1、hot/uniform、闲置 E5 和 E1 返回。固定 replicaMap 与热点轮流分配是明确的教学策略，不声称复现按历史统计重排和权重搬运的完整 EPLB |
| F3：缓存指标范围 | [官方部署 Q&A：SWA 恢复与重放](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md#L179-L191) | 首屏和缓存指标写“块 KV 未覆盖的位置”；256 是块 KV 未覆盖后缀，旁注不含 SWA 恢复/重放，不是总 Prefill 计算量。结束文案也同步限定，中英文均改 | 24缓存案例保持通过；实际读过中英文结束态及指标说明。没有把生产128重放参数当成全部开源分支的默认，也没有复制 CED 专题 |

这三项均已关闭。源码链接放在原有说明附近，内核来源定位到对应内核最终合并路径，槽位说明可直达 MLP 约束。

## 实际渲染与交互

先用 Vite dev `5173` 检查交互，再在生产构建 `http://127.0.0.1:4173/#deepinfer` 复验。没有靠构建成功替代浏览器。

- 中文浅色桌面：首屏、专家热点开关及低负载、缓存范围、内核检查器。t4 贡献存在但未完成，t8/9/10 状态逐一检查；另一条路径 C 保留自己的状态。播放从9自然到14停止，下一步禁用。CPU 补充打开/收起；系统图选择融合内核→进入正文→返回原组件，未丢失组件上下文。
- 英文暗色桌面：贡献黄色状态、最终等待状态、专家驻留/闲置指标与文案。初始桌面为浏览器原生约1095/1109宽，未为了美化截图放大。
- 中文暗色900宽：第一次观察发现条内“送入/写回”换行。缩成“入/写”，完整图例和 aria 操作名保留，加上条内 padding/nowrap 约束。最终构建重新查看，无条内文字溢出；两时间板和缓冲链无局部横溢。
- 英文浅色390宽：两时间板纵向排列，检查器保持2×2；指标表的32/16、0/8及限定说明实际阅读，无页面或相关画布横溢。
- 中文暗色390宽：t4 黄色“部分贡献已写入”和未完成输出实际查看；表意不依赖颜色。
- System 在当前系统解析为 dark，实际时间板背景 `rgb(14,23,38)`；没有改变系统偏好来模拟另一个 OS 分支。验收结束恢复中文浅色、原生视口和首屏，无播放。
- 最终构建控制台 warn/error 为空。未重新覆盖所有参数×语言×主题×宽度的全排列，也未重复未受影响的分享重载旅程；workbench schema/learning checks通过。

关键截图均实际打开查看：

- [最终中文浅色 t4](evidence/final-kernel-zh-light.jpg)
- [最终900宽标签修复](evidence/kernel-zh-dark-tablet-final.jpg)
- [手机英文浅色时间条](evidence/kernel-en-light-mobile.jpg)、[检查器](evidence/inspector-en-light-mobile.jpg)、[槽位表](evidence/slots-en-light-mobile.jpg)
- [手机中文暗色贡献状态](evidence/inspector-zh-dark-mobile.jpg)
- [缓存范围](evidence/cache-zh-light.jpg)

`kernel-zh-dark-tablet.jpg` 是发现换行问题时的中间证据，`*-final.jpg` 为修复后的状态；早期桌面截图保留过程，未冒充最后条内短标签版本。

## 主作者阅读验收

亲自按首屏→官方工作点→三个缩略机制→请求图/组件接口→DP/EP→专家权重和输入行→内核部分写回与最终输出→缓存→调度和 CPU 补充→官方吞吐图、成本与页尾连续阅读。最后短标签/来源链接调整并构建后，又按相同顺序复读中文正文至页尾；相关英文说明在手机/暗色分支读过。目录辅助长页移动，没有只看源文件或用独立审查替代。

读完后可以重建：P/D 的 Token 批量差异决定不同专家组规模；宽 EP 把更多输入行交给同一份权重，但不减少 Token–专家算术工作。热点分流能缩短最忙卡的队列，却需固定冗余容量；闲置不代表不占显存。融合允许贡献提前搬运，但最后的就绪和归约不能跳过。共享块 KV 少算历史并放开选机，仍需承担搬运和 SWA 恢复；低命中/低并发/热点和互联都会限制收益。因此最终要比较满足用户速度目标的有效吞吐与完整费用，不能把玩具计数、收入或理想时间倍率当作端到端实测/回本。

可见证据是专家的相同行输入/固定槽位、t4 黄槽与等待框、后续输出轨道、缓存的H/N覆盖范围和最后官方图的独立计量口径。GPU1 接收环对应系统图的融合内核，GPU2最终输出才对应它交给下游的合并结果。小修没有拆断原有层次。

实际发现并修复的阅读摩擦是900宽条内标签换行。新增的范围说明放在相关图/数字旁，保持正文的因果推进；没有新增独立功能清单。最终本次修复范围通过，不把这当作全框架全部实现细节或所有历史章节的正确性证明。

## 检查与独立复核

- [model.log](model.log)：24缓存案例、64专家快照，新增固定容量、闲置驻留、source-ready/peer-wait/reduction边界；15时间点双路径均通过。
- [workbench.log](workbench.log)：13章schema round-trip与学习导航通过。
- [theme.log](theme.log)、[conventions.log](conventions.log)：主题编译回归、9/9模块约定通过。
- [build.log](build.log)：最终 production build 通过；Browserslist数据过期提示保留，未擅自升级依赖。
- [独立来源复核](independent.md)：重新阅读对应固定源码并检查30路径时间态、16专家配置，F1/F2解决，无本次范围新阻断。其结论不包含浏览器或GPU背书；主作者另执行上面的阅读和像素检查。

没有运行上游 CUDA/Python、真实设备时序/精度、生产费用或回本实验；没有提交、推送或部署。旧未挂载的 KernelView 不是当前入口的验收对象；未来重新接入必须先同步其语义。
