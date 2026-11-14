# Mooncake L3 — research and claim ledger

Researched 2026-11-14 against the sources below. Claim IDs are referenced by
`run.json` and the model check.

## Identity

- Subject: **Mooncake** (Moonshot AI + Tsinghua), the KVCache-centric serving platform
  for Kimi. Repo `kvcache-ai/Mooncake`; paper arXiv 2407.00079v3 and the FAST'25
  version ("Trading More Storage for Less Computation").
- Role modeled here: **L3 tier of SGLang HiCache**. SGLang names GPU memory L1, host
  memory L2, and distributed storage L3; Mooncake Store is an L3 backend.
  Locator: SGLang docs, "HiCache System Design and Optimization", §Why and What is
  HiCache / §Tier Sharing Scope; Mooncake docs, "Mooncake x SGLang Integration".
  URL: https://docs.sglang.io/docs/advanced_features/hicache_design.md ,
  https://kvcache-ai.github.io/Mooncake/deployment/integrations/sglang/index.html

## Claims

### C1 — Tier scope: L1/L2 are instance-private, L3 is the only cross-instance tier
- Source: SGLang HiCache design doc, table "Tier Sharing Scope": L1 GPU = one
  instance; L2 host = one instance, its own node, not shared; L3 = whatever the
  backend spans. Also: "HiCache cannot pool the host memory of several machines into
  one larger L2 ... Cross-instance reuse is the job of L3."
- Boundary: scope depends on backend configuration; a `file` backend is node-local
  unless the path is shared. Modeled as `mode=instance` vs `mode=cluster`.

### C2 — L3 hit path: local match → backend query → prefetch → load → suffix prefill
- Source: same doc, §Overall Workflow, §Local Match, §Prefetch from L3.
  Prefetch triggers only when the L3 hit run exceeds a threshold, default **256
  tokens**; strategies `best_effort`, `wait_complete`, `timeout`; timeout =
  `min(max, base + per_ki_token * tokens/1024)` with defaults 2 s / 0.1 s / 30 s.
- Model consequence: `LOOKUP_TOKENS_THRESHOLD = 256`; section 1 counts a pool hit only
  for complete pages; section 3 compares the fundamental break-even with the
  conservative default.
- Boundary: the chapter models one metadata query per request, which is the
  documented continuous-run query, not a query per page.

### C3 — Object identity: content-addressed page objects
- Source: paper §3 Figure 3: "Each block is attached with a hash value determined by
  both its own hash and its prefix for deduplication." SGLang HiCache doc §External KV
  Router Integration: "the exact object keys the backend uses, which for Mooncake is
  `{key_prefix}_{page_hash}{suffix}`", suffix from pool layout (`all_pages`,
  `trailing_pages`), and a per-`pp_rank` suffix under pipeline parallelism.
- Model consequence: key = model/pool prefix + chained page hash + layout suffix;
  identical tokens at the same prefix position map to the same object regardless of
  which instance computed them. That is why a page computed on node A can be read by
  node B (section 1's shared system page).
- Boundary: the UI prints an abbreviated teaching key, not a real hash.

### C4 — Master holds metadata only; clients hold the data segments
- Source: Mooncake Store design doc: "The Master Service does not take over any data
  flow, only providing corresponding metadata information." Master allocates space
  (`PutStart`/`PutEnd`), keeps replica lists (`GetReplicaList`), handles joins/leaves
  and heartbeats. Each Client both issues requests and hosts a registered memory
  segment; `global_segment_size=0` = pure client, `local_buffer_size=0` = pure server.
  Data moves client→client, bypassing the master.
- URL: https://kvcache-ai.github.io/Mooncake/design/store/mooncake-store.html
- Model consequence: query cost is a metadata round trip; bytes moved are proportional
  to page size, independent of master. Section 2 draws master and segments as separate
  paths.

### C5 — Zero-copy RDMA via Transfer Engine; measured bandwidth
- Source: Transfer Engine section of the Mooncake README: 40 GB (≈128k tokens,
  LLaMA3-70B KV) transferred at up to **87 GB/s** on 4×200 Gbps and **190 GB/s** on
  8×400 Gbps RoCE, "about 2.4x and 4.6x faster than TCP"; multi-NIC aggregation,
  topology-aware path selection, automatic alternate path on failure.
- Store doc: "zero-copy, bandwidth-saturating transfers ... bypassing every CPU stage"
  (paraphrase of the zero-copy bullet).
- Model consequence: `FABRIC_GBPS = 190` default; TCP 12.5 GB/s (100GbE) used as a
  contrast preset; 10GbE 1.25 GB/s used as the failure preset.

### C6 — The 40 GB / 128k reference fixes the per-token KV size
- Source: README Transfer Engine paragraph, above.
- Arithmetic: 80 layers × 8 KV heads × 128 head dim × 2 (K,V) × 2 B = 327,680 B/token;
  ×131,072 tokens = 40 GiB. Chapter uses this verified anchor rather than a named
  model's config.
- Model: `KV_BYTES_PER_TOKEN = 327680`, page 64 tokens = 20 MiB.

### C7 — Capacity drives hit rate, with diminishing returns, and blocks are skewed
- Source: paper §4.2 Table 1 (LRU): 1,000 blocks 0.30, 10,000 0.40, 30,000 0.48,
  50,000 0.50, 100,000 0.51, unbounded 0.51; trace of 23,608 requests, avg input
  7,590 / output 182, block 512. Also: "over 50% of cache blocks remain unused while
  certain blocks are accessed tens of thousands of times", which motivates replication.
- Model consequence: pool size slider changes hit rate and eviction; section 3 notes
  diminishing returns and replication of hot objects.
- Boundary: measured on one 1-hour sampled trace; not a law for every workload.

### C8 — Multi-turn benchmark: L2-only decays, L3 holds; early rounds L2 slightly faster
- Source: Mooncake docs, "SGLang HiCache x Mooncake Store Performance": 8×H800,
  Qwen3-235B-A22B, 2048-token requests, 80 clients, 10 rounds, output length 1;
  `+L2` = 30 GB/rank × 8 = 240 GB; pool 760 GB. Reported: first three rounds `+L2`
  and `+Mooncake` have the same hit rate and `+L2` is slightly faster (no remote
  fetch); as rounds grow and KV exceeds L2, `+L2` hit rate falls and TTFT rises while
  Mooncake stays high; "populated Mooncake" best overall.
- Model consequence: section 1's trace is engineered to show the same shape (equal while
  the working set fits, divergence after host capacity), with scaled capacities. The
  trace also differs in two deliberate ways that the page states: round 1 differs
  because the shared page is computed once for the cluster, and the sharp round-5 drop
  is a load-balanced move that pushes the moved prefix out of the target instance's
  L2; later rounds show the ordinary capacity decay.
