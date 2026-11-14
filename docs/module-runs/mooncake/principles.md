# Mooncake L3 — principles

## Reader concern

The reader has already seen prefix reuse inside one engine (radix cache) and tiered
L1/L2 caching. The open question is why a serving cluster would put KV in yet another
tier, and whether a remote hit is actually faster than just recomputing.

## Explanatory thesis

L3 changes *who can hit*, not how attention is computed. Once a page becomes a
content-addressed object in a cluster pool, any instance may reuse it and the pool can
hold a working set far larger than one host's DRAM. In exchange, reuse becomes a
distributed-systems operation whose cost is metadata latency plus bytes divided by
fabric bandwidth. So the design question is not "is caching good" but "is the avoided
prefill time larger than the added transfer time, at this prefix length, model and
fabric?"

## Outcome-to-cause map

Observed outcome: multi-turn serving keeps a high KV hit rate and stable TTFT as
conversations grow, while a host-memory-only cache degrades.

Controlling quantities: working-set bytes (tokens × bytes/token), private host
capacity, pool capacity, prefix length per request, page granularity.

Design decisions → mechanisms:

1. Pool host DRAM/SSD across nodes → capacity no longer tied to one host →
   evictions happen later → hit rate stays high.
2. Content-address pages by chained prefix hash → the same page has one identity
   cluster-wide → a page written by A is readable by B → placement stops mattering.
3. Metadata-only master + client-owned segments → the query is a small RPC and the
   data path is a direct RDMA copy → per-hit fixed cost is a lookup, per-byte cost is
   bytes/bandwidth.
4. Page-granular, page-first objects → one object per contiguous transfer → zero-copy
   and bandwidth aggregation → the per-byte cost stays near line rate.
5. Leases, LRU eviction, soft pin, replicas → hits stay valid under concurrency and
   hot objects do not become a transfer hotspot.

Conditions and costs: pool memory and network bandwidth are taken from the same
cluster that serves PD transfers; a miss after prefetch wastes bandwidth; below a
break-even bandwidth the hit is slower than recompute; an SSD-backed tier sits close
to that boundary.

## Hierarchy

1. **Scope** — which tier a hit can come from (§1 canvas). Answer: private L1/L2 vs
   shared L3, and the capacity consequence.
2. **Object and path** — how one hit is served (§2). Answer: key → master replica
   list → RDMA prefetch into L2 → load → suffix prefill; plus write-back publishing.
3. **Economics** — when this trade pays, and where it stops (§3). Answer: break-even
   length and the bandwidth/medium boundary, with the capacity/hit-rate limit.

Each section is a narrower question on the same objects: the page object selected in
§1 is the same object traced in §2 and priced in §3.

## Ownership table

| Concept | Role here | Depth | Owner |
|---|---|---|---|
| Prefix match / radix tree | produces the reusable prefix run | connect | Radix HiCache |
| L2↔GPU load, layouts, write policies | transport after the hit | connect | Radix HiCache |
| KV bytes per token | sizes the object | connect | LLM Inference / KV representation |
| Shared pool, object identity, RDMA path, capacity, economics | the chapter's argument | explain | this chapter |
| PD disaggregation, Conductor scheduling | second consumer / placement policy | name | not covered in depth |
| Early rejection, multi-tenancy, HA | out of scope | leave out | — |

## First useful observation

A shared system page requested by six conversations on three instances: with only
L1/L2 it is computed once per instance; with L3 it is computed once for the cluster and
served by RDMA. The reader sees the same page object move, not a percentage.

## Object/relationship handoff to rendering

- Object: page = 64 tokens = 20 MiB, id `S0`, `C1R3`, etc.
- Relationship 1 (ownership): private L2 slot vs pool object; the pool object is
  visible from every instance.
- Relationship 2 (movement): pool segment → L2 slot (RDMA) → GPU (layer load), and
  GPU → L2 → pool (write-back), with bytes on each edge.
- Relationship 3 (decision): for a given hit length, compare prefill time with
  lookup + bytes/fabric + bytes/host; the crossing is the break-even length.
