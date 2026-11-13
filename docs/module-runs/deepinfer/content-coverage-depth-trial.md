# DeepInfer: source inventory → actual page coverage

2026-10-27. Source: independent `technical-analysis.md`, pinned DeepInfer `553741557a57df44a46fb3ab72b6aafeaf945337`. This table describes explanation depth, not a claim that every feature is simulated or benchmarked.

| Analysis inventory | Actual UI / action → observable result | Depth and boundary |
|---|---|---|
| E/P/D, VE, Wide-EP and request routing | `deepinfer-system`: image→VE→embedding→Prefill branch, P→D path and storage read/write; choose deployment inspector | Connected production documentation overview. Public offline engine is a separate boundary; no invented online load balancer. |
| Scheduler, chunking, admission | `deepinfer-trace`: vary prompt mix and prefill budget, step/sample/commit | Existing runnable logical model; two decode-ready slots and sufficient blocks. Does not simulate time-quota quadratic solving or physical memory preemption. |
| GPU blocks/state vs production prefix storage | Cache inspector + request token history | Ownership and full-prompt reservation explained. Block pressure, external 3FS/GDR and cache hit rates are not simulated. |
| ZOS and device metadata | ZOS inspector + `deepinfer-overlap`: sync/async, select operations | Runnable dependency schedule with explicitly synthetic durations and final drain; no measured GPU timings. |
| CUDA Graph and cost curve | Graphs inspector connects query rows, padding, fixed storage and DSpark budget | Source-backed explanation. Does not claim graph rows equal request count or simulate GPU capture. |
| Attention / indexer / FlashMLA / DeepSelect | Attention inspector: two source-linked entry chains | Prefill uses concatenated KV global indices; Decode maps through block tables to physical slots. SWA and selected compressed history coexist. No vendor tile/SASS simulation. |
| Cross-layer source sharing, candidates, balanced CP | Attention/system inspectors, neighboring sparse/CED workbenches; detailed source contracts in analysis | Contextual coverage, not a new layer-by-layer candidate/source simulator. CP support is explicitly distinguished from the documented production configuration. Actual checkpoint layer map is unverified. |
| Low precision and TileLang layout contracts | Precision inspector: choose Main/SWA/Indexer → byte bar, data/scale/total and formula change | Actual source-format accounting: 288/528/68 B per record. Excludes metadata, extra alignment and whole-model memory. No quantization-quality or throughput claim. |
| MoE parameters/routing, Mega vs fallback | Mega inspector: vary platform predicate, NVLink domain and precision → different operation path | Source predicate reproduced; logical gate→physical expert mapping precedes the exclusive branch. Library-call boxes do not claim one hardware kernel each. |
| EPLB | Expert-placement inspector connects statistics, replicas, weight migration and gate mapping | Explanatory drill-down with costs. No fake per-token weight movement, measured rank balance or request-routing simulator. |
| DSpark / DFlash / confidence | Verification inspector: change budget/profile → chosen prefix rows, total q and expected draft contribution | Runnable fixed-budget prefix allocator with exhaustive oracle. Mandatory main rows remain. Real cost-curve budget selection, target verification, acceptance rollback and draft model execution are not simulated. |
| SWA bounded replay / YOCO compact | Cache inspector connects CED projection, replay and reused block KV | Approximation explicit; documented 128 replay window differs from public default 140 compact retained rows. Existing CED chapter is prerequisite material; current checkpoint config is not inferred from it. |
| Engram / mHC | Model-fusion inspector explains prefetch/wait, lazy post, intervention/fusion boundaries and MoE layout | Source-backed integration explanation; Engram storage differs from prefix KV. No claim of model originality or all-layer fusion. |
| Structured output, platforms, reproducibility | Runtime-contract inspector connects grammar compilation, sampling mask and protocol boundary | NVIDIA batch invariance + fixed seq_seed + MTP varlen disabled identified for deterministic sampling. No grammar editor or arbitrary-platform determinism claim. |

## Coverage verdict

The chapter now accounts for the source inventory with a system context and connected runtime story, and deepens selected mechanisms through actual transformations. Several branches deliberately remain source-linked explanations rather than simulations. The separate technical report is deeper than the visible inspector prose. Missing external submodule contents limit claims about internal fused kernels; the report states what source access would resolve them. These bounds must stay visible in delivery; neither 19 inventoried mechanisms nor 11 navigation entries is itself proof of teaching quality.

This was a repair after user feedback and independent review. It is not an error-free first implementation and does not establish a general one-input success rate for the skill.
