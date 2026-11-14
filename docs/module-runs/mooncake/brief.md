# Mooncake L3 — brief

Kind: create (new chapter). Route `#mooncake`, sidebar label `Mooncake L3`.

## Reader question

Every inference instance already has GPU KV and host DRAM KV. Why add a third,
cluster-wide tier — and when does a Mooncake hit actually pay?

A reader should finish able to say:

1. L1 (GPU) and L2 (host) are private to one instance, so cross-instance reuse is
   impossible without L3; the pool also breaks the per-node capacity ceiling.
2. Mooncake serves L3 as a distributed object store: content-addressed page objects,
   a master that holds only metadata, segments contributed by store clients, and
   Transfer Engine RDMA copies that bypass every CPU stage.
3. A hit converts prefill compute into metadata latency plus bytes/bandwidth. It pays
   when the avoided compute exceeds the transfer cost, and it stops paying when the
   fabric (or an SSD tier) delivers a token more slowly than the GPU can compute it.

## Explanatory thesis

The earlier chapters establish prefix reuse and per-instance tiering. What L3 changes
is *who is allowed to hit*. That is a capacity and placement change, not another
algorithm: the same page hash computed on any node becomes reusable by every node.
The price is that reuse becomes a distributed-systems operation — metadata lookup,
object placement, RDMA transfer, replication, eviction — and its economics are a
straight comparison between avoided prefill time and moved bytes.

Testable claim: with a 70B-class dense model (320 KiB/token, 20 MiB per 64-token
page), an RDMA pool at ~190 GB/s saves roughly 10x the prefill time it replaces,
while a 10GbE/TCP path at ~1.25 GB/s is *slower than recomputing*. The boundary is
set by bytes-per-token x (1/fabric + 1/host link) crossing 1/prefill-rate.

## Baseline and counterfactual

- Instance-only (`L1+L2`): pages written by one instance are invisible to another and
  are evicted when host memory fills. The trace in section 1 reproduces this decay:
  rounds 2-4 match the cluster run, the round-5 rebalance makes the moved prefix a
  cross-instance miss, and later rounds expose the private host capacity.
- With L3: the same working set stays resident in the pool and is reachable from any
  instance; the first rounds look identical (both hit), then instance-only falls away.

## First useful view

A three-instance cluster with L1/L2 per instance and one shared pool below. A live
request strip shows each page's source, so the reader sees the shared system page
computed once and then served from the pool to other instances, and sees a
load-balanced request land on a node that never held its prefix.

## Exploration

| Action | Model fact | Visible consequence |
|---|---|---|
| Toggle `L1+L2` / `+ L3 pool` | pages become visible cluster-wide | source badges change, hit-rate curves separate |
| Shrink the pool | LRU evictions inside the pool | pool gauge fills, hit rate drops, recompute grows |
| Play the 8-round trace | request-order state machine | per-round hit rate, pool reads, prefill time |
| Select a page | object record (key, segment, replica) | store inspector + transfer path |
| Step through one L3 hit | local match → query → prefetch → load → compute → write-back | bytes and time per stage |
| Change medium / hit length / prefill rate | cost comparison | break-even length, verdict, chart crossing |

## Chapter ownership

- Owns: the shared L3 tier itself — scope and sharing, object/page model, master vs
  data path, RDMA transfer, capacity/eviction at cluster scope, and the break-even
  economics of a hit.
- Connects, does not re-teach: radix tree matching, page layouts, L2↔GPU load overlap
  and write-back policies (Radix HiCache); KV bytes from attention layout (LLM
  Inference / KV representation); PD disaggregation and Conductor scheduling named as
  the second consumer of the same pool.
- Leaves out: prefill chunked pipeline parallelism internals, early rejection,
  multi-tenant quota, store HA/etcd, TENT.

## Change surface

- New route, icon, label, learning path, share schema, model check.
- `radixcache.next` becomes `mooncake`; reading order gains one chapter in
  Memory & Precision.