- Prediction the reader should be able to make: extending the prefix raises the
  saving linearly while the lookup cost stays fixed, so long reused prefixes are the
  case L3 is built for; shrinking the fabric until bytes/token ÷ bandwidth exceeds
  1/prefill-rate flips the verdict.

## Scope revision: from an L3 usage page to a system chapter

The owner's second request widened the reader concern: not only "how is the pool used as L3" but
"how does Mooncake itself work". The thesis now has two halves that must connect:

- **Placement half:** long-context, SLO-bound, often overloaded traffic → split prefill/decode and
  pool the KV → Conductor chooses where a request runs by weighing reusable prefix, queue and
  TTFT → chunked pipeline prefill and layer-wise KV movement make a long prefill bearable →
  early rejection protects the SLO when the system is saturated.
- **Storage half:** the pool serves cross-instance hits through content-addressed objects, a
  metadata-only master and RDMA copies of registered memory → reuse pays only when the medium
  beats recomputation.

Causal chain: architecture and scheduling explain *why the pool exists and who decides*; the
store section explains *how a hit is served*; the economics section explains *when it is worth it*.

Hierarchy (reading order): architecture/scheduling → tier scope → store hit path → economics.

Ownership update: the paper's Conductor, CPP, layer-wise prefill and early rejection are explained
here at principle level, because the chapter's title is now the system; radix/layout details stay
in Radix HiCache; the open-source Conductor-as-index evolution is stated as a boundary, not taught.

> Superseded: the final section 1 draws only the implemented stack (see qa.md F50 and research.md C20). The paper-design material below is kept as run history, not as the page.

## System handoff: difficulty ledger, relationship map, design alternative

The chapter's spine is now the system, not the cache tier.

**Difficulty ledger**

| Difficulty | Constraint / magnitude | Without the mechanism | Mechanism | Boundary |
|---|---|---|---|---|
| Long-context prefill | 16K prompt, 4K to compute: 372 ms on one node, ~5 GiB KV peak | TTFT doubles and memory is held for the whole prefix | 1,024-token chunks over two prefill nodes (186 ms) + layer-wise KV load/store (~320 MiB peak) | chunk boundaries still need cross-node traffic; small chunks raise its share |
| Cross-node KV movement | 4.03 GB prefix load + 1.34 GB stream; 21 + 7 ms at 190 GB/s, 322 + 107 ms on 100GbE TCP | TCP/CPU bounce eats the first-token budget | Transfer Engine zero-copy RDMA, layer-wise streaming, NUMA/NIC path selection | below ~3.9 GB/s the move costs more than recompute |
| Reuse vs SLO placement | A: 12,288 reused, 120 ms queue, 328 ms; B: 11,264 reused, 0 ms queue, 300 ms; SLO 300 ms | reuse-only misses the SLO; queue-only recomputes more | Conductor weighs hits, load and TTFT in one choice | under overload every choice misses; only rejection helps |
| Overload | A 608 ms, B 650 ms predicted; 186 ms prefill + 5.37 GB transfer would be wasted | compute first, then fail admission | predict the decode queue and reject at admission | conservative prediction rejects good requests |

**Relationship map**

- Control plane: Conductor owns the global prefix index and placement. It sends the chosen prefill
  group the request with reusable block IDs and an allocation; it selects a decode instance by load.
- Data plane: prefill groups execute chunked, layer-wise prefill and produce a KV stream; the decode
  pool holds the continuous batch and its local scheduler re-checks TBT; the Store (master +
  client-owned registered segments + Transfer Engine) holds the shared pages and serves loads.
- Interfaces: `placement + block ID` (Conductor → prefill), `layer-wise prefix load` (Store →
  prefill L2/VRAM), `layer-wise KV stream` (prefill → decode), `block keys` (request → index).

**Design alternative**: a monolithic pool keeps prefill and decode together (good capacity
utilisation, but long prefill interrupts decode TBT); chunked prefill inside decode relieves that at
the cost of prefill MFU, and long context still needs cross-node parallelism. Mooncake chooses
separation + pooling + cache-aware placement, paying with cross-node movement and harder scheduling.

**Boundary**: the paper's Conductor schedules requests; the current open-source Conductor exposes a
prefix index for engine routers. The page states this; queue/SLO values are illustrative.
