# Mooncake — QA

Scope: new chapter (`create`) revised into a system chapter, route `#mooncake`, label "Mooncake". Date 2026-11-14. Four sections: difficulty-led architecture (control/data planes, request walk, design alternative), store data path, L3 integration, reuse economics.
Owner: root agent. Evidence: `docs/module-runs/mooncake/evidence/`.

## What was verified

| Area | Method | Result |
|---|---|---|
| Model invariants | 
ode scripts/check-mooncake.mjs` (pure model) | pass — serving placement (reuse vs TTFT), CPP stages, early rejection, sizes, 48-request trace, capacity bounds, hit-path composition, break-even/floor boundaries, state clamping |
| Routing / sharing / learning paths | 
pm run check:workbench` | pass — 14 chapters round-trip, mooncake schema rejects unknown/out-of-range, prerequisites and continuations forward-only |
| Theme compiler | 
ode scripts/check-theme.mjs` | pass |
| Conventions | `check-module-conventions.mjs src/components/MooncakeL3.jsx --capabilities timeline,multiple-modes,resource-metrics,data-movement,math` | 9/9 required pass; one warning about `×` as a ratio suffix (reviewed: it is a unit in "3.8× / 10.5×", not an imitation formula) |
| Production build | 
pm run build` | pass |
| Rendered browser | headless Chrome via `docs/module-runs/mooncake/evidence/tools/shoot.mjs`, no console errors/warnings, no KaTeX errors, no page-level horizontal overflow at 1440/900/390, zero clipped page cells | pass |
| Themes/languages/widths | Light and Dark × zh/en × 1440/900/390 for the four sections and interaction states | pass (see matrix below) |
| Share link | reload with `#mooncake?section=mooncake-cost&setup=…` (instance mode, pool 48, 10GbE, 512 tokens, 24k tokens/s) | applied all values and scrolled to the section (`zh-light-1440-share-load.png`); popover with the generated setup URL in `zh-light-1440-share-open.png` |

## Rendered matrix (actual captures)

| State | zh Light | zh Dark | en Light | en Dark | 900 | 390 |
|---|---|---|---|---|---|---|
| §1 architecture (idle / choose / prefill / placement / transfer / TTFT policy / overload) | `zh-light-1440-arch`, `…-arch-choose`, `…-arch-prefill`, `…-arch-slo`, `…-arch-overload` | `zh-dark-1440-arch.png` | `en-light-1440-arch.png` | `en-dark-900-arch.png` | yes | `zh-light-390-arch.png` |
| §2 tier scope idle | `zh-light-1440-tiers.png` | `zh-dark-1440-tiers.png` | `en-light-1440-tiers.png` | `en-dark-900-tiers.png` (900) | yes | `zh-light-390-tiers.png` |
| §2 round 5 / end / instance / pool 24 | `…-tiers-round5`, `…-tiers-end`, `…-tiers-instance`, `…-tiers-pool24` | dark end covered at round 40 (`zh-dark-1440-tiers.png`) | — | — | — | — |
| §3 idle / prefetch / done | `…-hit`, `…-hit-prefetch`, `…-hit-done` | `zh-dark-1440-hit.png` (step 6) | `en-light-1440-hit.png` | — | — | `zh-light-390-hit.png`, `en-light-390-hit.png` |
| §4 RDMA / 10GbE / SSD | `…-cost`, `…-cost-slow` | `zh-dark-1440-cost.png`, `zh-dark-1440-cost-ssd.png` | `en-light-1440-cost.png` | `en-dark-900-cost.png` | yes | `zh-dark-390-cost.png` |

The matrix is rendered evidence, not a claim that every combination was inspected pixel by pixel; the owner read the zh Light full page and the interactive states, and checked representative zh/en, Light/Dark and 390/900/1440 views for contrast, wrapping and overflow.

## Findings

