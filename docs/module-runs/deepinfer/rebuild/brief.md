# DeepInfer — coherent reader path rebuild

Authorized full rework with updated Skills. Reader question: how DeepInfer and its production system turn the same compute resources into more useful serving under latency constraints, and when that lowers cost.

Thesis: retained history eliminates repeated input work; model-specific reuse removes decoder prefill work; wide expert groups amortize weights; fused execution overlaps communication/computation; service and CPU/device scheduling keep the useful work supplied. Each acts on a different cost. Storage, interconnect, demand and numerical constraints determine whether the whole is worthwhile.

First view shows a concrete long-context request, P/D instances, shared KV and output. All detail views live in this same workbench and retain the overview plus breadcrumb: service→cache / Prefill / Decode / coordination; Decode→MoE fusion; coordination→CPU/device overlap. No separate generic engine architecture or appended request-course. Selecting Prefill never exposes DSpark. DSpark remains a contextual Decode link, with its algorithm in Spec Decode.

Interactions must reveal mechanisms: cache blocks move from3FS→host→engine while uncached blocks go through Prefill; expert tokens retain identities and route to distributed weights, with reads/work/replicas computed; fused pipeline processes the same tiles on communication and compute lanes while buffers/communication remain; same two resource lanes show mixed-vs-separated work and its latency tradeoff. End-to-end speed and revenue are not inferred from toy models.

Main economics is cost per useful volume under a service target, explained after the mechanism. Official production metrics and conditions are secondary evidence; arbitrary payback calculator removed. Kernel and precision internals beyond the framework's necessary causal relationship link to their chapters.

Renderer decision: React/DOM/CSS plus small SVG connector for selected routes. Stable labelled records, explicit ownership and two-lane schedules benefit from semantic controls and responsive text; canvas/graph layout adds no clarity for fixed topology. Existing shared language/theme/math/sharing contracts remain. New lesson configuration persists; local view/selection/playback resets on navigation. Retired experiment share fields are ignored.

QA: pure mechanism invariants, actual journeys, light/dark × zh/en ×1440/900/390 with representative states, current OS System branch, and mandatory owner continuous read including each mechanism and actual return mapping. Independent review supplements owner reading. Old passes cannot waive the reopened teaching gaps.
