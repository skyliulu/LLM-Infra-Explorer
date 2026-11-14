# Independent outcome review and disposition

Reviewer: separate subagent (fresh context), given the user request, the rendered evidence, the research ledger and the live dev server; asked to reconstruct the answer, judge observable-vs-narrated evidence, check arithmetic and hierarchy, name a condition where the result does not transfer, and report findings without the author's verdict.

## What the reviewer confirmed

- The reconstructed answer is coherent: private L1/L2 → cluster object → metadata-only master → RDMA prefetch → suffix prefill → write-back; a hit pays when lookup + bytes/bandwidth is cheaper than the avoided prefill and stops paying on a slow medium.
- Page/byte arithmetic, the hit-path millisecond breakdown (0.80 + 0.44 + 2.10 + 5.82 = 9.16 ms), the baseline (34.9 ms), the break-even length (~9.7 tokens) and the bandwidth floor (3.884 GB/s) are correct and match the sources.
- No P0: no crash, no false central mechanism, clean console.

## Findings and disposition

| Reviewer finding | Severity | Disposition |
|---|---|---|
| Sub-threshold hit lengths show "pays off" while the page says the engine recomputes below 256 tokens | P1 | **Fixed.** `skipped` verdict state with its own copy; the verdict is gated on the policy threshold, and the slider runs from 8 tokens so the arithmetic and the policy are both visible. |
| Section 1 "saved 1.14 s" compares against full recompute, not L3; at pool 24 the L3 advantage is ~9 ms | P2 | **Fixed.** The metric is now "L3 收益", computed per step as the same trace with L1+L2 only minus the cluster run; it reads 0 at idle and 484.9 ms at the end. |
| The early-round/capacity story does not match the chart or the benchmark (round 1 differs; the round-5 drop is the move) | P2 | **Fixed.** A chart note names the three causes (round 1 shared page, round-5 rebalance, later host capacity); research/brief no longer claim a uniform "equal early" shape. |
| Section 2 shows a false L2/segment inventory (only S0, four objects) | P2 | **Fixed.** The L2 frame reports 12/12 with only the relevant pages highlighted; the segment reports 4/9 with "5 not read"; the section is labelled a fixed default-pool reference case. |
| Section 2 write-back is asserted, not shown | P2 | **Fixed.** C0R5 enters the L2 at the write step, and a dedicated write-back row sends it to node 1's segment. |
| Master query/replica list is only a border highlight | P2 | **Fixed.** The master box now shows the four replica descriptors (id, segment, bytes) that fill at the replica step. |
| Section 2 ignores the user's pool/mode | P2 | **Bounded.** It is explicitly a fixed default-pool reference case; wiring the live slider would make the walkthrough collapse whenever the reader shrinks the pool. |
| The cost chart's crossing is never drawn | P2 | **Fixed.** The chart is now per-token time: lookup amortizes, transfer is flat, the crossing is drawn at ~10 tokens, and the 256-token policy threshold is a separate shaded boundary. |
| "加速 0.3×" contradicts the loss verdict | P2 | **Fixed.** The card switches to "慢多少" with 3.0× when the fetch is slower. |
| SSD caveat lives only in research | P2 | **Fixed.** The page's scope note now states SSD is priced by bandwidth only (no latency tail, no NVMe queueing). |
| Idle state labels the shared page as the new page | P3 | **Fixed.** Idle labels follow the page role; hit sources replace them once a request runs. |
| "6 页前缀" / "the four prefix pages" attribution | P3 | **Fixed.** The prefix is five pages; the completion copy names four fetched pages plus the local S0. |
| Object key is ambiguous (C0R1 next to the write-back line) | P3 | **Fixed.** The key line names C0R1 and calls it one of the hit objects. |
| L2 boxes show post-request residency | P3 | **Addressed by clarification.** A residency note states that L2/pool show post-request state while the request strip shows the decision made during the request. |
| "Near break-even" unreachable | P3 | **Fixed.** Reachable at 100GbE, 24k tokens/s, 512-token hits (1.2×). |
| Pool eviction claimed as LRU but implemented as FIFO | P3 | **Fixed.** Pool hits now refresh recency; the captured 24/114-page runs are unchanged within a few tokens. |
| 190 GB/s and 40 GiB provenance missing from the page | P3 | **Fixed.** Added the Mooncake README (Transfer Engine bandwidth) to the evidence list. |
| Share evidence does not show the control or URL | P3 | **Fixed.** `zh-light-1440-share-open.png` shows the popover with a setup URL; `zh-light-1440-share-load.png` shows the restored state. |
| "Never cross in the plotted range" wording | P3 | **Fixed.** The no-crossing case now says the lines never cross at any length, and the chart caption switches accordingly. |