- No change to existing chapter models or layouts.

## Capabilities

`timeline` (trace playback in §1, hit steps in §2), `multiple-modes` (instance vs
cluster), `resource-metrics` (bytes, hit rate, prefill time), `data-movement`
(pool→L2→GPU, write-back), `math` (cost and break-even), `structural-comparison`
(store components).

## Defaults

Illustrative model: 70B dense, 80 layers, 8 KV heads, 128 head dim, BF16 →
320 KiB/token, matching the README's "40 GB for 128k tokens (LLaMA3-70B)" anchor.
Prefill 11k token/s (≈20% MFU on 8×H800). Host link 50 GB/s; RDMA 190 GB/s
(measured 8×400Gbps figure); metadata lookup 0.8 ms; page 64 tokens = 20 MiB.
Teaching capacities are scaled down but keep the deployed 240 GB L2 : 760 GB pool
ratio (3.17x). All byte/time figures are labeled analytical, not measured TTFT.

## Identity and scope revision (owner feedback)

The owner read the delivered chapter and raised two points: it explained only Mooncake's use as
an L3 backend, not Mooncake's own principles, and "Mooncake L3" is too narrow a name for a system.

Decision: the chapter is now **Mooncake** (the KVCache-centric serving system), with the L3 tier
as one of four sections:

1. `mooncake-arch` — why KVCache-centric; Conductor's reuse-vs-TTFT placement; chunked pipeline
   prefill; layer-wise KV movement; overload early rejection. One interactive request walk with
   three cases (long prefix hit, short miss, overload) and two placement preferences.
2. `mooncake-tiers` — which tier can hit (private L1/L2 vs shared L3) and the capacity trace.
3. `mooncake-hit` — how the store serves one remote hit (master, replica list, registered memory,
   RDMA path, PutEnd publication).
4. `mooncake-cost` — when reuse pays (per-token crossing, policy threshold, medium floor).

Title: zh "Mooncake：以 KVCache 为中心的分离式服务"; en "Mooncake: KVCache-centric serving".
Sidebar label: "Mooncake". Route stays `#mooncake`.

Ownership: the paper architecture (Conductor scheduling, CPP, layer-wise prefill, early rejection)
is explained here; the open-source evolution (Conductor as a prefix index for routers) is stated
as a boundary; radix/layout details stay in Radix HiCache; store/RDMA details are section 3.

## Architecture rewrite (system-first spine)

The owner rejected the previous version for lacking the overall architecture's technical
difficulties, relationships and details. The chapter is now organised as a system explanation:

1. **`mooncake-arch` — four difficulties, four answers.** One 16K-token request is used for four
   lenses: long-context prefill (single-node 372 ms and 5 GiB peak vs two-node pipeline 186 ms and
   ~320 MiB), cross-node KV movement (4.03 GB load + 1.34 GB stream at 190 GB/s vs 100GbE TCP),
   reuse-vs-SLO placement (A 328 ms over SLO vs B 300 ms), and overload (608/650 ms predicted, so
   reject before prefill). The canvas labels the control plane (Conductor) and data plane (prefill,
   decode, KV pool), the interface payloads (placement + block IDs, layer-wise load, layer-wise KV
   stream), the request state machine, and a design-alternative note (monolithic, or chunked prefill
   inside decode) explaining why Mooncake kept disaggregation.
2. **`mooncake-hit` — how the pool serves one fetch.** The Store data path: master replica list,
   registered memory, RDMA path and PutEnd publication; framed as the data-plane substrate shared by
   HiCache L3 and PD hand-offs.
3. **`mooncake-tiers` — L3 integration.** The Store behind HiCache; private L1/L2 vs shared L3, the
   eight-round multi-turn trace and the L3 gain.
4. **`mooncake-cost` — when reuse pays.** Per-token crossing, the 256-token policy threshold and the
   medium bandwidth floor.

The old three-scenario tour (long/short/overload) was replaced by the four challenge lenses; the
request walk is shared across them.
