# Radix HiCache：引擎实现差距与 Layout 扩充方案

核对日期：2026-09-12。对照 SGLang main 在线源码；这是可变分支快照，不将新增路径的行为推广到所有版本和所有模型。本轮为审查与设计方案，不修改页面。

## 当前缺口与优先级

| 优先级 | 当前实现 | 应补的机制与可见证据 |
| --- | --- | --- |
| P0 | `known` / `paths` 永久保留历史，跨层用同一种按页删除 | 区分演示历史和引擎的本地索引。GPU 淘汰、host 淘汰和逻辑节点删除不是同一种操作。将冷叶候选、祖先引用、host 引用以及删除后父节点成为候选画出来。 |
| P0 | `routes` 在 match 时就读取 storage，随后 query 只是展示步骤 | 查询前保持远端未知；查询结果、已完成预取前缀、GPU 可消费前缀分别显示。不能把未来命中结果提前当成当前可用数据。 |
| P0 | 单次 copy 直接进入完成态、按页加载总能成功 | 增加分配、排队、传输中、完成确认。说明 load-back 配额 / 阈值、分配失败与退回较短本地前缀；引用保护贯穿搬运。 |
| P1 | Layout 是两张可点击的 3×3 转置表 | 改为真实地址顺序与访问范围：同一批 token × layer × page，执行逐层恢复和整页写入，比较连续片段、拼装与传输路径。 |
| P1 | 全部请求串行，计算完再统一结束 | 在同一画布增加两个请求共享前缀的并发引用、chunked prefill 插入、未满页尾部，以及完成后解除引用 / 保留缓存。 |
| P2 | 固定等待预取、固定及时备份、固定成功 | 补等待预算与重算权衡、热点备份与写回时机、内存不足 / 部分读取；最后再增加多 rank 一致性、不同 KV pool 和后端约束。 |

依据：[HiRadixCache](https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/mem_cache/hiradix_cache.py) 的 `evict_host`、`load_back`、`query_storage_hit_length`、`check_hicache_events`；[RadixCache](https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/mem_cache/radix_cache.py) 的 `cache_unfinished_req`、`cache_finished_req`、`inc_lock_ref`；[CacheController](https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/managers/cache_controller.py) 的预取 / 备份队列与 acknowledgment 同步。尤其当前 `evict_host` 会移除 GPU 已淘汰的 host 叶节点；远端存在不代表本地树永久保存其目录。

## Layout 的教学主线

问题应是：“同一份 KV，为何按层计算和按页存取需要不同组织方式？”介质带宽、访问粒度与传输实现共同决定布局；不能固定解释成 GPU 一种、DRAM 一种、SSD 一种。

以下仅展开单个 K 或 V buffer 的 layer / page / token 次序，head 与 head_dim 保留为每格内的连续向量。实际 MHA 的 K、V 可以是分开的存储段；MLA 结构也不同。

| Layout | 地址组织示意 | 优化方向 | 要显示的代价 / 选择边界 |
| --- | --- | --- | --- |
| `layer_first` | layer → token → 向量 | 与逐层访问一致；主机也可使用 | 取一整页的所有层时会跨多个地址段。不能把逻辑上相邻的方格误画成物理连续。 |
| `page_first` | token → layer → 向量；若干 token 构成一页 | 页内汇集所有层，适合按页提交给外部后端 | 取某一层的多个 token 是跨步访问；GPU 辅助传输 kernel 与直接 memcpy 的路径不同。 |
| `page_first_direct` | page → layer → 页内 token → 向量 | 整页连续，同时每个 page-layer 的 token 连续 | 适配受支持的 direct 传输路径；不同页仍可能分散，不能理解成所有层一次连续拷贝。 |

依据：[MHA host pool](https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/mem_cache/pool_host/mha.py) 的 `init_kv_buffer`、`load_to_device_per_layer`、`get_page_buffer_meta`；[MLA host pool](https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/mem_cache/pool_host/mla.py) 对应路径。源码还包含适用于特定按 head 拆分传输的 `page_head`，宜作为部署深入项，而非第一屏再增加一种无上下文选项。

## 建议的交互，沿用现有工作台

1. 从树中选一个真实 token 页，Layout 视图追踪同一页，不再另起 P0/P1/P2 的无关示例。
2. 保留逻辑坐标，再增加一维物理地址带。选择“恢复第 2 层”时，高亮所需 token 对应的连续地址段；选择“向后端写一整页”时，高亮跨层数据。
3. 在三种 host layout 间切换，数据身份、字节总量不变；改变的是跨度、片段数量、需要的拼装及受支持的 I/O 路径。
4. 显示“需要多少段地址 / 是否额外打包 / 已传输多少字节”，不把地址段数当成系统调用次数，不由段数直接推算加速倍数。
5. 再补计算与传输的逐层时间线：本层数据完成后才能计算，下一层可以预取。让用户改变搬运 / 计算相对耗时，观察等待是否暴露。参数必须标明为教学输入。
6. 存储后端的对齐、注册内存、散布聚集能力作为约束说明。SSD、网络存储和 RDMA 后端并不等价，所谓 zero-copy 也不表示没有设备间搬运。

[官方设计文档](https://docs.sglang.io/docs/advanced_features/hicache_design)解释了按层计算、页布局、传输 kernel 与逐层重叠。具体可用组合应以选定 host pool 和设备实现为准。

## 验收边界

- 保持当前 token 请求队列、分叉树与三层存储同一画布，不重新拆成独立场景页。
- 先修 P0 的状态准确性，再做 Layout，之后补并发请求和策略；不靠更多静态术语卡片填充内容。
- 索引拆分零 KV 搬运；所有源地址在提交时有效；完成前不可读；GPU / host 保护独立；删除节点后的 L3 查询可重新发现历史。
- Layout 模型验证相同逻辑单元恰好出现一次、切换保持总字节数，地址高亮符合各布局真实 stride。图中片段、请求字节和完成字节各有明确口径。
- 现有固定 1 MiB / 页仅为教学量。后续资源成本应由模型维度 / dtype 推导或明确使用归一化单位。