## Verdict after repairs

The reviewer's substantive objections were to evidence and presentation, not to the thesis. Each P1/P2 was repaired in the artifact and re-read; the bounded item (section 2's fixed reference case) is stated on the page. No reviewer finding was waived without a visible change or an explicit scope note.

## Follow-up: owner reader report (second review)

The owner read the delivered chapter from first screen to footer, exercised scope, progress, slow network and both appearances, and raised four points. All were repaired and the page reread; details in `qa.md` F30–F34.

1. **Comparison basis (P2).** Section 2's 3.8× used full recompute, which includes the local L2 hit. It now compares the same request with L2 intact and only L3 removed: 29.5 ms → 9.16 ms (3.22×); full recompute stays as a labelled reference with a note that S0's local hit is not L3's. `withoutL3` and `ratioL3` are model outputs and asserted.
2. **Lifecycle causality (P2).** `release(lease)` no longer claims to make the copy readable. Publication is `PutEnd`; the pseudocode, lease note, write-back row ("PutEnd 后可读") and completion copy separate publication from read protection.
3. **Transport depth (P3).** The prefetch step now carries a transport strip: registered regions at both ends, the direct address-to-address copy, 0 CPU copies, and NUMA/NIC path selection with aggregated links and failover. No new panel; it is part of the existing chain, and the prefetch detail and `te.read` pseudocode were rewritten to match.
4. **Readability (P3).** The L2 grid is four columns with 10.5px cells, chart ticks are 8.5px, metric labels wrap instead of ellipsizing, and the dark chart zone has an explicit light/dark fill. The capture harness counts clipped page cells: 0 across all 26 captures.


## Identity follow-up (third review)

The owner then judged the chapter as too narrow: it explained how Mooncake is used as an L3 backend
but not Mooncake's own principles, and "Mooncake L3" is not a suitable name for a system.

Disposition (F35-F37):

- **Identity/scope (P2, fixed).** The chapter is now "Mooncake" (KVCache-centric serving) with four
  sections: architecture/scheduling, which tier can hit, how one store hit is served, and when reuse
  pays. The L3 material is preserved, not discarded.
- **Own principles (P2, fixed).** Section 1 adds the Conductor placement tradeoff (reuse vs TTFT),
  chunked pipeline prefill, layer-wise load/stream, and overload early rejection, with one request
  walk across three cases and two placement preferences. Model checks assert the chosen group,
  pipeline stages and rejection.
- **Source boundary (P3, fixed).** The paper's Conductor schedules requests; the current open-source
  Conductor exposes a global prefix index for routers. The page states this evolution and scopes its
  scheduling claims to the paper architecture, so the new section does not overclaim current behavior.

## Second scope review: architecture depth (owner report)

After the identity change to "Mooncake", the owner judged the page still insufficient: the overall
architecture's technical difficulties, component relationships and details were not explained, and
the added scheduler/placement demo read as an add-on to a cache-centric chapter.

Disposition (F42-F44):

- **Difficulty ledger (P2, fixed).** Section 1 is rebuilt around four difficulties — long-context
  prefill, cross-node KV movement, reuse-vs-SLO placement, overload — each with constraint,
  magnitude, counterfactual, mechanism and boundary, and per-lens budgets (372→186 ms, 5.37 GB→320 MiB,
  RDMA vs TCP, A/B TTFT, avoided work).
- **Relationship map (P2, fixed).** The canvas labels the control plane (Conductor) and data plane
  (prefill, decode, KV pool) and names the payloads crossing each interface: placement + block IDs,
  layer-wise prefix load, layer-wise KV stream. The request state machine is shared across lenses.
- **Design alternative (P2, fixed).** A note compares monolithic serving and chunked prefill inside
  decode, states why Mooncake kept disaggregation, and names the price (cross-node movement and
  harder scheduling).
- **Information architecture (P2, fixed).** Sections are reordered system → store data path → L3
  integration → economics; L3 is one section, as the owner requested.

This review also motivated the skill additions: a difficulty ledger and relationship map for system
chapters, a rejected-design requirement, and control-geometry/parity QA.
