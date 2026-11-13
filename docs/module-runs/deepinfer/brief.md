# DeepInfer real-case teaching contract

## Current contract — 2026-10-28

The current hierarchy/focus redesign supersedes the feature-inventory page. Read `hierarchy/principles.md` for the framework-level question, three meaningful levels and chapter ownership; `hierarchy/qa.md` records current acceptance. Keep the request/compute/state loop and async principle here, explain dependency interfaces, and place algorithm internals in their owning chapters. Chinese prose is reviewed as a connected explanation. Earlier trial contracts below are historical. The previous depth run is retained in `run-depth-trial.json`.

## Scope correction after user review

The initial contract below deliberately concentrated on the offline engine loop and ZOS. The user correctly identified that this did not fulfill the broader framework explanation: the kernel, distributed execution and production-architecture story was too thin, and appearance acceptance omitted Light/Dark/System. The earlier evidence is retained as the narrower engine trial (`run-engine-trial.json`), not proof of full framework coverage.

The current extension adds a connected production E/P/D/VE and storage overview, 11 mechanism drill-downs, distinct prefill/decode index contracts, an actual MoE dispatch-predicate experiment, a fixed-budget DSpark prefix-allocation experiment and a source-format KV byte ledger. CUDA Graph/profile costs, precision/layout, Engram/mHC integration and deployment/public-code boundaries connect the mechanisms. `technical-analysis.md` is the independent source study; `content-coverage.md` reconciles that inventory with actual UI depth. Existing engine trace/timing regions retain their behavior and order below the added system view.

There are nine shared primary settings: the previous scenario/budget/overlap plus kernel GPU/domain/precision, verification budget/confidence and cache format. Drill-down selection remains local presentation state. Full revised appearance acceptance crosses Light/Dark with Chinese/English and 1440/768/390 widths, plus a System resolution journey and selected/moving/terminal boundary checks. Only the currently available OS appearance branch can be exercised through this browser; no claim is made about both OS branches.

## Initial engine trial contract (historical)

2026-10-27. Create a new integrated chapter and use its actual implementation/QA failures to refine develop-interactive-module. Preserve unrelated chapters and the existing workbench contracts.

## Question and scope

How do the offline entrypoint, CPU scheduler and device worker cooperate to make progress, and how can the CPU prepare another decode step before it has committed the previous sampled token? What remains outside the public engine release?

Resolved identity: official deepseek-ai/DeepInfer, pinned commit `553741557a57df44a46fb3ab72b6aafeaf945337`; primary code in external research clone. Architecture overview includes the collaborating Attention DP/CP, MoE EP/EPLB and sampler/DSpark branches, with source-backed inspectors and links to existing deep-dive chapters. Do not duplicate existing sparse-attention, CED and speculative modules.

## Representation and technology

Considered a Canvas architecture scene versus semantic DOM cards/edges, concrete token cells and SVG/CSS timelines. The scene has six selectable subsystems and at most four requests, so DOM affords responsive text, keyboard interaction and precise source links without a dense rendering bottleneck. Use React for integration, CSS grid for the connected architecture, and proportionally positioned timing segments. No new runtime dependency is justified; technology remains open for a larger scene.

First view: connected engine architecture with persistent host/device groupings and a contextual inspector. Then one actual request timeline: schedule a bounded prefill chunk, compute it, sample only at the final prompt chunk, commit output, decode and retire. Short prompted/output cells preserve identities A–D across views.

The request trace is a **synchronous logical teaching subset**, not a complete ZOS implementation: NORMAL engine, one rank, nextn=0, prompt-attempt interval1 (real default70), two decode slots, sufficient blocks, no KV preemption/multimodal/branching. Prefill batches are exclusive from decode, incomplete prompts emit zero outputs, first output comes from final prefill, finished requests retire through a subsequent cleanup. No physical block count or prefix-cache service is fabricated. Full-prompt allocation and deferred release are explained with source boundaries.

A separate local dependency comparison isolates ZOS: CPU scheduling, device forward, sampling and CPU output commit, three illustrative rounds. Schedule=1, forward=4, sample=1, commit=2 dimensionless units. Source dependency: device sample i feeds forward i+1; prior host result processing can overlap current forward; final async output needs flush. These durations are deliberately synthetic and do not estimate DeepInfer throughput or benchmark speedup. Nextn=0 avoids conflating speculative acceptance-length correction with sampled-token remapping.

## Controls and expected observations

- Scenario mixed/pressure/long changes prompt/output fixtures, while retaining the two-slot toy limit. Pressure means request-slot contention, not simulated memory exhaustion.
- Prefill token budget4/8/12 changes chunk lengths/batch count; total prompt computation and final output counts remain constant for each scenario.
- Reset/play/pause/step/scrub govern only the request trace; changing its inputs resets progress. Selection opens a subsystem inspector without changing execution.
- Async toggle governs only the local host/device dependency comparison. Both schedules remain visible and share the 24-unit baseline scale. Single-round boundary has no overlap benefit; first scheduling and last drain remain serial.
- Configuration survives Home/navigation, playback and inspector selection unmount; shared links restore only the three registered primary settings.

## Acceptance

Capabilities: timeline, multiple-modes, resource-metrics, structural-comparison, data-movement, dense-layout, math. Full source/model/browser/render/integration gates; Chinese/English at desktop, tablet and mobile, dense and terminal states, keyboard selection, reset/replay, mid-run input changes, Home return and share links. Retain first-build evidence separately from fixed/final evidence and label autonomous corrections accurately. Reviewer must independently assess the actual code/scene against the source basis. Skill changes must address observed reusable failure, not merely prescribe this chapter's shape.
