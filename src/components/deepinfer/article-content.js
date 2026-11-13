export const article = {
  zh: {
    meta: {
      title: 'DeepInfer：从专家计算到推理服务',
      subtitle: '并行布局、融合内核、缓存与调度如何共同决定推理效率',
      lead: '大模型推理的难点，不只是把一次前向算得更快。长输入需要尽快完成首轮计算，生成中的请求又要求稳定出字；同一批设备还要承受并发和上下文长度的变化。DeepInfer 的设计围绕这些差异展开：分别组织 Prefill 和 Decode，在生成侧扩大专家并行，再用内核、缓存和负载调度把这套布局运行起来。'
    },
    sections: [
      {
        id: 'topology',
        title: '01 · 两种负载，两种并行布局',
        intro: 'Prefill 一次处理一段输入；Decode 每轮只推进少量新 Token。两者执行同一个模型，却很难共用一个最优配置。',
        paragraphs: [
          'Prefill 的输入矩阵已有较多 Token，专家计算更容易形成较大的批量。此时过度扩大并行组，会增加跨卡协作的范围。官方 V4.1 Flash 部署因此选用显存容得下的最小 EP/DP 规模，通常为 2–8。Decode 则相反：单个请求每轮贡献的 Token 很少，需要汇集更多请求，才能提高专家矩阵乘的效率；其推荐规模是同一高速通信域内的 EP64–128。',
          '这里的 DP 和 EP 不是两套互斥方案。Attention 使用数据并行：各 rank 处理自己的请求、读取相应的 KV。进入 MoE 层后，路由器选择专家，Token 被发送到持有专家的 rank；专家计算结束，再将结果送回原请求所在的 rank。官方配置中 DP 数与 EP 数相同，层与层之间反复进行这次组织方式的切换。',
          'P/D 分离把这两种布局放进独立的资源池。Prefill 产出的块 KV 和序列状态交给 Decode，后者继续生成。这样可以分别调整输入处理能力与生成能力，而不必让长输入和生成请求竞争同一套批量、并行规模与扩缩容策略。'
        ],
        rows: {
          headers: ['阶段', '主要工作', '官方部署选择'],
          rows: [
            ['Prefill', '并行处理未命中的输入 Token，构建后续生成所需状态', 'EP2–8 / DP2–8，取 HBM 容许的较小规模'],
            ['Decode', '持续读取历史，每轮推进各请求的生成', 'EP64–128 / DP64–128，使用高速通信域'],
            ['Attention → MoE', '本地请求历史 → 跨卡专家执行 → 返回本地请求', 'Attention DP 与 MoE EP 配合']
          ]
        },
        takeaway: '问题于是落在生成侧：更大的专家并行组，究竟改变了哪部分工作？',
        experiment: '请求、状态与 P/D 资源的关系'
      },
      {
        id: 'experts',
        title: '02 · Wide-EP：让专家权重服务更大的批量',
        intro: '扩大 EP 的直接收益，是把分散在多个独立组里的专家批量汇到一起，减少重复读取权重。',
        paragraphs: [
          '一个 MoE 层包含多份专家权重。每个 EP 组都要持有完整的逻辑专家集合，再把专家分布到组内各卡。同样的总卡数下，小 EP 意味着更多独立组：不同组会各自读取同一个逻辑专家的权重。合并成宽组后，一份专家权重能接收更多请求的 Token，跨组重复读取随之减少。',
          '对专家 GEMM 而言，m 是送到该专家的 Token 行数，k 是输入特征维度，n 是输出特征维度。Wide-EP 增大的主要是 m，专家本身的 k、n 没有因此缩小。权重加载可在更多 Token 上复用，矩阵乘也更容易用满计算单元；总 Token–专家计算次数仍由路由决定。下面固定八张卡和同一批 Token，比较四个 EP2 组与一个 EP8 组。',
          '收益也有边界。并发很低时，每个专家收到的 Token 仍然稀少，扩大组未必能省下多少重复读取。路由偏斜时，所有 rank 又会等待最忙的专家卡。EPLB 为热门逻辑专家保留多个物理副本，依据近期计数周期性调整放置，并通过组内高速互联搬运权重。副本缓解尾部，却占用额外显存；宽组需要足够负载、快速通信和负载均衡同时成立。'
        ],
        takeaway: '更多 Token 汇到同一组，也带来了更重的分发和回传任务。下一层优化必须处理这部分通信。',
        experiment: '固定卡数，比较专家批量、权重读取与热点副本'
      },
      {
        id: 'kernel',
        title: '03 · Mega MoE：按数据就绪推进计算',
        intro: 'MoE 的路径是路由、分发、专家计算、合并。只优化矩阵乘，仍可能把时间留在阶段边界上。',
        paragraphs: [
          '分发把 Token 的输入表示送到目标专家；专家依次执行两次矩阵乘和中间的 SwiGLU 激活；合并再归约各路由结果并送回来源 rank。如果计算要等整批分发结束、回传又要等整批计算结束，通信链路和计算单元就会轮流空闲。DeepInfer 的分离算子路径已有异步通信；Mega MoE 进一步把这些操作组织进一个融合内核，以更细的数据块衔接生产者与消费者。',
          '一个块的输入就绪后，相应专家计算即可推进；算完的块可以回传，同时处理后续块。图中的同一批 Token 被划成 A、B、C，单块仍遵守分发、计算、合并的依赖，不同块则能占用通信和计算资源并行前进。改变的是执行的关键路径，而不是路由结果或专家数学运算。',
          '这种组织依赖高速 scale-up 互联和相应的内存布局。固定版本的实现仍有对称内存缓冲、专家输入、环形中间缓冲与合并结果；远端结果仍需经 NVLink 写回。融合并不等于把中间状态全部留在片上，也不会消除专家权重访存。收益要结合批量、精度和硬件测量，不能从示意时间轴直接读取加速倍率。'
        ],
        rows: {headers:['操作','读入 → 产出','衔接条件'],rows:[['Dispatch','来源 rank 的 Token 表示 → 专家输入缓冲','目标块到齐后可启动相应计算'],['GEMM1 / SwiGLU / GEMM2','专家输入与权重 → 中间激活 → 专家输出','块内依赖顺序保持不变'],['Combine','专家输出 → 来源 rank 的加权合并结果','已完成块先回传，后续块继续计算']]},
        takeaway: '内核解决一次执行的效率；长会话反复提交相同历史，则需要在执行之前减少工作量。',
        experiment: '同批数据的整批等待与按块流水'
      },
      {
        id: 'cache',
        title: '04 · 共享缓存：复用历史，也释放路由选择',
        intro: '历史 KV 若只留在某台计算机器上，缓存命中和负载均衡就可能互相牵制。',
        paragraphs: [
          'DeepInfer 的生产系统把持久块 KV 放在独立 3FS 存储集群。入口先按哈希链匹配前缀，再选择有剩余计算配额的 Prefill 引擎。因为每个引擎都能读取同一段缓存，路由无需优先返回上次处理请求的机器；存储与计算也能分别扩容。命中越长，需要补算的输入越少，但读取和传输并未消失。',
          '实际路径分三步：元数据匹配必须在路由前完成；独立进程异步把块 KV 取到主机共享内存；引擎内线程再逐层装入 HBM，与前向计算交叠。细粒度 KV 拷贝使用 GDR，由 RDMA 网卡搬运，以避免占用 SM。SWA 状态走另一条存储路径：它留在产生该状态的机器主机内存中，由目录定位，跨机命中时经网络取回。',
          '模型结构进一步影响复用边界。V4.1 CED 的解码器层复用编码器侧投影的块 KV，仍需恢复自己的 SWA 状态；系统用末尾 128 Token 的有界重放近似重建，避免完整运行长历史。块 KV 与 SWA 因而不能画成一份可以整体读回的缓存。这里保留接口关系，具体缓存所有权和重放过程由 CED 章节展开。'
        ],
        rows: {
          headers: ['状态', '保存位置', '恢复方式'],
          rows: [
            ['持久块 KV（含索引器 K）', '独立 3FS 存储集群', '按前缀匹配，异步读取并逐层装入'],
            ['需要保留的 SWA 窗口', '产生状态的机器主机内存', '目录定位，必要时跨机取回'],
            ['未保存的解码器 SWA', '不进入持久前缀缓存', '有界重放重建，供后续 Decode 使用']
          ]
        },
        takeaway: '共享可达性使请求能按负载路由；接下来还要定义，什么才算两台引擎负载相当。',
        experiment: '匹配前缀、读取历史与补算后缀'
      },
      {
        id: 'scheduling',
        title: '05 · 负载调度：按计算成本分配工作',
        intro: '请求数相同不等于负载相同：输入长度、已命中前缀和正在读取的历史都会改变执行时间。',
        paragraphs: [
          'Prefill 先按总上下文长度分桶，依据各桶的计算配额需求分配引擎。引擎按剩余 quota 拉取工作，组内请求也分给当前 quota 最低的 rank。到单卡层面，每步先给定时间预算，再用拟合的二次成本模型，根据已计算前缀长度和本轮输入长度求出可处理的最大 chunk；DP 组内通过 all-reduce MIN 收紧预算，减少慢 rank 拖住整组的情况。',
          'Decode 同时平衡两个量：请求数决定本轮批量，KV 总长度影响 Attention 成本。因此只有“最少请求”一个指标并不够；少量长会话也可能比许多短会话更重。部署层还分别用未命中 Token 需求调整 Prefill，用运行请求数调整 Decode。资源池拆开后，调度才能利用前面不同的并行布局。',
          '引擎内部再把 CPU 与设备时间交叠。上一轮采样结果已经在设备上，下一轮前向可以继续使用；CPU 的请求状态更新不必成为每轮设备执行前的屏障。异步调度提前准备批次，同时保留采样到下一轮前向的自回归依赖。它压缩的是主机空隙，不能替代模型计算、通信或缓存命中带来的改进。'
        ],
        takeaway: '这些机制决定线上服务能接近多少离线性能，而不是让每个局部优化的倍率简单相乘。',
        experiment: '引擎内 CPU/GPU 交叠'
      },
      {
        id: 'results',
        title: '06 · 从离线吞吐到线上成本',
        intro: '评价整套系统，要固定用户得到的服务：首字等待、持续出字速度、输入结构和输出质量。',
        paragraphs: [
          '官方 Wide-EP 曲线同时给出单用户速度与每 GPU 输出吞吐。增加并发通常能提高吞吐，也可能降低单用户速度，因此应在相同速度要求附近比较 EP 配置。该图固定上下文为 131,072，nextn 为 3、接受率为 75%；点上标注的是每 rank 请求数。曲线支持这些条件下的比较，不能被替换成演示中的理想权重读取比例。',
          '官方报告的单集群每日 155T Token、谷价下每 GPU 每小时 38 美元收入，来自完整生产服务。公开仓库提供离线核心引擎，跨副本负载均衡、完整 KV 服务与分离部署仍需集成。要复现单位成本，除引擎外还要计入存储、网络、备用容量与真实需求，收入本身也不足以确定利润和设备回收期。',
          'DeepInfer 的效率来自一条相互约束的链路：P/D 选择适合负载的并行布局，Wide-EP 汇集专家批量，融合内核处理通信衔接，缓存减少重复 Prefill，调度把工作均匀送入设备。负载过低、命中过少或互联变慢，都可能使其中一环失效。只有整条链路满足延迟目标，更多硬件吞吐才会变成更多可交付的服务。'
        ],
        takeaway: '本文的示意实验用于检查机制；官方曲线用于核对带有明确条件的性能结果。',
        experiment: '官方 Wide-EP 曲线与部署条件'
      }
    ]
  },
  en: {
    meta: {
      title: 'DeepInfer: from expert execution to a serving system',
      subtitle: 'How parallelism, fused kernels, caching and scheduling determine inference efficiency',
      lead: 'Inference efficiency involves more than accelerating one forward pass. Long inputs need prompt processing while ongoing requests need steady output, and both concurrency and context length change over time. DeepInfer organizes Prefill and Decode separately, widens expert parallelism during generation, then uses kernels, caching and load scheduling to make that layout effective.'
    },
    sections: [
      {
        id: 'topology',
        title: '01 · Different workloads, different parallel layouts',
        intro: 'Prefill processes an input segment in parallel. Decode advances each request by a small number of tokens per round. The model is shared; the best execution configuration often is not.',
        paragraphs: [
          'Prefill already supplies many token rows to expert computation. Expanding the group further increases the scope of cross-rank coordination. The official V4.1 Flash deployment therefore uses the smallest EP/DP configuration that fits in HBM, typically 2–8. Decode has the opposite problem: individual requests supply few tokens per round, so more requests must be gathered to form efficient expert GEMMs. Its recommended configuration is EP64–128 within a fast communication domain.',
          'DP and EP cooperate rather than compete. Attention is data-parallel: each rank processes its own requests and reads their KV. In a MoE layer, the router chooses experts and dispatches token representations to the ranks holding those experts. Results return to the original request ranks. Official configurations use equal DP and EP sizes; execution repeatedly switches between local request processing and distributed expert processing.',
          'P/D disaggregation places these layouts in separate resource pools. Prefill transfers block KV and sequence state to Decode, which continues generation. Input processing and generation can then use different batch sizes, parallel widths and scaling policies instead of competing under one configuration.'
        ],
        rows: {
          headers: ['Stage', 'Main work', 'Official deployment choice'],
          rows: [
            ['Prefill', 'Process uncached input and build state for generation', 'EP2–8 / DP2–8; smaller groups allowed by HBM'],
            ['Decode', 'Read history and repeatedly advance ongoing requests', 'EP64–128 / DP64–128 within a fast communication domain'],
            ['Attention → MoE', 'Local request history → distributed experts → return to local requests', 'Attention DP cooperates with MoE EP']
          ]
        },
        takeaway: 'The next question is what a wider expert group actually changes during generation.',
        experiment: 'Requests, state and the P/D resource pools'
      },
      {
        id: 'experts',
        title: '02 · Wide-EP: reuse expert weights across larger batches',
        intro: 'Widening EP gathers work that would otherwise run in independent groups, reducing duplicate expert-weight reads.',
        paragraphs: [
          'Every EP group holds a complete logical expert set, partitioned across its ranks. With the total rank count fixed, smaller EP means more independent groups, each reading weights for the same logical experts. A wider group lets one expert-weight copy serve tokens from more requests, reducing repetition across groups.',
          'For an expert GEMM, m is the number of token rows reaching that expert, k is its input feature dimension and n is its output feature dimension. Wide-EP primarily increases m; it does not shrink the expert’s k or n. More token rows reuse each weight load and can improve compute utilization. Routing still determines the total token–expert work. The experiment keeps eight ranks and the input tokens fixed while comparing four EP2 groups with one EP8 group.',
          'At low concurrency, expert batches remain small and widening the group may eliminate few repeated reads. Skewed routing also makes the group wait for its busiest expert rank. EPLB maintains physical replicas of hot logical experts, periodically adjusts placement using recent counts and moves weights over the group’s fast interconnect. Replicas reduce the tail but consume extra memory. Adequate demand, fast communication and balanced placement are all necessary.'
        ],
        takeaway: 'Gathering more tokens also creates dispatch and return traffic. The next optimization addresses that communication path.',
        experiment: 'Fixed ranks: expert batches, weight reads and hot-expert replicas'
      },
      {
        id: 'kernel',
        title: '03 · Mega MoE: progress as data becomes ready',
        intro: 'MoE execution routes, dispatches, computes and combines. Faster GEMMs alone can leave substantial time at stage boundaries.',
        paragraphs: [
          'Dispatch sends input representations to selected experts. Expert computation runs two GEMMs with a SwiGLU activation between them. Combine reduces routed results and returns them to their source ranks. Whole-batch barriers can leave communication and computation resources idle in turn. DeepInfer’s separate-operator path already uses asynchronous communication; Mega MoE further organizes these operations in one fused kernel with finer blocks connecting producers and consumers.',
          'An expert can process a block once its input is ready, and a completed block can return while later blocks compute. The diagram partitions the same token batch into A, B and C. Each block retains dispatch → compute → combine dependencies, while different blocks can progress concurrently on communication and computation resources. The execution critical path changes; routing and expert arithmetic do not.',
          'This organization depends on fast scale-up links and compatible memory layouts. The pinned implementation still contains symmetric buffers, expert inputs, intermediate ring buffers and combine outputs. Remote results still travel over NVLink. Fusion does not keep every intermediate on chip or remove weight traffic. Its benefit must be measured for the actual batch, precision and hardware rather than read as a speedup from an illustrative timeline.'
        ],
        rows: {headers:['Operation','Input → output','Dependency'],rows:[['Dispatch','Source-rank token representations → expert input buffers','Computation can proceed once its input block is ready'],['GEMM1 / SwiGLU / GEMM2','Expert inputs and weights → activation → expert outputs','Preserve dependencies within each block'],['Combine','Expert outputs → weighted results on source ranks','Return completed blocks while later blocks compute']]},
        takeaway: 'Kernels improve the work being executed. Repeated long histories also offer an opportunity to avoid work before execution begins.',
        experiment: 'Whole-batch waiting versus a block pipeline on the same input'
      },
      {
        id: 'cache',
        title: '04 · Shared caching also frees the routing decision',
        intro: 'Keeping history only on its original compute machine can put prefix reuse in conflict with load balancing.',
        paragraphs: [
          'The production system stores persistent block KV in a dedicated 3FS cluster. The entrypoint matches the prefix through a hash chain, then routes to a Prefill engine with remaining compute quota. Any engine can fetch the same history, so routing need not return to the previous machine for prefix affinity. Storage and compute can scale independently. Longer hits reduce uncached input, although fetching and transfer remain necessary.',
          'The path has three stages: metadata matching must complete before routing; a separate process asynchronously fetches block KV into host shared memory; an engine thread loads it into HBM layer by layer, overlapping transfers with forward execution. Fine-grained KV copies use GDR and an RDMA NIC to avoid consuming SMs. SWA takes a different storage path: it remains in the producing machine’s host memory, is located through a directory and is fetched over the network for a cross-machine hit.',
          'Model architecture further constrains reuse. V4.1 CED decoder layers reuse block KV projected on the encoder side but still need their own SWA state. Bounded replay approximately reconstructs that state from the final 128 tokens instead of running the full history. Block KV and SWA therefore cannot be treated as one cache object that is restored wholesale. The CED chapter develops ownership and replay beyond this interface.'
        ],
        rows: {
          headers: ['State', 'Storage', 'Recovery'],
          rows: [
            ['Persistent block KV, including indexer K', 'Dedicated 3FS storage cluster', 'Prefix match, asynchronous fetch and per-layer load'],
            ['Retained SWA window', 'Producing machine’s host memory', 'Directory lookup and remote fetch when needed'],
            ['Unstored decoder SWA', 'Not in persistent prefix cache', 'Bounded replay for subsequent Decode']
          ]
        },
        takeaway: 'Shared access enables routing by load. The scheduler must still define what equivalent load means.',
        experiment: 'Prefix matching, fetching history and computing the suffix'
      },
      {
        id: 'scheduling',
        title: '05 · Schedule computation cost, not just request count',
        intro: 'Equal request counts need not mean equal load: input length, matched prefixes and retained history all affect execution time.',
        paragraphs: [
          'Prefill buckets requests by total context length and assigns engines according to compute-quota demand. Engines pull work using remaining quota, and requests within a group go to the rank with the lowest quota load. At the GPU level, each step has a time budget. A fitted quadratic cost model uses the computed prefix and proposed input length to solve for the largest admissible chunk. An all-reduce MIN further tightens the group’s budget to limit slow-rank effects.',
          'Decode balances two quantities: request count determines step batch size, while total KV length affects Attention cost. Routing solely to the rank with the fewest requests misses that distinction; a few long conversations can outweigh many short ones. Deployment scaling likewise uses uncached-token demand for Prefill and running-request count for Decode. Separate pools let scheduling exploit their different parallel layouts.',
          'Inside an engine, CPU work can overlap device execution. Once the previous sample is on the device, the next forward pass can use it without waiting for CPU request-state updates to become a per-round barrier. Asynchronous scheduling prepares batches ahead while retaining the autoregressive sample-to-next-forward dependency. It reduces host gaps; it does not replace improvements in model computation, communication or cache reuse.'
        ],
        takeaway: 'These mechanisms determine how much offline efficiency survives online. Their individual gains cannot simply be multiplied.',
        experiment: 'CPU/device overlap inside an engine'
      },
      {
        id: 'results',
        title: '06 · From offline throughput to serving cost',
        intro: 'A system comparison must hold the user’s service requirement fixed: first-token delay, generation speed, input structure and output quality.',
        paragraphs: [
          'The official Wide-EP curves report both per-user speed and output throughput per GPU. Higher concurrency can improve aggregate throughput while slowing each user, so compare configurations near the same speed target. The plot fixes context length at 131,072, nextn at 3 and acceptance at 75%; point labels indicate requests per rank. It supports comparisons under those conditions, not substitution of the experiment’s ideal weight-read ratios for measured performance.',
          'The reported 155T tokens per cluster-day and $38 revenue per GPU-hour at valley prices describe the complete production service. The public repository provides an offline core engine; replica load balancing, the full KV service and disaggregated deployment still require integration. Reproducing unit cost therefore requires storage, networking, reserve capacity and actual demand as well as the engine. Revenue alone does not determine profit or equipment payback.',
          'The efficiency argument is a chain: P/D layouts suit different workloads, Wide-EP gathers expert batches, fused kernels manage communication boundaries, caches avoid repeated Prefill, and scheduling distributes the remaining work. Low demand, low reuse or slow interconnect can break individual links. Only when the complete path meets latency requirements does additional hardware throughput become additional deliverable service.'
        ],
        takeaway: 'The experiments check mechanisms; the official curve checks performance under stated deployment conditions.',
        experiment: 'Official Wide-EP curves and deployment conditions'
      }
    ]
  }
};

