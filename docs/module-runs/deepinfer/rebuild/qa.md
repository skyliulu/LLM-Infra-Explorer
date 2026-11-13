# DeepInfer 最终验收

2026-10-28，本次替换为连贯的单工作台、7个视图。React DOM/CSS保留共享主题、语言、KaTeX、配置生命周期和分享契约；不新增渲染依赖。当前运行入口仅LessonExplorer；旧performance/system文件保留作历史源，不再渲染，也未用旧模型测试冒充新实现测试。

## 实际覆盖

- 纯模型：24缓存阶段/位置案例、64专家快照；路由所有权、工作量、权重读取和冗余副本守恒；低负载反例；按块依赖/通信与计算资源不冲突；P/D固定工作与资源、首D与全部P的交换；上下层返回；双语键一致。
- 生产浏览器完整矩阵：7视图 × zh/en × Light/Dark × 1440/900/390 =84个实际UI状态，保存原生截图并读取实际innerWidth/视图/步骤，未发现页面横向滚动。84次截图不是84次独立读者或逐像素审查；owner打开了代表性的桌面/平板/手机、明暗及双语截图并完成主要路径实际阅读。最后仅英文轨道Communication→Data transfer修正后，对受影响的kernel重新做3宽度×2主题的6态回归，元数据在 final-label-regression.json；中文全7视图亦于最终快照后重走。旧84矩阵不能冒充这个最后标签修正后的全84重跑。
- 开始用的工具托管预览固定1280，未响应viewport，未计入三尺寸覆盖；随后改用原生IAB标签，实际innerWidth逐项确认。闭合details的隐藏IMG几何偶尔留下旧宽度，文档宽度未超视口，展开官方图后实测加载1350px原图且受容器约束，不是可见溢出。Full-page截图中的重复/中途页头是sticky截图伪影，最终关键修复以普通视口截图核对。英文开篇亦用真实视口核对，未截断。
- 浏览器交互：历史0/3/6和A/B，零命中跳过搬运、终点完整8块；自动播放0→3后停、重置；高/低batch，EP2/8，热点副本关/开，32工作不变而最忙卡16→4、副本0→3；T9双处选择对齐，T32在batch1消失后重置T1；播放中改EP后暂停/回0；内核0/3/8/12和重播；服务分离关/开及CPU异步关/开；重要子层返回原父层配置/选择。
- 集成：Home保留history0和replicaB、视图回overview且step0；分享链接只含DeepInfer.lesson配置，完整重载恢复0/B而无生命周期；普通不带setup重载恢复6/A。旧配置键拒绝由schema检查覆盖；未另外声称在浏览器操作所有旧链接。System实际解析当前OS dark，保留kernel暂停step3；没有模拟OS light，但显式Light/Dark均已检查。官方本地图正常加载，KaTeX errors=0，最终浏览器console warning/error为空。
- 命令：check:deepinfer、check:workbench、conventions(9/9)和production build通过；84态manifest通过check-qa-matrix。尝试npm run check:theme发现仓库无该命令，未记成成功；主题使用上述真实渲染验证。Browserslist数据库过期提示不影响本次生产构建。

## 发现与复核

独立读者5项摩擦见independent-review；owner另发现公式平板换行和手机英文轨道标签侵入。均已修复并定点查看最终截图。无未关闭P0–P2；未以子agent通过或机械矩阵代替owner整章阅读。最终快照后的当前关键证据为owner-final-kernel.jpg、final-mobile-tracks.jpg、final-cost-900.jpg、final-share.jpg、final-system.jpg及final-en-*-kernel.jpg。

边界：没有GPU/NPU模型执行、真实吞吐/内核时长/数值精度测量、发布或推送；成本来自可见因果和官方生产资料，不是本地复现。仍无法证明任意主题都能一次生成即完美，当前案例经过实际修复。