| ID | Severity | Status | Observed | Repair |
|---|---|---|---|---|
| F1 | P2 | fixed | First capture: pool segment chips injected the selected page, so segments looked populated at step 0 | List only resident pages; `+N` for overflow; model asserts segment capacity |
| F2 | P2 | fixed | §2 left column ended far above the right, leaving a large void | Moved figures/page note left, added the write-back row as the object's return path |
| F3 | P2 | fixed | Dark theme turned the pool, master and transfer arrow into saturated violet/brown blocks | Neutral surfaces with colored borders/rings; re-checked in Dark |
| F4 | P2 | fixed | `deriveEconomics` returned `Infinity` for the bandwidth floor on RDMA (unit error), hiding the main boundary | Corrected formula; asserted ~3.9 GB/s at 11k and 9.3 GB/s at 24k |
| F5 | P3 | fixed | Request strip labelled the shared page by role, hiding its hit source | Every page shows its source; role is the tooltip |
| F6 | P3 | fixed | Legend said the cost lines never cross when the crossing was left of the plotted range | Shows the approximate break-even length |
| F7 | P3 | fixed | Cost chart had a second axis label on the x-axis row and over-precise tick labels | Removed; rounded ticks |
| F8 | P3 | fixed | §2 step 0 repeated the section lead | Short interaction hint instead |
| F9 | P3 | fixed | §2 had no visible write destination | `写回 C0R5 → 节点 1 的 segment` row, highlighted at the write step |
| F10 | P3 | fixed | Duplicate page-size sentence in §2 | Kept one note |
| F11 | P3 | fixed | Browser-default focus ring on the section heading after a share-link jump | Styled focus ring |
| F12 | P1 | fixed | Below the 256-token prefetch threshold the verdict still said "pays off" while the page said the engine recomputes | Added a `skipped` verdict state, gated on the policy threshold; the rule is asserted in the model check |
| F13 | P2 | fixed | §1 "saved" measured against full recompute, overstating L3 at small pools | Replaced with "L3 收益" measured per step against the same trace with L1+L2 only (0 at idle, 484.9 ms at the end) |
| F14 | P2 | fixed | Chart story (round 1 differs, round-5 drop is the move) was unexplained and did not match the "equal early" note | Chart note names the three causes; research/brief corrected |
| F15 | P2 | fixed | §2 displayed a false L2/segment inventory (only S0, four objects) | L2 reports 12/12 with only relevant pages highlighted; segment reports 4/9 with "not read" count; §2 labelled a fixed reference case |
| F16 | P2 | fixed | §2 write-back was assert-only; C0R5 never entered L2 | C0R5 enters L2 at the write step, plus a write-back row to node 1's segment |
| F17 | P2 | fixed | Master query/replica list was only a border highlight | Replica descriptors (id, segment, bytes) appear in the master box at the replica step |
| F18 | P2 | fixed | Cost chart could never show the crossing (all break-evens below the x-min) | Chart switched to per-token time: lookup amortizes, transfer is flat, crossing drawn at ~10 tokens, 256-token policy boundary shaded |
| F19 | P2 | fixed | "加速 0.3×" contradicted the loss verdict | Card switches to "慢多少 3.0×" when the fetch is slower |
| F20 | P2 | fixed | SSD limitation only in research | Scope note now states SSD is bandwidth-only (no latency tail, no NVMe queueing) |
| F21 | P3 | fixed | Idle state labelled the shared page as the new page | Idle labels follow the page role |
| F22 | P3 | fixed | "6 页前缀" / "four pages" attribution errors | Prefix is five pages; completion names four fetched pages plus local S0 |
| F23 | P3 | fixed | Ambiguous object key next to the write-back line | Key line names C0R1 as one of the hit objects |
| F24 | P3 | fixed | Post-request L2 state could look inconsistent with the request strip | Residency note added; §1 shows post-request residency, strip shows the decision |
| F25 | P3 | fixed | "Near break-even" unreachable | Reachable at 100GbE / 24k / 512 tokens |
| F26 | P3 | fixed | Pool eviction claimed LRU but was FIFO | Pool hits refresh recency; model check still passes |
| F27 | P3 | fixed | 190 GB/s and 40 GiB provenance missing from the page | README (Transfer Engine bandwidth) added to evidence |
| F28 | P3 | fixed | Share evidence did not show control or URL | `share-open` popover with setup URL + `share-load` restored state |
| F29 | P3 | fixed | "Never cross in the plotted range" wording | Copy now says they never cross at any length |
| F30 | P2 | fixed | Owner review: §2's 3.8× baseline was full recompute, so it included the local L2 hit; L3's own contribution was overstated | §2 compares the same request with L2 only against L2+L3: 29.5 ms → 9.16 ms (3.22×); full recompute stays as a labelled reference with a note that S0's local hit is not L3's; `withoutL3`/`ratioL3` are model outputs and asserted |
| F31 | P2 | fixed | Owner review: `release(lease)` was annotated as the step that makes the new copy readable | Publication is `PutEnd`: the pseudocode, lease note, write-back row ("PutEnd 后可读") and completion copy now separate publication from read protection |
| F32 | P3 | fixed | Owner review: the transport mechanism appeared only as a bandwidth number | Registered-memory / zero-copy / NIC-path detail added on the existing prefetch step (transport strip, detail text, `te.read` pseudocode), no new panel |
| F33 | P3 | fixed | Owner review: page ids clipped (`C…`), small labels and ticks | L2 grid 4 columns, 10.5px cells, 8.5px chart ticks, wrapping metric labels; automated clipped-cell count is 0 in all 37 captures |
| F34 | P3 | fixed | Owner review: dark cost chart had a large pale shaded zone | The zone now uses an explicit light/dark fill pair |
| F35 | P2 | fixed | Owner review: the chapter explained only Mooncake's L3 usage, and "Mooncake L3" is too narrow a system name | Renamed to "Mooncake" with the subtitle "KVCache-centric serving"; four sections: architecture/scheduling, tier scope, store hit path, economics |
| F36 | P2 | fixed | Owner review: Mooncake's own principles were missing (placement, chunked prefill, early rejection) | Added §1: one request walk with long/short/overload cases and reuse-vs-TTFT placement; the model asserts the chosen group, CPP stages and rejection |
| F37 | P3 | fixed | The paper's Conductor and the current open-source Conductor differ (scheduler vs prefix index) | The page states the evolution and scopes the scheduling claims to the paper architecture |
| F38 | P2 | fixed | The page-chip class `.mk-page` collided with the chapter container class, so the container inherited the chip's grid, border, padding and min-height | Chips renamed to `.mk-page-chip`; the container keeps only `chapter-page`/`.mk-page` surfaces |
| F39 | P3 | fixed | Buttons did not follow the shared button grammar: the step rail put `role="listitem"` on `<button>` and used `aria-pressed` for the current step, §1 had two scrubbers (range + rail), and the policy toggle was disabled without explanation in the short case | Step rail is a labelled group of buttons with `aria-current="step"`; the duplicate range was removed; the policy toggle is hidden when only one candidate exists |
| F40 | P3 | fixed | Interactive targets were small and lacked hover feedback (page chips, pool chips, step chips, toggles) | Page chips 34px high, step chips 28px, pool chips 22px, toggles 30px, each with hover and focus styles; playback stays the shared 36px icon group |
| F41 | P2 | fixed | Owner review: the icons inside play / next / reset were not centered in this chapter; the shared `.chapter-playback button` rule set the 36px box but no flex centering, while sibling chapters added inline-flex classes | Shared rule now uses inline-flex centering and removes default button padding; verified by a zoomed crop of the playback group (also fixes HiCacheStory, which had no centering classes) |
| F42 | P2 | fixed | Owner review: the page still did not explain the overall architecture relationships, technical difficulties or details; the scheduler demo was an add-on to a cache-centric spine | §1 rebuilt around four difficulties with constraint, magnitude, counterfactual, mechanism and boundary; the canvas labels control/data planes and interface payloads; a design-alternative note compares monolithic and chunked-in-decode; §2–§4 reordered as store → L3 integration → economics |
| F43 | P3 | fixed | The architecture section showed the placement reason for every lens and repeated the rejection savings in two places | Placement reason only appears for the placement/overload lenses; the duplicate saved-work box was replaced by the budget cells |
| F44 | P3 | fixed | After reordering, the store lead referred to a request "above" that is introduced later | Reworded to the concrete rebalance without a backward reference |
| F45 | P2 | fixed | Owner review: the architecture section's copy ran tall (long lead, five-row card, four-line design note) and the budgets read as measured | Lead shortened, challenge-card copy trimmed and tightened, design note cut to two short paragraphs, and a budget note now states the readout assumptions (11k tokens/s, 190 GB/s, 0.8 ms lookup) |
| F46 | P2 | fixed | Owner asked whether the architecture matches the real implementation | Re-checked against arXiv v3 §3/§5/§6/§7: the prefill request carries raw input plus prefix and full-cache block IDs; the decode scheduler double-checks TBT and may reject; the paper's transfer service is Messenger (open source: Transfer Engine); the page now states the rename, the double-check and the paper-vs-stack boundary, and labels resident KV rather than "peak KV" |

Independent review: `independent-review.md` (state and disposition of every reviewer finding).

## Boundaries and limitations (as stated on the page)

- Times are an analytical critical path (one metadata lookup per request, serial prefetch then load, no batching or queueing); HiCache overlaps the L2→GPU load with compute and Radix HiCache owns that mechanism.
- Teaching capacities are scaled but preserve the deployed 240 GB : 760 GB ratio; the trace lowers the prefetch threshold to one page and says so.
- SSD is modeled by streaming bandwidth only (no per-object tail, no prefetch-on-exist).
- The master is assumed responsive; HA/etcd, multi-tenancy, replication and PD scheduling are not modeled.
- Benchmark shape (L2 decays, L3 holds, early rounds equal) comes from Mooncake's published multi-turn benchmark; the chapter reproduces the shape, not its measured values.

## Repository notes

- `scripts/check-navigation.mjs` is stale (expects an 11-label list and old `MainDashboard` source strings) and predates this change; it is not part of `check:workbench`. Left untouched.
- Pre-existing uncommitted changes in the tree (Engram, skills, `design-qa.md`, provider docs) were not modified except for appending this chapter's record.
