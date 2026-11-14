# Correct principles, faithful implementation depth

Use when a chapter explains a real framework, runtime, kernel or model-specific execution path, or when feedback questions its correctness or distance from implementation. This is evidence work behind the explanation; it does not require exposing a repository tour, code panel or extra controls on the page.

## Evidence precedence

For behavior, **pinned source code outranks documentation, and documentation outranks a paper's design description**. Use the strongest level available for each claim:

- **Source code at a pinned revision** — APIs, ownership, ordering, publication, leases, transfer paths, allocation. If code exists for the mechanism, do not base an implementation-level claim on a paper or design doc alone.
- **Official design or deployment docs** — use for context, intent and parts the source does not cover. A doc claim contradicted by code loses.
- **Paper** — use for the design and its rationale when the implementation is unavailable, or when the chapter explicitly explains the paper's design. Then label it as design, not current behavior.

When code and paper/docs diverge, teach the code and note the divergence and the version. Record the evidence level in the claim row; “the paper says” is not a substitute for a source check when the source exists.

## Choose the evidence level for the claim

Primary papers can establish a mathematical algorithm and design motivation. Official architecture documents can establish a deployment design. Claims about actual allocation, tensor layout/dtype, routing, buffer use, dispatch, synchronization, state updates or implemented constraints require the matching implementation source. A README feature list, kernel name or plausible pseudocode is insufficient.

Record the revision and relevant model/configuration, backend/hardware, Prefill/Decode or training/inference context. Supported capability is different from the enabled path. Do not splice a reference CPU routine, one CUDA backend, a different model version and a production deployment into a single purported execution. Check callers and configuration as well as the named kernel; read the actual branch and its data transformations, not just comments or declarations. When docs/comments and code disagree, resolve and version-bound the claim instead of silently choosing the convenient description.

Source establishes the behavior of that revision, not automatic mathematical correctness. If it contains a bug or differs from the algorithm specification/reference, report the divergence; do not teach the bug as a general principle merely to match the implementation.

Repository orientation tools are useful when needed, not a required full-codebase exercise. Follow a representative vertical slice far enough to establish the claimed relationship: input/metadata → allocation or state lookup → selected operator/collective/kernel → result/state write-back and its dependency. Inspect additional branches when the chapter exposes or generalizes over them. Stop once the central facts are supported; do not display every dependency because it was researched.

## Separate the paper's design from the current implementation

A system that began as a paper usually has three layers that must not be blended: the paper's design (services, scheduler, interfaces), the current implementation (renamed services, new components, a different division of labour), and the deployment or benchmark context. Pin the paper revision and section, and read the actual passage for anything interface-level: who sends what, which IDs or decisions cross a boundary, what the scheduler checks and when. Do not fill those details from plausibility or memory.

When the implementation has moved on — a scheduler becomes an index, a service is renamed, new layers join — state which layer the chapter draws and name the difference where the reader meets the architecture, not only in the run record. A page that draws the paper's serving form must say so; a page that draws today's stack must not attribute the paper's guarantees to it.

A claim added after the first research pass returns to the primary text before it enters the ledger or the page. Record the pinned locator and the paper-versus-implementation boundary in the same claim row; a mechanism name that changed in the implementation is part of the claim, not a naming preference.

## Plan a faithful descent

Use only the depth needed by the learning question:

- **Intuition:** a small concrete example exposes the constraint and useful change.
- **Mechanism:** shapes, operations, ownership and dependencies explain why the change works.
- **Implementation:** map those same objects to a real data layout, runtime operation and selected code path, including the relevant cost/constraint.

These are explanation levels, not mandatory tabs or panels. Keep object identity and parent context between them. Explain what was omitted or changed in the small example. The shallow level may shrink dimensions, sample channels or omit secondary operations; it may not change normalization, numerical meaning, dependency order, data ownership or the condition that makes the mechanism valid. A generic “illustrative” label cannot excuse a false causal relationship.

At implementation depth, retain relevant distinctions: logical values versus resident buffers, one user's state versus shared state, allocated capacity versus active payload, arithmetic dtype versus stored representation, necessary ordering versus a global serial barrier. Resource accounting includes source-relevant scales, metadata, padding, scratch or duplicated state; count only the scope actually modeled. Educational time units and ideal traffic are not measured kernel latency or a production speedup.

## Extend the existing claim record

Keep this in the existing research/principles/claim ledger rather than creating a separate document for every mechanism:

| Field | Evidence needed |
| --- | --- |
| Claim and level | General algorithm, deployment design or real implementation behavior |
| Exact context | Revision, configuration/backend and active execution branch |
| Primary locator | Pinned file and symbol/line permalink; caller/callee where necessary |
| Runtime fact | Concrete input/output shapes, layout/ownership, operations and dependency |
| Teaching mapping | Page objects, transitions, formula/pseudocode/metric and local controls |
| Simplification | What is omitted, what must stay invariant, what is unknown |
| Correctness check | Independent expected result, reference trace or source-derived invariant and a relevant boundary |

An inference is still an inference: state its basis and uncertainty. Keep internal evidence status in the research record; surface only the relevant explanation and concise limitations to readers. Links help the reader inspect provenance, but a link's presence is not proof that the implementation was actually read or modeled correctly.

## Verify before calling the deep view aligned

Trace a concrete small input through the selected source path and the chapter's canonical model. Compare outputs and important intermediate facts. Depending on the claim, use hand-derived oracles, a trusted reference computation, upstream tests/fixtures or executable checks on the relevant routine. Inspect shape boundaries, partial groups, empty work, cache hit/miss, final commit and exposed non-default modes where they can falsify the claim. Choose relevant cases rather than demanding every listed test for every topic.

Use the appropriate numerical tolerances and approximation assumptions. Do not demand bit-identical results across different arithmetic paths or teach an approximation as exact equivalence. If the actual algorithm deliberately changes numerical results or quality, explaining that tradeoff is part of fidelity.

Tests copied from the visualization's own logic establish consistency, not agreement with reality. Reconcile the source fact → model result → visible object/operation/explanation for each central claim; correct arithmetic with a wrong layout or a missing wait still fails. An independent technical review should check this correspondence, separately from whether the narrative and interaction are understandable.

Without suitable hardware, verify the mathematical/reference and structural relationships that can be established and disclose that actual device timing, concurrency, numerical behavior or performance was not reproduced. Static reading does not establish hardware performance. Lack of hardware also does not justify inventing implementation behavior. If source access or decisive evidence is missing, use a supported conceptual scope, clearly bound an inference or leave the affected deep claim unverified. A central mismatch or unsupported promise of implementation fidelity blocks delivery as technically complete; repair the claim/model/view or obtain the necessary evidence.

Existing chapters do not become source-verified retroactively when this guidance changes. Audit the affected claims and modes when revising or checking them, and preserve the actual scope/status of previous evidence.
