# Independent implementation-fidelity transfer — 2026-11-13

## Test scope and version

Reread the final on-disk `analyze-technical-principles/SKILL.md`, `develop-interactive-module/SKILL.md`, and the newly linked `references/implementation-fidelity.md` for this test. No scenario criteria, parent notes or previous verdicts were read. The request and synthetic fixture-v1 supplied in the task are the complete evidence basis for the operations described below. They are not a real library or hardware execution.

Before closing, reread `implementation-fidelity.md` again after its additional numerical-tolerance/approximation paragraph was added. That final paragraph is included in the evaluated reading scope. This integer-allocation/dependency fixture does not exercise floating-point equivalence or quality tradeoffs; no such test coverage is claimed.

Only this report was written. No implementation, browser work, external research, goals, test execution or other writes occurred. The earlier A/B/C transfer report remains scoped to the skill version it originally read; this new test does not retrospectively upgrade its coverage or any earlier chapter's verification status.

## Decision

The **assessment and bounded repair handoff can be delivered now**. The candidate deep view **cannot be accepted as aligned with fixture-v1**: it assigns the wrong format to the exposed CPU branch, confuses payload bytes with allocated bytes, and violates the same-input dependency represented by the runtime. These are central technical mismatches, not copy polish. Existing tests repeating the display's own formula and checking for UI exceptions do not address them.

The request says “先不要改页面”, so stop at this assessment. No approval question or implementation is necessary. A future implementation task would repair the model and representations, then perform relevant model/browser checks and the owner reader pass; this exercise does not claim those gates passed.

Reader concern: “低精度缓存究竟省在哪里？异步提交为什么仍然要等依赖就绪？” Expected answer: one-byte payload can reduce a particular storage component, while scales and alignment change the total allocation; asynchronous submission does not permit a consumer to read its own input before that input is ready. Independent work may overlap, but its existence and realized performance require their own evidence.

This preserves a correct shallow introduction and a faithful descent: small dimensions are allowed; deleting costs or reversing dependencies is not. A disclaimer that the page is illustrative cannot repair either error.

## Evidence level and claim ledger

No broad repository tour or visible source-code panel is required. The actual allocation/dispatch/dependency claims require reading the supplied implementation, including both exposed backend branches. The README supports a capability statement and a narrow payload statement; the implementation provides the accounting and order needed for the deeper claims.

| Claim | Primary locator and exact context | Supported fact and teaching mapping | Boundaries / check |
|---|---|---|---|
| CUDA uses an FP8 mode | fixture-v1 `runtime.py::decode`, `backend == 'cuda'` branch | Derived mode is `fp8`; the CUDA object/inspector may show that mode | No quantization, arithmetic precision, kernel, or numerical error routine is supplied |
| CPU reference uses another mode | Same symbol, else branch; exposed switch values are cuda/cpu | CPU derives `bf16_reference`; backend labels, explanation and provenance must change together | Else covers all non-cuda values in this function. This is not evidence about other libraries' CPU capabilities |
| One-byte versus two-byte payload | fixture-v1 `layout.py::allocation` | CUDA payload has one byte per represented element; non-CUDA has two | Shape interpretation/physical strides beyond this arithmetic are not supplied |
| Returned allocation includes extra costs | Same symbol | CUDA scale term is four bytes per token/head pair; both branches round their modeled sum up to 256-byte units | No allocator fragmentation, device slabs, scratch, duplicated states or total process memory is modeled |
| Consumption depends on this copy | fixture-v1 `runtime.py::decode`: copy, event record, wait, consume, all using this invocation's `x` | Show A copy → ready event → compute wait → consume A, preserving identity | With conventional stream/event semantics. Helper implementations and device execution are absent |
| Independent work can overlap | fixture-v1 README, capability only | A conceptual independent-work lane may explain the condition | `decode` does not contain a demonstrated independent operation. No trace proves actual overlap or its size |

Locators are the supplied revision/file/symbol, not invented public permalinks. The source excerpt is sufficient for these branches' formulas and intended ordering, not a complete runtime. It does not establish the numerical correctness of FP8 quantization, successful hardware dispatch, device concurrency, runtime durations, or a throughput gain.

## Allocation: concrete trace and corrections

Let \(T,H,D\) denote the function's tokens, heads and dim arguments. Derive, rather than independently storing in the UI:

\[
P_{\mathrm{cuda}}=THD,\qquad S_{\mathrm{cuda}}=4TH,
\]
\[
P_{\mathrm{cpu}}=2THD,\qquad S_{\mathrm{cpu}}=0,
\]
\[
A=256\left\lceil\frac{P+S}{256}\right\rceil,\qquad R=A-P-S.
\]

Here \(P\) is payload, \(S\) scales, \(A\) the function's returned allocation, and \(R\) padding. These equations reproduce the supplied integer routine for the nonnegative integer shapes used here. The fixture supplies no input-validation contract, so do not invent negative-dimension normalization or assume every degenerate shape is valid production input.

For the requested shape, the following are **hand-calculated from the supplied routine, not executed**:

