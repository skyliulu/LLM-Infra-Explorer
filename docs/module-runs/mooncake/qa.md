# Mooncake — QA

Scope: deep refactor of `#mooncake` ("Mooncake"), updated 2026-11-20. Four sections in causal order:
1. `mooncake-arch` — implemented open-source stack (`kvcache-ai/Mooncake@504f2ae`) organized around 3 engineering difficulties (cross-instance visibility, control/data-plane decoupling, zero-copy RDMA movement), 2-plane component map with explicit bridges, 7-step request walk + synchronized multi-line pseudocode, rejected alternative and paper-boundary note.
2. `mooncake-tiers` — shared L3 pool behind HiCache: 3-instance / 6-conversation / 8-round trace, clickable L1/L2/pool pages, Round-5 move jump button, aligned L2 (blue) vs L3 (purple) chart colors, L3 gain metric.
3. `mooncake-hit` — single cross-node fetch dissecting Round 5's move onto instance 1: Store Master metadata + 10s read lease TTL, Transfer Engine zero-copy 8×NIC RDMA, L2/GPU cell color parity, PutEnd publication, and clean `.mk-code` contrast.
4. `mooncake-cost` — per-token reuse economics with break-even crossing, 256-token policy threshold, bandwidth floor, staggered SVG labels, and lookup-loss vs bandwidth-loss verdicts.

Evidence: `docs/module-runs/mooncake/evidence/`.

## What was verified

| Area | Method | Result |
|---|---|---|
| Model, stack & i18n invariants | `npm run check:mooncake` | pass — stack steps/lines (step 7 -> line 11 `engine.decode()`), zero duplicate/missing i18n keys, exact zh/en parity, `seconds.prefillRate` parameterization, 48-request trace, capacity bounds, hit-path composition (`writeSegment=1`, `nicLinks=8`), lookup-loss (`ssd @ 18k / 256` -> `verdict='loss'`, `lossCause='lookup'`) & bandwidth-floor boundaries |
| Routing / sharing / learning paths | `npm run check:workbench` | pass — 14 chapters round-trip, mooncake schema rejects unknown/out-of-range, prerequisites and continuations forward-only |
| Theme compiler | `node scripts/check-theme.mjs` | pass |
| Conventions | `check-module-conventions.mjs src/components/MooncakeL3.jsx --capabilities timeline,multiple-modes,resource-metrics,data-movement,math,structural-comparison` | 9/9 required pass; 1 warning (`×` ratio suffix reviewed) |
| Production build | `npm run build` | pass — 0 CSS warnings, 0 bundle errors |
| Rendered browser | headless Chrome via `docs/module-runs/mooncake/evidence/tools/shoot.mjs` | pass — 35/35 shots: 0 console errors/warnings, 0 KaTeX errors, 0 horizontal overflow, 0 clipped cells, 0 clipped architecture nodes |
| Themes / languages / widths | Light, Dark, System (`zh-system-1440-arch` -> resolved `dark`) × zh/en × 1440/900/390 | pass — inspected rendered screenshots across all four sections |
| Share link | reload with `#mooncake?section=mooncake-cost&setup=…` (`instance`, pool 48, `10GbE`, 512 tokens, 24k/s) | pass — applied all values, scrolled and focused heading (`zh-light-1440-share-load.png`) |

## Deep-refactor repairs (2026-11-20)

| ID | Severity | Status | Observed | Repair |
|---|---|---|---|---|
| F53 | P1 | fixed | Duplicate i18n keys in `content.js` silently overwrote `st_load`/`st_prefill`/`st_decode` with dead paper-era labels ("6 分块 Prefill", "7 加入解码批") | Removed 131 dead i18n keys; added duplicate-key & missing-key assertions to `check-mooncake.mjs` |
| F54 | P1 | fixed | `stack.js` step 7 (`decode`) highlighted line 10 (`put_end`) instead of line 11 (`decode()`), and wrote to `reps.segment` | Fixed multi-line step mapping (`prefill` -> lines 8–10, `decode` -> line 11) and `dst = master.put_start(...)`; asserted in `check-mooncake.mjs` |
| F55 | P1 | fixed | `.mk-code` class collision painted §3's light-mode heading dark slate on `#0d1117` | Scoped §1 code block to `.mk-stack-code`; `.mk-code` stays a card wrapper with readable headings in Light & Dark |
| F56 | P1 | fixed | Mobile 390px §1 flow squished 3 nodes onto one row (`flex: 1 1 0`), causing text overlap/overflow | Rebuilt §1 as 2-plane responsive grid stacking cleanly at `<= 900px`; `clippedNodes: 0` at 390px |
| F57 | P1 | fixed | 4 literal `` `n `` syntax errors in `mooncake.css` broke 4 `:hover` rules and caused Vite build warnings | Rewrote clean `mooncake.css`, removed 25 dead classes; `npm run build` produces 0 CSS warnings |
| F58 | P2 | fixed | §1 lacked engineering difficulties, control/data-plane bridges, and rejected design alternative; chapter metadata still promised paper-only CPP | Rebuilt §1 around 3 source-backed difficulties + 2-plane map + rejected-alternative note; aligned `chapter-registry.js`, `AGENTS.md`, and footer `relatedNote` |
| F59 | P2 | fixed | §2 (`HitPath`) referenced Round-5 trace before §3 (`TierCanvas`) introduced the trace | Ordered §2 (`TierCanvas`) -> §3 (`HitPath`) with a direct "Jump to round-5 move" control |
| F60 | P2 | fixed | `deriveEconomics` marked `ssd @ 18k / 256` (`savingMs = -0.24 ms`) as `marginal` instead of `loss`, and SVG threshold/break-even labels overlapped | Fixed `savingMs <= 0` loss check with distinct `lookup` vs `bandwidth` loss copy; staggered overlapping SVG labels and formatted `< 1.1×` to 2 decimals |
| F61 | P2 | fixed | `TierCanvas` chart swapped L2/L3 colors, L1/L2 cells weren't clickable, `.mk-master` collided, `reused`/`computed` lacked `Token` unit | Aligned chart colors (L2 blue dashed, L3 purple solid), made L1/L2 cells clickable buttons, renamed badge to `.mk-master-pill`, added `Token` units and X-axis label |
| F62 | P2 | fixed | `HitPath` `l2ShareNote` reversed causality, showed `4 × NIC` against `190 GB/s` (8×400GbE), colored fetched pages grey, and framed TTL lease as an explicit `release(lease)` RPC | Fixed copy, derived `8 × NIC` and `writeSegment` from `scenario`, aligned L2/L3/new cell colors, accurately described TTL lease expiry |
| F63 | P3 | fixed | `simulateTrace` hardcoded `READOUT.prefillRate` for `baselineMs` instead of `seconds.prefillRate` | Used `seconds.prefillRate` consistently and added regression assertion |

## Boundaries and limitations (as stated on the page)

- Times are an analytical critical path (one metadata lookup per request, serial prefetch then load, no batching or queueing); HiCache overlaps L2→GPU load with compute (owned by Radix HiCache).
- Teaching capacities preserve the 240 GB : 760 GB ratio; the trace lowers prefetch threshold to 1 page and states the 256-token production default.
- SSD is modeled by streaming bandwidth only (no per-object tail latency or NVMe queueing).
- The FAST 2025 paper's global Conductor scheduler and CPP prefill pool are not open-sourced and are kept as an explicit source boundary only; PG/EP is noted as an orthogonal module.
