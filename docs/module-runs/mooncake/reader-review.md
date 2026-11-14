# Owner reader review — Mooncake

## Route and state

- Final route: `#mooncake`, label "Mooncake", title "Mooncake：以 KVCache 为中心的分离式服务".
- Reviewed: zh Light 1440 full page; en Light, zh/en Dark, 900 and 390. §1 implemented-stack map and source facts; §2 store steps; §3 L3 trace and pool sizes; §4 RDMA/100GbE/SSD; share popover and reload.
- Evidence: `evidence/zh-light-1440-full.png`, `zh-light-1440-arch.png`, `zh-dark-1440-arch.png`, `en-light-1440-arch.png`, `en-dark-900-arch.png`, `zh-light-390-arch.png`, `zh-light-1440-hit-done.png`, `zh-light-1440-tiers-end.png`, `zh-light-1440-cost.png`.

## Reading path

1. Header and subtitle; sidebar "Mooncake".
2. §1: title "Mooncake 的现役架构（开源实现）"; lead naming the commit and the components; the map: Conductor (prefix index) → router → engine, with Transfer Engine / Store / PG/EP underneath; the two notes (no global scheduler; the paper's scheduler and CPP pool are not open).
3. §1 source facts: Conductor, Store, Transfer Engine, PG/EP.
4. §2: store steps 0–8, replica list, transport strip, L2/segment inventory, write-back and PutEnd.
5. §3: L1+L2 vs +L3 at round 5 and 48, pool 24, instance mode, L3 gain.
6. §4: per-token crossing, 256-token threshold, mediums, floor, verdict; share popover and reload.
7. Repeated in English, Dark, 900 and 390.

## Reconstructed answer (from the page alone)

Mooncake as implemented today is an infrastructure stack, not the paper's global scheduler. At `504f2ae` a router (vLLM/SGLang) asks Conductor for the prefix index and picks an engine instance; the engine runs prefill and decode. Conductor only maintains the index: it consumes KV events and answers the longest reusable prefix per instance, medium and DP rank. Transfer Engine moves KV between registered segments over RDMA or other transports, selecting paths by topology and aggregating NICs. Store's master owns the object directory, allocation, replicas and leases; clients contribute segments and read/write directly through Transfer Engine; `GetReplicaList` returns replicas and a lease TTL, and `PutStart`/`PutEnd` complete an object. PG/EP provide elastic membership. The paper's Conductor scheduler and CPP prefill pool are not in the repository, so they are not drawn. Section 2 drills into one fetch, section 3 shows the Store behind HiCache with the L3 gain, and section 4 prices reuse.

A condition where it does not transfer: little cross-request prefix sharing, a medium below the floor, or a pool smaller than the working set erode the gain; the page shows the small-pool erosion and the 10GbE failure.

## Central-mechanism audit

| Promised understanding | Observed | Remains narrated | Verdict |
|---|---|---|---|
| Who decides / executes / stores | Map: Conductor index → router → engine; TE/Store/PG/EP substrate; source facts name each owner | engine-specific routing call | pass |
| Conductor | Fact says prefix index, KV events, longest match; boundary says no scheduler | HTTP details of the integration | pass |
| Store and transfer | Fact and §2: master metadata, replicas + lease TTL, PutStart/PutEnd, TE direct read, segment/buffer and topology | exact call chain | pass |
| L3 integration | Tier trace and L3 gain; Store behind HiCache | — | pass |
| Reuse economics | Per-token crossing, threshold zone, medium floor | — | pass |

Upper/lower mapping: the architecture map names the components; §2 opens Store and TE; §3 opens the L3 use; §4 prices it.

## Friction found and repairs

- Fifth review: the page still made the paper's scheduler/CPP the default architecture after the owner had established source-first precedence. Section 1 was replaced with the implemented stack; the four-lens paper model, its tests and share config were removed; the paper is a one-line boundary (F50).
- Polish earlier: source note in §2, readout labels, compact copy, centered playback.
- Remaining friction, accepted: the map is component-level; §2 is a fixed default-pool reference case; the L3-only baseline is a computed counterfactual; the page is not a line-by-line source trace.

## Final verdict

Pass for the requested outcome: the default architecture is the implemented stack, the paper design is explicitly not part of it, and the store/L3/economics follow. Evidence listed above; details in `qa.md`.