| Backend | Runtime mode | Payload | Scales | Before rounding | Padding | Returned allocation |
|---|---|---:|---:|---:|---:|---:|
| cuda | fp8 | 30 B | 24 B | 54 B | 202 B | 256 B |
| cpu | bf16_reference | 60 B | 0 B | 60 B | 196 B | 256 B |

Thus “30 B versus 60 B” is a valid payload comparison for this fixture. “Allocated cache: 30 B versus 60 B, always 50%” is false. For this shape CUDA payload is half, pre-rounding modeled storage is 10% lower, and returned allocation is equal. The 10% is derived arithmetic, not a device-memory measurement. The CUDA allocation is not universally half and may even be larger for some shapes.

An important general boundary follows before rounding: CUDA's payload plus scales is \(TH(D+4)\) while the other branch is \(2THD\). At positive \(TH\), their equality occurs at \(D=4\); the relative scale overhead depends on \(D\). Rounding can hide a pre-rounding saving or make discrete jumps. This is a prediction the deep view should enable, not merely a caveat printed beside a permanently favorable bar.

Proposed independent regression expectations, all **hand-derived, not executed**:

| Inputs T,H,D | CUDA returned bytes | CPU returned bytes | What it falsifies |
|---|---:|---:|---|
| 3,2,5 | 256 | 256 | Payload labelled as allocation; universal 50% saving |
| 1,1,128 | 256 | 256 | Assuming different raw sizes always imply different allocations |
| 1,1,129 | 256 | 512 | Missing the non-CUDA 256-byte rounding boundary |
| 64,1,4 | 512 | 512 | Omitting the scale contribution at the pre-rounding equality point |
| 64,1,1 | 512 | 256 | Assuming the CUDA branch cannot allocate more |
| 0,2,5 | 0 | 0 | Arithmetic zero-work behavior of this routine; not a new production validity guarantee |

Future tests should compare the visualization model with fixed independent expectations and, where available, execute the pinned allocation routine as a second check. Copying the UI expression into a test repeats the assumption rather than challenging it. Assertions should separately cover payload, scales, padding and the returned total, not just a total that could accidentally agree.

The README need not be declared contradictory: it explicitly says payload is half BF16. The candidate deep view expanded that into a total-allocation claim. Keep the narrow source statement and correct its application.

## Async execution: concrete trace and corrections

Static call sequence:

1. Select `mode` from the backend.
2. Enqueue `copy_async(x, copy_stream)`.
3. Record `ready_event` on that same copy stream.
4. Make the compute stream wait on that event.
5. Submit `consume_same_x(x, mode, compute_stream)`.

Under the intended stream/event contract, step 4 prevents this consumption of A from executing until A's copy dependency is ready. It does not require the host to block at the wait call or impose a global barrier across unrelated work. The source records an intended stream dependency; the missing helper definitions prevent claiming a reproduced actual-device happens-before trace.

The candidate shows A copying from t0 to t4 and consuming that same A from t2 to t6. That starts consumption before its required readiness and cannot represent this whole-input dependency. No chunk-ready protocol or disjoint buffer is supplied to justify partial early consumption. “Async means it can compute early” teaches an invalid relationship here.

Preferred correction: a dependency diagram with separate copy/compute lanes, stable block A identity, the event at the completion dependency and an explicit wait edge before consume A. It avoids inventing duration. If an educational timeline is retained, copy ending at t4 requires consumption to start at or after t4. A four-unit consume drawn t4–t8 would be one chosen illustration only; its duration and earliest realization are not hardware facts. Do not insert a CPU execution interval as though the `cpu` branch's actual stream semantics were known.

Bounded alternative for introducing overlap: draw hypothetical work B explicitly labelled independent of A and outside the supplied `decode` trace. It may occupy time while A copies, without bypassing the wait for A. A simple “independent/dependent” example can teach the concept, but only the dependent-A path is demonstrated by this fixture. Do not silently substitute B for A to preserve the original animation and continue claiming an implementation trace. The safest fixture-aligned deep view shows the dependency and states that realized overlap is unmeasured.

Proposed structural tests:

- A spy/mock trace can check the correct mode, copy/event/wait/consume call order, the event identity and stream arguments, and that both copy and consume refer to the same `x`. This checks submitted operations, not device concurrency.
- A dependency model should enforce consume-A start after copy-A completion / event readiness, with a same-input edge that cannot disappear merely because a control is named async. Check initial, waiting, ready and completed states. A hypothetical B must have its own ID and independence condition.
- Actual-device validation would require the real helper implementations, configured backend/hardware and trace evidence showing copy completion, event/wait and kernel execution. A profiler trace could verify overlap only if it includes genuine independent work. No such evidence was supplied or executed.
- A performance claim additionally requires workload, hardware, comparison policy and end-to-end measurements. Neither async API calls nor a visually overlapping pair of rectangles establishes speedup.

## Bounded model/UI repair handoff

Use a shared input/backend configuration and a pure derived snapshot for all affected labels, objects, formulas, resource counts, stages and inspectors. Keep lifecycle local. Backend changes reset/remap incompatible stage/selection deterministically; a prior CUDA inspector must not remain attached to a CPU diagram.

