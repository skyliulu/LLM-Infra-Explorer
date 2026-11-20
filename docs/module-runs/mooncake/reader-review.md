# Owner reader review — Mooncake (Deep Refactor)

## Route and state

- Route: `#mooncake`, sidebar label "Mooncake", title "Mooncake：以 KVCache 为中心的共享存储与搬运栈".
- Inspected rendered captures: `zh-light-1440-arch.png`, `zh-light-1440-arch-lens3.png`, `zh-light-1440-arch-step7.png`, `zh-dark-1440-arch.png`, `zh-system-1440-arch.png`, `en-light-1440-arch.png`, `en-dark-900-arch.png`, `zh-light-390-arch.png`, `zh-light-1440-tiers-round5.png`, `zh-light-1440-hit-done.png`, `zh-dark-1440-hit.png`, `zh-light-1440-cost-ssd-lookup.png`, `zh-light-1440-share-load.png`.

## Reading path

1. Header & subtitle accurately frame the open-source KV indexing/store/transfer stack and its L3/economics progression.
2. §1 (`mooncake-arch`): switched across the 3 engineering difficulties (cross-instance visibility, metadata/data decoupling, zero-copy RDMA movement), verified the 5-item ledger (constraint / magnitude / without it / mechanism / boundary) couples directly to the 2-plane architecture map and request steps; stepped to step 5 (lens 3) and step 7 (`Decode`, line 11 `engine.decode()`); checked rejected-alternative & source-boundary box; verified 900px Dark and 390px Light stacking.
3. §2 (`mooncake-tiers`): clicked "跳到第 5 轮改派" -> landed at 25/48 with `C0R1` selected across request strip, Instance 0 L2, Instance 1 L1/L2, and inspector; confirmed aligned blue (`L1+L2`) vs purple (`L1+L2+L3`) curves, compact `master` pill, and `Token` units.
4. §3 (`mooncake-hit`): followed the Round-5 rebalance from §2 directly into the 8-step fetch; verified readable `.mk-code` heading in Light & Dark, blue/purple/green L2/GPU cells, `8 × NIC` transport strip, and natural TTL lease expiry wording.
5. §4 (`mooncake-cost`): verified default RDMA gain, `SSD @ 18k / 256` lookup-loss verdict with staggered non-overlapping SVG labels, and share-link reload restoring `10GbE / 512 / 24k`.

## Reconstructed answer (from the page alone)

In `kvcache-ai/Mooncake@504f2ae`, routing and model compute stay in vLLM/SGLang while Mooncake solves three distributed KV bottlenecks: (1) cross-instance prefix visibility via Conductor's global `prefixindex`, (2) decoupling metadata from large KV payloads via Store Master (`GetReplicaList` + 10s read lease TTL, `PutStart`/`PutEnd` publication, 0 data bytes through Master), and (3) beating recomputation across nodes via Transfer Engine zero-copy RDMA `BatchTransfer` over registered memory regions (190 GB/s on 8×400GbE vs 3.9 GB/s floor at 11k tok/s). Keeping KV private in L1/L2 hits a single-host ceiling and drops cross-instance hits, while central TCP proxies eat the prefill budget. Putting Store behind HiCache as L3 eliminates cross-instance misses (e.g., Round 5 rebalance onto Instance 1) and per-host capacity cliffs, while each remote hit must cover 0.8 ms metadata lookup plus transfer time—failing whenever medium bandwidth falls below the compute floor (e.g., 10GbE, or SSD on a 24k tok/s GPU) or hit length falls below break-even / the 256-token policy threshold.

## Final verdict

Pass. All P1/P2 findings from the review are resolved and visually verified in both languages, Light/Dark/System themes, and desktop/tablet/mobile viewports.
