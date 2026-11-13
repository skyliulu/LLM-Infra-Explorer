# 当前版验收范围

2026-11-13。先有站内对照和独立失败基线，才实施本次改版；connected/旧通过已被本轮取代。当前入口是 ConnectedReport + SystemAtlas，技术纯模型沿用已固定来源，无新增性能/回本宣称。

## 已执行

- 源码/Skill相关23项最终哈希见上级run.json。最后一次修改只放大结果分式字号，随后重建并重新采集所有外观组合。
- `npm run check:deepinfer`：原缓存24案例、专家64快照/守恒/低负载及融合依赖；新块就绪13点和短长请求守恒/反例均通过。
- `npm run check:workbench`、`node scripts/check-theme.mjs`、生产build通过。构建2010模块；Browserslist旧数据库为提示。最新原始输出在evidence/model.log、integration.log、theme.log、build.log。
- 约定检查：MechanismPanels按timeline/结构/数据移动/指标/math为9/9；此前本轮SystemAtlas为2/2、ExpertComparison及ConnectedReport为3/3。日志保留最终机制检查，不声称词法检查证明教学质量。
- Skill的新增相对体验判断位于references/reader-review.md，既有owner场景加了对应行为标准。PyYAML隔离装入临时目录后，以Python UTF8模式运行quick_validate，结果有效；未改项目依赖。实际前后站内对照/独立报告是这次行为案例，不是未来一次成功率证明。没有为小段规则重跑全部历史情境。

## 实际生产浏览器

IAB，4173生产版。中英×Light/Dark×1440/900/390（高900）12组合，每组实际定位overview/system/experts/kernel/cache/scheduling/results。84张当前视口采集，只表示覆盖；实际打开审看的代表区域、时间和观测在evidence/render-observations.json。包括桌面首屏/深色内核，手机浅色首屏/英文内核/深色输入行/缓存/负载/结果及英文系统图，平板系统图和专家图。最终另实看19px公式页尾与默认预览。没有将84张采集当成84次独立审图。

实际innerWidth与主题值相符；全部组合没有整页横向溢出、主要局部容器溢出、KaTeX错误或缺图。深色输入通道最初被调色编译压暗，实查computed背景后改用固定可见语义色，最终矩阵小格清楚。待执行条不再用极低透明度压掉文字，完成/当前/未来可分辨。System实际解析当前OS-dark；未更改系统或声称OS-light分支已观察。显式Light已覆盖。临时viewport已reset，交付留中文浅色。最终生产时间后的warn/error为空。

证据导出时REPL变量重绑定使最终JSON的variants为空，覆盖检查据此失败。12组真实CUA结果已在工具回执逐组返回；依据这些回执恢复观测索引，并验证84个实际截图均存在且晚于最终快照，再次运行覆盖检查。该记录修复没有伪称重新执行或重新审看UI，说明保留在render-observations.json。

Owner实际默认通读、关键分支、还原答案与摩擦见reader-review.md；独立读者用Edge中文暗色桌面先拒绝基线，再复核新设计及最终生产操作短名，见independent-baseline.md、independent-final.md。独立范围不扩大成完整矩阵，也不代替owner。

## 功能与发现

实际执行双侧物理权重点选、未激活专家、批量/热点/副本反例；同尺度轨迹/块选择、步进/重置/完成重播/自然停、播放中Home退出；缓存0/3/6、A/B与完整阶段；短长负载，CPU补充开合；首屏机制一步定位、主图原位职责及同图返回；64/32真实标点；配置Home保留、分享完整重载、普通默认恢复。功能路径在最终字体微调前的同一行为实现上完成，字体修正后重新检查全部外观及最终主论证/页尾；未伪称所有功能又重复跑了一遍。

发现闭环：首屏没有问题锚点、对象晚于指标、内核需人工比对表格三个P2改为当前表示并由双阅读复核；早期横向缓存被旧grid placement破坏，已重置子项位置；深色输入格不清楚、时间条缺短名、成本分式过小均已修复。没有当前未关闭P0–P2。新内核有用户发起的局部播放，不能再沿用前轮“运行路径无timer”的描述；卸载清理和终点均实际验证。

本轮没有GPU/NPU基准、精度或真实费用/收益验证，没有提交/推送/部署。保留生产设计与开源核心区别、同请求数与同速度区别、专家冗余不同、理想读数/插值/测点区别。手机原科学图依然较密，读数表和原图入口提供辅助。