Object.assign(article.zh, {
  contents: '本章内容',
  entry: '请求入口',
  pRole: '处理未命中输入 · 较小 EP/DP',
  dRole: '持续生成 · Wide-EP',
  kv: '块 KV 与序列状态',
  storage: '共享块 KV · 3FS',
  topologyCaption: 'Attention 按请求分布在各 rank；MoE 按专家分布，层内分发后再合并。P/D 之间传递的是后续生成需要的状态。',
  gemmExplanation: '同一专家的输入按 Token 逐行排列，专家权重在这些行之间复用。扩大批量改变输入的行数，不改变该专家的特征维度。',
  costExplanation: '单位 Token 成本要用同一时间窗口内的总费用，除以满足延迟要求的有效服务量。存储、互联与备用容量也在费用之内。',
  benchmark: '官方 Wide-EP 测试',
  source: '来源与版本',
  expertBatch: '选中专家的输入批量',
  rowsLabel: '当前专家副本收到的 Token',
  expertShapeNote: '输入行数取决于本卡当前专家副本实际收到的 Token，不是单个请求的长度。输入、输出特征维度由专家结构决定；增加行数后，同一组权重可用于更多 Token。'
});

Object.assign(article.en, {
  contents: 'In this chapter',
  entry: 'Request entry',
  pRole: 'Uncached input · smaller EP/DP',
  dRole: 'Ongoing generation · Wide-EP',
  kv: 'Block KV and sequence state',
  storage: 'Shared block KV · 3FS',
  topologyCaption: 'Attention distributes requests across ranks; MoE distributes experts and dispatches then combines within each layer. P/D transfers the state needed for subsequent generation.',
  gemmExplanation: 'Tokens form rows of an expert’s input matrix. Those rows reuse the same expert weights. A larger batch changes the row count, not that expert’s feature dimensions.',
  costExplanation: 'Unit token cost divides total expenditure in one time window by useful volume served within latency requirements. Storage, interconnect and reserve capacity belong in that expenditure.',
  benchmark: 'Official Wide-EP benchmark',
  source: 'Sources and version',
  expertBatch: 'Selected expert’s input batch',
  rowsLabel: 'Tokens reaching this expert copy',
  expertShapeNote: 'The row count is the tokens received by this physical expert copy, not the length of one request. The expert architecture fixes its feature dimensions; more rows reuse the same weights across more tokens.'
});
