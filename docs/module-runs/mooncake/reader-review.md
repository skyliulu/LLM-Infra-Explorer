# Owner reader review — Mooncake

## Route and state

- Final route: `#mooncake`, label "Mooncake", title "Mooncake：以 KVCache 为中心的分离式服务".
- Reviewed: zh Light 1440 full page; en Light, zh/en Dark, 900 and 390. §1 with all four lenses (prefill, transfer, placement, overload) at idle and end, both placement preferences; §2 store steps; §3 L3 trace and pool sizes; §4 RDMA/100GbE/SSD; share popover and reload.
- Evidence: `evidence/zh-light-1440-full.png`, `zh-light-1440-arch-prefill.png`, `zh-light-1440-arch-transfer.png`, `zh-light-1440-arch-placement.png`, `zh-light-1440-arch-slo.png`, `zh-light-1440-arch-overload.png`, `zh-light-1440-arch-design.png`, `zh-light-1440-hit-done.png`, `zh-light-1440-tiers-end.png`, `zh-light-1440-cost.png`, `en-dark-900-arch.png`, `zh-light-390-arch.png`.

## Reading path

1. Header and subtitle; sidebar "Mooncake".
2. §1: lead naming the four difficulties and the control/data planes; lens toggles; policy; step rail; conductor (control plane); prefill pool (data plane) with A/B and chunks; KV stream; decode pool; KV pool; budget strip; design-alternative note; challenge card (constraint / magnitude / without it / mechanism / boundary); metrics and candidate table.
3. Each lens: prefill (372 → 186 ms, 5.37 GB → 320 MiB), transfer (21 + 7 ms RDMA vs 322 + 107 ms TCP), placement (A 328 ms over SLO vs B 300 ms), overload (608/650 ms predicted; 186 ms + 5.37 GB avoided).
4. §2: store steps 0–8, replica list, transport strip, L2/segment inventory, write-back and PutEnd.
5. §3: L1+L2 vs +L3 at round 5 and 48, pool 24, instance mode, L3 gain.
6. §4: per-token crossing, 256-token threshold, mediums, floor, verdict; share popover and reload.
7. Repeated in English, Dark, 900 and 390.

## Reconstructed answer (from the page alone)

Mooncake separates prefill, decode and KV storage. Separation creates four difficulties. The prefill request carries the raw input, the reusable prefix block IDs and the full-cache block IDs; the decode node's local scheduler double-checks TBT and may reject even after prefill. Long 16K-token prefills would take ~372 ms and hold ~5 GiB of KV on one node, so prefill is cut into 1,024-token chunks over two nodes in a pipeline (186 ms) with layer-wise KV load/store, peaking near one chunk (~320 MiB). Moving a 12K prefix means 4.03 GB into the prefill node and 1.34 GB streamed to decode; the paper calls this service Messenger, the open-source implementation is Transfer Engine, and its zero-copy RDMA plus NIC path selection make that ~21 + 7 ms instead of ~322 + 107 ms on TCP. Placement is a tradeoff: the longest prefix (A, 12,288 reused) queues 120 ms and predicts 328 ms, over the 300 ms SLO, while B gives up 1,024 tokens of reuse but lands at 300 ms; Conductor weighs hits, load and TTFT. Under overload both predictions exceed the SLO, so the request is rejected before prefill, saving 186 ms and 5.37 GB. The transfer is layer-wise and hot blocks are replicated to avoid fetch congestion; the store serves a fetch through a metadata-only master, registered-memory RDMA and PutEnd publication; the same store behind HiCache is the shared L3, where a multi-turn trace shows the L2-only hit rate decaying while the pool holds. Reuse pays when per-token transfer beats per-token compute: about 10 tokens on RDMA, 256 tokens as policy, with a 3.9 GB/s floor at 11k tokens/s; 10GbE loses at every length. The rejected alternative — monolithic prefill/decode, or chunked prefill inside decode — would protect capacity or TBT partially, but sacrifices prefill MFU and still needs cross-node prefill for long context. The page title says this architecture is the paper’s; the open-source repo has no scheduler or CPP prefill source, and section 2 names its source: mooncake-store@504f2ae (GetReplicaList returns replicas and a lease TTL; PutStart/PutEnd; Transfer Engine direct read).

A condition where it does not transfer: little cross-request prefix sharing, a medium below the floor, or a pool smaller than the working set erode the gain; the page shows the small-pool erosion and the 10GbE failure.

## Central-mechanism audit

| Promised understanding | Observed | Remains narrated | Verdict |
|---|---|---|---|
| Why the system is split | Four lenses name constraint, magnitude, counterfactual, mechanism and boundary; the design note compares monolithic and chunked-in-decode | queue/SLO values are illustrative | pass |
| Who decides / executes / stores | Control-plane and data-plane badges; Conductor card names `placement + block IDs`; prefill/decode/pool carry the load and stream interfaces | — | pass |
| Prefill difficulty | Chunk squares, `4/2`, single-node vs pipeline budget, peak KV 5.37 GB → 320 MiB | node-level timeline not modeled | pass |
| Transfer difficulty | Budget shows RDMA vs TCP for load and stream; transport strip shows registered memory and 0 CPU copies | — | pass |
| Placement and overload | A/B table, SLO flags, policy switch, rejection with avoided work | predictor internals not simulated | pass |
| Store and L3 | Replica list, RDMA path, PutEnd/lease, tier trace and L3 gain | — | pass |
| Reuse economics | Per-token crossing at ~10 tokens, threshold zone, 10GbE loss | — | pass |

Upper/lower mapping: the same 16K request and A/B placement feed the architecture budgets, the store walkthrough uses the moved request, and the L3 trace uses the same page objects and pool.

## Friction found and repairs

- Fourth review: the chapter lacked the system's technical difficulties, relationships and details. §1 was rebuilt around four difficulties with explicit constraint/magnitude/counterfactual/mechanism/boundary, control/data-plane labels and interface payloads, a design-alternative note, and per-lens budgets; §2–§4 reordered store → L3 → economics (F42).
- Polish: placement reason now only in the placement/overload lenses; duplicate rejection-savings box removed; forward reference in the store lead fixed (F43/F44).
- Remaining friction, accepted: §1's queue/SLO values and budget times are readout assumptions (the budget note says so); §2 is a fixed default-pool reference case; the L3-only baseline is a computed counterfactual; the paper's scheduler and today's prefix-index Conductor differ and the page says so.

## Final verdict

Pass for the requested outcome: the page now explains Mooncake's architecture through the difficulties that force it, the planes and interfaces that implement it, the alternative it rejected, and the store/L3/economics that follow. Evidence listed above; details in `qa.md`.
