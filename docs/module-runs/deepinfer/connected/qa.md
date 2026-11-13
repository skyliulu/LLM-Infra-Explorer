# DeepInfer 连贯图解验收

2026-11-13。当前运行入口 DeepInfer → ConnectedReport；旧 TechnicalReport 不在渲染路径。最终源码快照和哈希见上级 run.json，历史失败评审仍保留在 review-2026-11-13/，不覆盖前轮证据。

## 修正范围

保留连续技术报告，增加真正连接的系统图与组件接口/下钻/原图返回。EP2/EP8 改同输入并列，能追踪物理专家副本和输入矩阵行；新内核图标示同块输入/计算/结果/来源四层的就绪依赖；调度显示同候选卡的请求数、KV 总量及短/长接入后果。官方原图常显，64/32 原有点圈标和读数表联动。中文正文去除重复总结模板，图承担对象关系，限定语放在相应量附近。

原来收起实验仍播放的问题通过移除本轮运行路径的自动 timer 解决；内核用本地位置滑条、缓存用手动步骤，CPU 补充关闭时卸载。时间/检查器不写分享配置；新长短请求设置经共享 schema 验证。

## 最终工程检查

全部在 2026-11-13T12:37:15.258Z 输入快照后执行，原始输出见 evidence/：

- `npm run check:deepinfer`：24 缓存阶段/归属、64 专家快照及守恒/边界；新内核 13 时间点就绪依赖；短/长接入总量守恒和策略反例。
- `npm run check:workbench`：13 章分享及学习路径检查通过，新 routeRequest roundtrip 受覆盖。
- `node scripts/check-theme.mjs`：调色编译、角色映射、对比和媒体规则检查通过。
- `node .agents/skills/develop-interactive-module/scripts/check-module-conventions.mjs src/components/deepinfer/ConnectedReport.jsx --capabilities structural-comparison,data-movement,resource-metrics,math`：3/3 要求通过，0 警告。词法检查不代替实际阅读。
- `npm run build`：成功，2009 modules；Browserslist 数据库更新提示，不影响本轮构建。未额外安装依赖。

## 浏览器与外观

最终生产预览 `http://127.0.0.1:4173/#deepinfer`，IAB。明/暗 × 中文/英文 × 1440/900/390（均高 900）共 12 组合；每组实际定位 system、experts、kernel、cache、scheduling、results，72 张原生截图。观测为整页无横向溢出、无 KaTeX 错误、原图完整加载；主题与 viewport 由页面实际值核验（前两组宽度在当时独立核验，后十组随 JSON 记录）。qa-matrix.json 只核对组合覆盖。

实现者实际打开检查的代表像素列在 evidence/render-observations.json 的 inspected 字段：桌面浅色总图、英文深色内核；手机总图/专家/内核/缓存/调度/结果六种；平板英文浅色总图、中文暗色专家、英文暗色调度。没有把采集数量充当逐张独立审图。浅色画布与卡片使用亮面；暗色状态、按钮、公式可辨，科学原图保留自身白底。手机图有必要的纵向阅读，未将 tiny 图强行横向铺开。

System 实际选择后解析为 dark，与当前 `prefers-color-scheme: dark` 相符。没有改变 OS 设置，未声称观察 OS-light 分支；显式 Light 已实际覆盖。临时 viewport 最终 reset，页面恢复中文浅色初始状态，并保留为交付预览。当前生产验收时间以后的 console warn/error 列表为空；未把此前 dev 日志混为当前错误。

## 行为与阅读

Owner 从首屏到页尾连续读并重建解释，见 reader-review.md；独立审阅另用 Edge 中文暗色桌面，从默认路径通读并操作主要机制，见 independent-review.md。两者不相互替代。

已实际操作：主图节点→接口→内核→同一主图保留选中；低负载、热点/副本、未激活 E2、均匀 E1；内核 0/3/8/12；历史 0/3/6、A/B 及步骤；长/短请求；CPU 补充开合；64/32 圈标与表；中英/主题切换不丢设置。

Home 往返：命中 3、实例 B、短请求均保留。页面生成的分享链接包含 lesson 和 routeRequest，打开后完整 reload 恢复 3/B/short；移去 setup 后普通 reload 恢复 6/A/long。内核位置/专家检查器/结果读点不序列化。目录定位仍在同一正文，没有切换另一套报告。此次分享验收不宣称重新验证所有其他章节参数。

初次浏览自动化读取紧接点击有过旧帧/旧树，使用后续实际页面状态和截图核对；定位时误用 heading anchor 作 section id 的选择器失败不计产品故障，未把尝试当成功。当前版本无真实 GPU/NPU 运行、精度验证、实际费用或回本复现，也没有提交、推送、部署。

## 发现闭环

本轮前述三个 P2：系统层级断开、机制停留文字、官方结果未作可追踪读图，现由连接图、专家/内核/负载对象及原标点对照解决，并经过 owner+独立阅读。旧隐藏播放已改手动；移动端指标对照、配置变化重挂载和两项独立 P3 均修复。没有未关闭 P0–P2。手机原科学图较密、System 仅测当前 OS 分支及未复现硬件性能是验收限制，未伪装为通过的真实测量。