- Boundary: shape is reproduced, not the benchmark's numeric TTFT/hit values.

### C9 — Storage-eviction and liveness machinery
- Source: Store design doc §Eviction Policy (trigger at 90% high watermark, free ~5%
  by default; lease-protected objects are not removed), §Lease (default 10 s TTL;
  a Get whose lease expires fails rather than returning partial data), §Soft Pin
  (default 30 min; protects prompts; evictable only when nothing else is), §Multi-layer
  storage (RAM → SSD offload).
- Model: `LEASE_S = 10`, eviction in the pool uses LRU on unpinned objects, and the
  SSD preset in section 3 is the multi-layer case.
- Boundary: section 2 shows the lease as a read-protection window; it does not model
  lease expiry races.

### C10 — Tradeoff framing: storage for compute, and the TTFT constraint
- Source: paper title and §1.1: reuse reduces computation but "reusing KVCache from a
  remote location will prolong the TTFT"; Conductor balances reuse, load and TTFT SLO,
  replicates hot blocks, swaps cold ones.
- Model: the break-even formula and the "L3 loses" verdict implement exactly this
  tension; section 1's estimate labels queueing as excluded.

## Simplifications and limits (stated on the page where used)

- Times are analytical readout, not measured TTFT: one metadata query per request,
  serial fetch+load, no batching, no queueing, no overlap of L2→GPU load with compute
  (HiCache does overlap; Radix HiCache owns that mechanism).
- Capacities are scaled teaching sizes that preserve the 240 GB : 760 GB ratio.
- SSD tier is modeled by its streaming bandwidth only; no per-object latency tail,
  prefetch-on-exist, or NVMe queueing.
- Replication appears as a concept in the economics section; the trace uses one copy.
- The master is assumed responsive; no HA/etcd or master-contention model.

### C11 — Mooncake is a KVCache-centric disaggregated serving architecture
- Source: paper (arXiv 2407.00079v3) Abstract and §1.1; §3 Overview.
- Content: prefill and decoding clusters are separated; the cluster's CPU/DRAM/SSD/RDMA form a
  disaggregated KVCache pool; Conductor selects a prefill and a decoding instance per request and
  schedules reuse, replication and swapping. The paper's goal is effective throughput under
  TTFT/TBT SLOs, including overload.
- Model: section 1's Conductor/prefill/decode/pool canvas; placement preference changes the
  chosen prefill group and predicted TTFT.
- Boundary: paper architecture (2024); the open-source stack has evolved (C13).

### C12 — Prefill pool: chunked pipeline parallelism and layer-wise prefill; decode: continuous batching
- Source: paper §5.1 (CPP), §5.2 (layer-wise prefill), §2/§3 (decode batching).
- Content: chunks no longer than `prefill_chunk` are processed by different nodes in a pipeline,
  with cross-node communication only at stage boundaries; chunking also enables layer-wise KV
  load/store overlapped with compute, reducing VRAM occupation S*T. Decode aggregates tokens in a
  continuous batch under the TBT SLO.
- Model: `serving.js` stages = ceil(chunks / prefill nodes), chunk = 1,024 tokens, layer-wise
  movement described on the same request walk.
- Boundary: the page shows the pipeline at chunk granularity, not a node-level timeline.

