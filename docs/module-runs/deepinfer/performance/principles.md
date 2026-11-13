# DeepInfer: why performance and cost improve

Reader concern: why this engine and its surrounding production system can serve more useful inference per unit cost. The earlier hierarchy answered how requests progress; it did not answer this concern. The accepted outcome is a causal explanation, not exhaustive internals or a scheduler demo.

Expected reader answer: production efficiency comes from avoiding repeated prefix work and decoder prefill, distributing MoE work so each GPU reads less expert data and executes efficient fused kernels, and keeping phase pools/ranks/CPU-device pipelines from waiting. These depend on model structure, fast interconnect, cache reuse and sustained suitable traffic. More useful throughput at a fixed latency/quality target can amortize hourly costs; reported revenue alone cannot establish profit or payback.

## Outcome to causes

Useful volume under latency constraints → less repeated work / efficient model steps / less waiting → shared cache + CED bounded replay / Wide-EP + EPLB + Mega MoE and low precision / P-D disaggregation + load balance + async execution. These effects interact; no multiplication of claimed isolated gains.

## Hierarchy and ownership

The main connected production path is request → Prefill → KV/state transfer → Decode → output, with shared KV persistence feeding future Prefill. Select storage, execution or stage allocation to inspect a narrower cause. These cooperate. The existing queue/batch/execution/state hierarchy and timelines become an optional engine-level drill-down.

| Concept | Depth here | Owning detail |
|---|---|---|
| Shared storage, routing freedom, P/D pool sizing | Explain their production integration and costs here | Prefix caches in Radix HiCache |
| CED, approximate SWA bounded replay | Why less prefill is required; model-specific dependency | DeepSeek CED |
| Wide-EP, EPLB, fused MoE, FP4 | Explain traffic, stragglers and kernel role; show source comparison | Parallel Strategy / Quantization |
| DSpark | Effect on useful output and workload dependence | Spec Decode already has DSpark |
| Async scheduling | One source of waiting removed; optional detailed timeline | Engine loop here |
| Economics | Revenue vs net cash, assumptions, sensitivity, no universal payback | This chapter |

## Evidence and visible consequences

All DeepInfer claims pinned to official commit 553741557a57df44a46fb3ab72b6aafeaf945337: [Q&A](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md), [README](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/README.md).

- Q&A introduction: 155T tokens/day per cluster and $38/GPU-hour at valley prices are full production-service claims. Definition of revenue must remain explicit; do not infer output-token throughput or profitability from them.
- System overview: small EP Prefill / wide EP Decode and separate pools. Offline Wide-EP chart is included unchanged, with context 131072, nextn3, acceptance75%, experts384+64 vs384+32. It establishes a workload-specific throughput/interactivity frontier, not a full-system speedup.
- KV storage/recomputation: shared 3FS, ~100PiB, agent3d/chat7d, approximate decoder SWA replay128 and nearly half prefill compute. Input-coverage slider is an explicitly illustrative count, not official hit rate/time/FLOPs. No exact 100% runtime-cache promise.
- EPLB: replicas and periodic reassignment remove hotspots at memory/reshuffle cost. Four-rank equal-duration work example conserves32 jobs; max16 vs9 is illustrative, not a measured speedup. The fixed16 scale and batch finish are visible.
- Kernel implementation and DeepGEMM [Mega MoE](https://github.com/deepseek-ai/DeepGEMM#mega-moe) document fusion/overlap of dispatch, linear layers, SwiGLU and combine. No inferred quantitative end-to-end gain.
- Q&A autoscale/load balancing/async: phase-specific demand, replica routing, reserve/transfer cost. Eight allocation shares illustrate independent resources, not physical GPUs or a performance prediction.
- Economic calculation: illustrative CAPEX30000, hourly expense8, realized revenue100% of38 gives720/day net,41.67days. If expense≥income, recovery undefined. Inputs are hypothetical, price/mix-sensitive, not a recommendation. Official one-month payback not found in inspected README/Q&A; linked Zhihu article returned403 and is not claimed read.

## Representation decision

Retain React/DOM/CSS and shared KaTeX. Selectable connected architecture, aligned horizontal bars, stage allocation and sensitivity calculations need semantic controls and responsive text rather than a graph/GPU renderer. A force graph would obscure the fixed service path; canvas would add accessibility and theme work without explanatory benefit. Original source image is optional provenance, not the main interactive explanation.

Wide-EP explanatory model: same8 illustrative GPUs,32 tokens,8 equal experts, top1 uniform routing. EP2 has4 full expert-set groups; EP8 has1. Each rank retains4 vs1 expert weights while processing4 expert-token jobs in both cases. Under the explicitly ideal one-read-per-expert-per-step model, total weight units32 vs8, tokens served per weight1 vs4. This is not a real memory-traffic ratio or measured speedup.

Final reconciliation: current 26-file snapshot and independent production outcome review cover this contract. EP topology, illustrative top1 assumptions, economics variables and stable theme evidence are included; see qa.md for executed coverage and limitations.