For storage, compare a total-only pair of bars with a segmented allocation view. Choose segmented storage: one shared byte scale, visibly separate payload/scales/padding, total labels and a nearby shape control. At the supplied shape both total bars are 256 B, with different inner composition. Selecting the scale segment explains its per-token/head cost; CPU displays no scale segment. A shape change across the 128/129 example exposes rounding rather than smoothly interpolating a fictitious saving. Keep the backend's reference label and conditional context visible.

For execution, compare an arbitrary overlapping animation with an event-connected lane view. Choose the latter because the central relationship is temporal dependency, not apparent motion. Selecting A shows the same buffer's copy, readiness and consumption; selecting a waiting operation must not display active-consumption copy. If there is an optional conceptual B, retain the fixture-backed A path and explicit conceptual scope.

The shallow path should state, in natural Chinese, a connected explanation such as:

> 低精度表示可以减少缓存数据本身占用的字节。真实分配还要算上缩放信息和对齐空间。异步提交允许程序继续安排工作，但读取同一块数据的计算仍要等拷贝完成；能重叠的是不依赖这次拷贝的工作。

This is a useful first view without pretending to explain an unspecified quantizer. Use small payload objects for intuition, then descend to this fixture's explicit components and event edge while keeping object/parent correspondence. The actual encoding/scale application is absent, so do not invent a numerical compression demo and call it FP8-implementation-faithful.

Ownership: payload versus allocation and same-input dependency belong here because they are the promised mechanisms. Quantization rounding/error internals, unavailable copy-helper implementations and device tuning are outside the evidence scope. Do not link the central mechanism away or add unrelated prerequisites. No named destination chapter was inspected or promised.

Minimum future acceptance separates three layers:

1. **Source/model correspondence:** pinned fixture revision, CUDA and non-default CPU branches, independent allocation expectations and explicit dependency invariant. Resolve every central mismatch before an implementation-alignment claim.
2. **Model/visible correspondence:** actual rendered backend switch updates formats, storage composition and totals; actual timeline shows wait and preserves A identity. Check representative and falsifying boundary states, plus ordinary theme/language/width risks if the page is changed. Good arithmetic with stale labels or a missing wait still fails.
3. **Reader understanding:** read the default page and important branches continuously, return to parent, and ask the reader to predict why this 30-byte payload still returns a 256-byte allocation and why A cannot start consumption at t2. Record owner reading and independent findings for substantial work. This does not replace source correspondence, and source correspondence does not establish usability.

No tests in these three layers were executed here. A full device-performance gate is unnecessary for a narrowly stated structural explanation, provided device timing/concurrency/numerical behavior remain unverified and no performance claim is implied. Hardware absence does not excuse the already visible source/model errors.

The final tolerance guidance is consistent with this boundary: byte-allocation expectations here are exact integer arithmetic; they are not an oracle for decoded tensor values. If later source supplies actual FP8 conversion and consumption, validation must use an appropriate independent numerical reference, error tolerances and stated approximation/quality assumptions. Neither a `fp8` mode name nor matching storage sizes establishes exact agreement with BF16, and demanding bit-identical outputs across those paths would be unsupported. No numerical tolerance or acceptable quality loss can be selected from the present fixture alone.

## Instruction assessment

The additions change the behavior materially: they require reading implementation-level evidence, exposed non-default branches and independent expectations while leaving code walkthrough UI optional. Applied here, they catch all three central mismatches without requiring external research, a full codebase tour, source panels or hardware access. The separation of static source behavior, mathematical correctness and measured runtime behavior is useful: this synthetic source supports some exact accounting and intended order but no FP8 accuracy or actual overlap result.

No direct contradiction in the fidelity additions prevents this assessment. Two instructions need careful scope:

- “Deep view must map to a real path” cannot turn a synthetic fixture into production proof. Here it means faithfully map to the explicitly supplied fixture-v1 operations, with implementation gaps retained. If the candidate insists on a real-library or measured-hardware promise, that affected claim remains blocked.
- A complete input→allocation→operator→write-back trace is conditional on the claimed relationship. The snippets do not show `decode` calling `allocation`, nor any quantization or cache write-back. Do not fabricate a single connected runtime path across the files to satisfy a vertical-slice checklist. Validate each supplied operation and mark the integration unknown unless further source establishes it.

Broad discovery requirements to read old QA, neighbors or primary external sources do not override this assessment's explicit evidence scope. Likewise, the instruction to save `principles.md`, a run ledger or `design-qa.md` does not authorize additional writes. The requested assessment is the deliverable; chapter QA remains future work. This is a scope application, not a waiver of technical acceptance.

Connected reading check of this handoff: payload saving motivates inspecting total allocation; scales and rounding explain why the given total does not fall; asynchronous submission motivates examining the wait; the event explains why same-input consumption cannot overlap its copy; independent work and missing hardware constrain any larger conclusion. The expected predictions follow from stated objects and operations. This is a reading of the written assessment, not an actual rendered reader pass.