### C13 — Current open-source Conductor is a prefix index for routers; Store/TE are the data plane
- Source: Mooncake architecture doc ("Conductor: cache-aware routing") and Conductor doc
  (https://kvcache-ai.github.io/Mooncake/design/conductor/index.html): it subscribes to KV events
  and answers longest-reusable-prefix queries; the architecture doc states Mooncake sits beneath
  vLLM/SGLang rather than replacing their scheduling.
- Content: the page says the paper's Conductor scheduled requests, while today's Conductor provides
  the global index and the router/engine places the request.
- Boundary: the chapter does not claim the current Conductor performs early rejection.

### C14 — Reported results
- Source: paper Abstract and §8.
- Content: up to 525% throughput improvement in simulated long-context scenarios under SLOs;
  about 75% more requests on the real workload.
- Boundary: values depend on workload, hardware and SLO; the page states this and points to §8.

### C15 — Control/data-plane interfaces and payloads
- Source: paper §3 (overview and request workflow), §5.1 (prefill groups), §6.1 (Conductor selection).
- Content (re-checked against arXiv 2407.00079v3 on 2026-11-14): Conductor selects a prefill
  group and a decode instance; the prefill request carries the raw input, the prefix-cache block IDs
  and the full-cache block IDs; prefill loads the prefix, computes the missing prefix in chunks, and
  streams the produced KV to the decode instance; decode's local scheduler double-checks the TBT SLO
  and may still reject, wasting the prefill work.
- Model: section 1's interface labels (`placement + block IDs`, `layer-wise prefix load`,
  `layer-wise KV stream`) and the request state machine.
- Boundary: the paper calls the transfer service Messenger; the open-source implementation is Transfer
  Engine. In the current stack a router/engine places requests using Conductor's prefix index (C13);
  the page does not claim the paper's scheduler is still the deployed one, and §2 states the rename.

### C16 — The rejected design alternative
- Source: paper §5 (design rationale) and the discussion comparing monolithic serving and chunked
  prefill inside decode: online SLOs are tighter, chunked prefill still struggles to maximize prefill
  MFU while meeting TBT, and long context needs cross-node prefill parallelism.
- Model: section 1's design-alternative note (monolithic vs chunked-in-decode vs disaggregated) and
  the stated price: cross-node KV movement and harder scheduling.
- Boundary: the comparison is qualitative; no benchmark is claimed for the alternatives here.


### C17 — Code spot-check of the open-source stack
- Revision: `kvcache-ai/Mooncake` at `504f2ae` (main, cloned 2026-11-14, sparse checkout of
  `mooncake-conductor`, `mooncake-store`, `mooncake-transfer-engine`).
- Facts checked: `mooncake-conductor/include/conductor/prefixindex/prefix_indexer.h` and
  `client/types.h` expose a prefix index / `longest_match_tokens`; there is no scheduler or prefill
  pool source tree (the full `ls-tree` contains only docs for disagg prefill). `mooncake-store/include/
  master_client.h` defines `PutStart`/`PutEnd` and `lease.h` a read lease; the master service owns
  allocation/metadata. `mooncake-transfer-engine/include/topology.h` and `multi_transport.h`
  (`selectTransport`) implement topology-aware transport selection.
- Teaching mapping: the evolution note now says the paper's Conductor scheduler and CPP prefill pool
  have no source tree in the open repo; only the prefix index, TE, Store and PG/EP are open.
- Boundary: this is a spot-check of the named files, not a line-by-line trace of the page's
  pseudocode; the page's store steps are a teaching simplification.


### C18 — Evidence level per section after the source-first rule
- §1 is the paper's design: the repo at `504f2ae` has no Conductor scheduler or CPP prefill source,
  so the paper (v3 §1.1/§3/§5/§6/§7) is the strongest available evidence and the page says so.
- §2 follows the pinned source: `GetReplicaList` returns replica descriptors and a lease TTL,
  `PutStart`/`PutEnd` complete an object, and Transfer Engine performs the direct read.
- §3's tier trace and §4's budgets remain teaching models; the page labels the trace and the readout
  assumptions.


### C19 — Today's stack strip
- Revision: `kvcache-ai/Mooncake@504f2ae`.
- Depiction: a router (vLLM/SGLang) asks the Conductor's prefix index and picks an engine; engines
  run prefill/decode; Transfer Engine moves data; Store holds shared KV; PG/EP provide elastic
  execution. Source files: `mooncake-conductor/include/conductor/prefixindex`, `mooncake-store/include/
  master_client.h`, `mooncake-transfer-engine/include/topology.h`.
- Boundary: component-level; the exact routing call belongs to the engine integration.


### C20 — Final architecture view (supersedes C15/C16 paper framing)
- The page draws only the implemented stack at `504f2ae`: router -> prefix-index Conductor ->
  engine, with TE/Store/PG/EP. The paper's Conductor scheduler and CPP prefill pool are a boundary
  note, not a canvas.
- The four-lens paper model, its tests and its share config were removed; section 1 is static.
- Reason: the system has an implementation, so the architecture view must be that implementation.
