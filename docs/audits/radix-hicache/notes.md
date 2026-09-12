> Superseded by the unified-workbench refinement below: the user rejected keeping Radix and HiCache as separate demonstrations. The former foundation UI is now removed. Earlier evidence is retained as iteration history.

# Radix HiCache upgrade — 2026-09-12

## Contract and placement

User authorized a comprehensive upgrade of the existing Radix chapter, named **Radix HiCache**, with no additional sidebar chapter. Keep the existing GPU-only standard/Radix comparison as the foundation demonstration. Add an architecture-led tiered workbench before it, with local controls scoped to each demonstration. Keep the shared shell, global language and share button. The stable route remains `#radixcache`.

Captured baseline in before.png. Original foundation model, physical pool, split/lock/eviction behavior and pseudocode are retained. Its title becomes a section heading, leaving one chapter h1. Sidebar/home labels, search description, README chapter row and sharing whitelist follow the new name and controls.

## Domain and claim ledger

Primary source inspected: [SGLang HiCache design](https://docs.sglang.io/docs/advanced_features/hicache_design), accessed 2026-09-12. The old GitHub docs path returned 404; the official docs redirect provided the current design page.

| Basis | Model consequence / visible evidence |
|---|---|
| L1 GPU and L2 host are instance-private; L3 scope is backend-configured | Tier headings and click inspectors distinguish scope. Peer scenario starts with no local cache but four compatible remote pages. No shared L2 is implied. |
| HiRadixTree records local location metadata and queries remote existence | Physical backend is shown as an explanatory system view; local node badges say L3 ? until query completion. Request-path ghosts are distinguished from local indexed nodes. |
| Match returns a continuous, page-aligned prefix without moving data | Match checkpoint changes references only. Page identity survives tree, transfer, physical slot and inspector. |
| L3 prefetch lands in L2; L2 pages load into GPU before compute | Explicit acknowledged copy events, followed by a missing-suffix prefill event. Model tests assert sources exist before copies. |
| Prefetch termination policies change accepted completed prefix | Fixed teaching arrival schedule: GPU ready before first remote page, timeout after one, wait_complete accepts all remote hits. Unfetched suffix is recomputed. Outcomes are not universal policy constants. |
| Write-through, selective and eviction-triggered backup differ | Copy events are generated from policy and existing replicas. Selective example threshold is two; P0 alone is hot. write_back protects the eviction victim by backing it up before release. |
| Active references protect GPU pages | Pressure case evicts unreferenced X while P0 stays protected. Request end releases references but retains replicas. |
| GPU layer-oriented compute and host page-oriented transfer have different organization | Coupled layout matrices highlight the same page/layer cell; copy/layout/overlap boundaries are explained beside them. |

Capabilities: timeline, structural comparison, resource metrics, data movement, dense layout. New runtime pseudocode shows allocation, completion acknowledgment and metadata publication; it is labelled teaching pseudocode, not executable SGLang calls.

## Model boundaries

- One 320-token request, five 64-token pages, each a teaching 1 MiB. Page sizes, capacities and payload bytes are not model measurements. Prefetch trigger threshold explicitly set to 64 tokens, not the production default.
- Six initial residency scenarios × three prefetch policies × three write policies. Scenario changes reset the new timeline. Layer/phase CED state is deliberately outside this chapter.
- Checkpoints represent completed operations, including transfer acknowledgments. Initial step is structure preview; autoplay takes two seconds per checkpoint and ends after release. Serialized teaching checkpoints are not a real engine timing profile.
- Capacity is a finite slot budget (normally GPU 8, host 12, external 24; pressure GPU 6). Allocation uses the first free slot and eviction leaves a hole. Other page addresses never shift.
- Prefill savings compare the same initial GPU prefix against the available tiered prefix. Read traffic counts both transfer hops; completed traffic includes reads and writes. Neither is a measured latency or throughput estimate.
- No failure injection, host-pool exhaustion, distributed rank execution, prefetch threshold tuning, real scheduler, data-plane benchmark or CED replay is simulated. Host/remote copies already present do not incur another write. Cross-instance reuse assumes compatible prefix/model/layout namespaces and a shared L3 backend.
- Initial cache contents are scenario fixtures. Immediate/selective writes are grouped at the eligible write checkpoint; background write concurrency is not simulated. Cold unbacked X can be dropped under non-write_back policies and later recomputed.

## Verification

- `npm run check:radix`: unchanged foundation regression plus 412 new checkpoint snapshots across all 54 configurations. Checks continuity, capacities, copy-source readiness, reuse/recompute totals, stable slot addresses, lock protection, replicas and final release.
- Confirmed defect fixed: deleting X initially compacted the resident array, incorrectly moving Y from G2 to G1. Slots now retain holes; a permanent assertion pins Y at G2 through eviction.
- `npm run check:workbench` includes new HiCache configuration round-trip and malformed-value rejection; existing routes still pass.
- Browser: pressure + write_back confirms X copied to H4 before G1 is freed, Y stays G2, P1 reuses G1, P4 lands at G5. Clicking physical P4 highlights its tree node and inspector. Three prefetch outcomes yield 64/128/192 recomputed tokens and 5/3/1 MiB read traffic in the mixed case.
- Browser: English and Chinese, desktop and 390px phone. Phone document client/scroll width both 375px, no visible workbench overflows. One h1 and one shared language control. Source/target selection and physical pages remain readable.
- Browser: autoplay reaches request-complete and stops. Local inspectors, layer/page layout selection and existing foundation controls are checked. Separate DevTools log capture and screen-reader certification are not claimed.
- Production build, required module convention checks, coverage manifest and whitespace checks pass. Existing Browserslist age warning remains.

Local review delivery. No commit or push requested for this implementation turn; unrelated debug.log remains untouched.


## Unified workbench refinement (latest acceptance contract)

The user explicitly requested one Radix Tree and one request flow, with HiCache represented as extended residency and retrieval rules. Removed the standalone foundation UI and its separate playback controls. `RadixCache.jsx` now composes only the unified workbench. Legacy pure-model code is retained off-screen, but is not another chapter or mode.

- One canonical model exposes compressed/shared tree nodes, physical pages, per-node GPU references, tier residency, initial hit provenance and retrieval decisions. A new split scenario starts with `[P0,P1,A]`, then splits into shared `[P0,P1]` with old suffix A and new request branch P2 onward. Split changes metadata only; physical addresses and page counts remain unchanged. Pending request branches remain dashed until inserted.
- Available-storage configuration compares GPU-only with hierarchical storage on the same scenario, rather than switching between independent Radix and HiCache presentations. GPU-only disables host/remote policies, removes their events and has no cross-tier traffic. Nodes still use the same prefix logic.
- Match ledger distinguishes GPU direct reuse, DRAM loading, remote prefetch and recomputation. Local misses remain unclassified until the remote lookup completes. Remote existence metadata is known only for queried suffix positions, not automatically for all local prefixes.
- Existing example source/ownership/latency boundaries remain. The model is a page-aligned educational radix tree, not a byte-for-byte reproduction of SGLang's node implementation. Old plain per-request cache comparison is no longer exposed. Sharing drops the obsolete RadixCache.modelType setting and includes HiCache.storageMode.
- Regression: 748 checkpoints over 126 scenario/policy/tier configurations, plus explicit split topology/address assertions. `unified-qa-matrix.json` has 130 coverage cases. Required module conventions, sharing regression, build and diff checks pass.
- Rendered: one tree and one playback group, no foundation header. Chinese/English desktop and 390px views; 768px layout stacked. Phone intrinsic select widths initially overflowed by 5px; fixed with min-width:0 and width/max-width:100%, verified client/scroll width 375/375. Tablet 753/753. Physical page selection highlights its containing tree node; shared-node sibling pages are linked visually.
- New evidence: before-unification.png, unified-split-zh.png, unified-mixed-zh.png, unified-mobile-en.png, unified-mobile-zh.png, unified-desktop-en.png. Autoplay and source-route switching verified. No push requested.
