# 来源与解释深度

固定DeepInfer提交553741557a57df44a46fb3ab72b6aafeaf945337，DeepGEMM gitlink 1fc9c66975ee322d628b3288534ca0e9ce12a64d。再次读取官方Q&A及本地固定checkout；原始逐条取证见 ../rebuild/primary-checks.md。本次不把新版主分支信息倒灌到旧版本。

新增可见论证：官方P EP2–8与D EP64–128选择、Attention本地请求→MoE跨rank专家→回原rank；专家GEMM输入行数与权重形状；两次GEMM/SwiGLU/输入与结果缓冲；3FS block与host SWA分离，哈希匹配→进程fetch→逐层GDR swap-in；P上下文分桶/时间quota求chunk及DP MIN，D请求数+KV长度双负载；离线Pareto与生产成本口径。没有新增实测性能数值。

静态论证与示意明确区分：生产配置非玩具8卡配置，激活权重读取份数非真实字节，流水时间非实测倍率。内核缓冲取证以原primary-checks为准。矩阵式专家输入按当前物理副本实际收到Token数派生；专家选择、路由、批量改变该行数。生产服务未开源部分及收入口径在结果段说明。
