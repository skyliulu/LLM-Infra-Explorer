# Interactive Module QA Checklist

For full chapter delivery, apply common checks and the capability sections declared in the design brief. For focused repairs, apply affected checks plus the regressions at risk, and state the limited scope. New chapters have no pre-edit layout baseline; existing regions do. Model coverage can span legal combinations while browser coverage exercises representative paths, each affected mode, risky transitions and rendered boundaries; record which layer actually ran each case.

## Contents

- Change-contract integrity
- Technical and interaction truth
- Visual, content, and responsive QA
- Regression and runtime verification
- Optional QA matrix

## Change-contract integrity

- [ ] The work is classified as create, repair, extension, redesign, QA, or assessment; narrow assessment does not silently become implementation.
- [ ] Existing controls, views, interactions, and responsive states were captured before editing.
- [ ] A rendered baseline exists for every major region that might be affected.
- [ ] Preserved behavior still works after the change.
- [ ] Any information-architecture change was explicitly in scope.
- [ ] Repairs and extensions preserve major-region order, relative prominence, control placement, split ratios, and responsive reading order unless the user explicitly authorized a redesign.
- [ ] New technical evidence was embedded in existing semantic regions before any new panel or page-wide composition was introduced.
- [ ] The affected dimensions, views, and preserved behavior were declared before editing.

## Technical and model truth

- [ ] The chapter states one clear learning question.
- [ ] An independent reader can reconstruct the causal answer to the original user concern from the page; generic component descriptions and the most polished demo do not substitute for that answer.
- [ ] Headline metrics retain workload/hardware/scope and their meaning. Production revenue is not engine speed, profit or payback; illustrative economics expose their assumptions.
- [ ] Important claims have authoritative evidence, assumptions, and capability boundaries.
- [ ] Implementation-level claims map to pinned active source paths, configuration/backend and runtime facts under [implementation-fidelity.md](implementation-fidelity.md). Deep views agree with those facts; shallow examples preserve semantics, ownership and dependencies.
- [ ] Source → canonical model → visible objects/formulas/pseudocode/metrics was reconciled for central claims and exposed non-default branches. Relevant independent/reference expectations and boundaries were checked; self-consistent tests alone do not prove correctness. Unsupported central implementation promises remain blocking.
- [ ] Coverage is reconciled against the chapter's central question and responsibility map. Framework organization is explained; dependency internals belong to their owning chapters. A flat feature inventory is not a hierarchy, and extra detail is not automatically greater depth.
- [ ] At each drill-down, the parent context, narrower question, input/output relationship and return path are clear.
- [ ] Chinese copy was read as a continuous explanation, not just checked for translation-key parity. Titles, controls and prose use natural wording and consistent terms; audit/process notes do not crowd the teaching narrative.
- [ ] Training, prefill, and decode are distinguished where relevant.
- [ ] Formulas, state shapes, dependencies, ownership, resource scaling, and limitations are correct.
- [ ] Simplifications are labeled and do not reverse the real conclusion.
- [ ] Controls are classified as independent, derived, constrained, mutually exclusive, or presentation-only.
- [ ] One canonical domain model drives all explanatory layers.
- [ ] Invalid inputs are rejected or normalized by explicit rules.

## Interaction truth

- [ ] Every control updates all and only the dependent views.
- [ ] Mode changes reset or remap incompatible state deterministically.
- [ ] Independent controls are not silently coupled.
- [ ] Locked, selected, hovered, and reset states remain mutually coherent.
- [ ] Repeated object IDs in comparison views retain diagram identity; clicking either side resolves its own data, highlight and explanation.
- [ ] Active, excluded, completed and removed selections show their actual relationship to the current stage; configuration changes remap highlight and inspector together.
- [ ] Shared stage names in different execution contexts use the correct explanation, source link, pseudocode and input/output highlight for each context.
- [ ] The interaction grammar matches the learning object.

### When `timeline` is declared

- [ ] Every mode has a verified execution pipeline.
- [ ] One operation per serial lane appears active; real parallel lanes can run together.
- [ ] Active, passed, pending, and done states are distinguishable.
- [ ] Token, chunk, layer, or event progress follows the real dependency order.
- [ ] Reset, play/pause, step, and scrub update every dependent view.
- [ ] Autoplay completes at a useful teaching pace and stops cleanly.

## Visual explanation

- [ ] Inspect the whole workbench surface in each theme before checking individual controls. Fixed dark diagram backgrounds are defects in the light branch unless a justified code/media surface requires them. Record the main canvas background and readable text, not merely the resolved theme flag.

- [ ] The core difference is visible without reading long prose.
- [ ] Every important claim has a trigger, visible evidence, and representative or boundary snapshot.
- [ ] A mode switch changes every visual layer it claims to affect.
- [ ] Growth, fixed capacity, compression, recurrence, gating, movement, or parallelism use an appropriate visual variable.
- [ ] Resource comparisons share a quantitative scale.
- [ ] Matrices, tensors, and cache blocks have readable proportions.
- [ ] No major region is dominated by empty space or decorative text.
- [ ] Local controls are placed near their visible effect.
- [ ] Secondary annotations reuse the primary semantic objects instead of duplicating a disconnected explanation.

## Content and math

- [ ] All display prose uses i18n and both languages are complete.
- [ ] All mathematical notation uses LaTeX through `MathFormula`.
- [ ] Complex equations have variable meanings or a matching visual operation.
- [ ] When present, pseudocode reflects engine/runtime concepts rather than formula translation.
- [ ] Implementation evidence is included only when it advances the teaching claim.
- [ ] The inspector or equivalent explanation covers problem, difference, observation, and boundary.

## Accessibility and responsive layout

- [ ] Light and dark are explicit rendered dimensions, crossed with representative widths and both languages. Record selected preference, resolved `data-theme`, viewport, language and inspected state with screenshot evidence. Pure-model enumeration is not theme acceptance.
- [ ] System preference resolves to the environment's appearance and switches back to explicit Light/Dark correctly. If system appearance cannot be emulated, disclose that only the current system branch was exercised; do not claim both OS branches.
- [ ] Theme changes preserve experiment configuration, selection and paused timeline progress. Verify real surfaces and text, not just the theme menu icon: selected/disabled controls, inactive/active/committed cells, math, pseudocode, borders, arrows, hover/focus and legends remain legible.
- [ ] Inspect generated theme CSS or renderer palette behavior when automatic color remapping is used. Semantic identity colors and transient state colors retain their meaning; chart/SVG/canvas colors are covered too.

- [ ] Selected text, small formulas, matrix cells, sliders, and pale panels have readable contrast.
- [ ] Meaning does not rely on color alone.
- [ ] Desktop, tablet, and mobile preserve logical reading order.
- [ ] No page-level horizontal overflow appears.
- [ ] Dense components have no unintended internal overflow in sparse, representative, and maximum-content states.
- [ ] Both languages preserve readable proportions and control labels.
- [ ] When narrow layouts hide segment labels, an explicit readable legend and inspectable operation identity remain; numbers alone do not explain operation colors.
- [ ] Controls remain keyboard reachable and have labels.
- [ ] Semantically equivalent top-level controls match neighboring modules in order, grouping, shape, sizing, label semantics, and responsive breakpoint unless a documented interaction need requires a deviation.
- [ ] The shared site header owns the only language control; chapters use the shared provider and add no local language state/buttons.
- [ ] Timeline reset/play/next controls occupy the established trailing position and keep consistent icon-only or text-button treatment across sibling modules.
- [ ] Important region proportions, unused space, wrapping, and overflow were compared against the baseline with measurable evidence.

## Regression and runtime verification

- [ ] Run the convention checker with the declared capabilities and review warnings.
- [ ] Pure-model tests cover formulas, constraints, invariants, and large legal state spaces where relevant.
- [ ] Browser tests cover single-control changes, important coupled controls, representative modes, and boundary states.
- [ ] Every value in each affected dimension is covered; coupled dimensions have explicit cross-product coverage.
- [ ] Run `npm run build` successfully.
- [ ] Inspect representative initial, intermediate, boundary, and final states where they exist.
- [ ] Check browser console output.
- [ ] Convert every confirmed defect into a model assertion, browser case, or checklist item.
- [ ] Record P0-P3 findings, current result, evidence, contract impact, and unresolved limitations in `design-qa.md`.

## Extensions and microscope explorers

- [ ] Classify comparison alternatives versus cooperating subsystems; the latter remain visible together in the architecture.
- [ ] Follow a complete overview → component → record → return path. Click the component background as well as its caption and check keyboard access.
- [ ] Compare full and miniature overviews: node topology, ordering, selected record and connections remain consistent; dense detail remains inspectable at a larger scale.
- [ ] Inspect principal tradeoffs without opening hidden tabs. Check baseline, units, improvement direction, and the boundary between bytes, latency and context capacity.
- [ ] Switch every affected format and independently vary object settings. Relevant content appears in its existing teaching region, and unrelated settings retain their values.
- [ ] Compare corresponding regions across formats at the same viewport. Check shared style and placement, then verify sample counts, bit labels and dimensions against the active model.
- [ ] Review both empty space inside modules and clearance between them. Surface grouping, matrix readability and connection endpoints must all remain clear after compression.

## Autonomous delivery review

- [ ] The owner automatically read the final rendered chapter from first screen to footer, explored important alternatives/drill-down/return paths, and reconstructed the answer using the page alone. Follow [reader-review.md](reader-review.md); do not substitute local screenshots, prior pass verdicts or another reviewer's work.
- [ ] Actual reading path, friction, fixes and final retelling are recorded. Central gaps triggered autonomous repair and a whole-page reread; no user prompt was needed to initiate this gate. A failed reader pass blocks delivery despite green mechanical checks.
- [ ] Narrative retelling and the promised visual/interactive understanding were judged separately. Each central mechanism has a concrete observation beyond an assumed preset or paragraph; user-requested central gaps are P2 even when arithmetic and prose are correct. Upper/lower objects map across the actual overview/detail/return path, not merely within one breadcrumb.

- [ ] Technology follows the teaching/interaction requirements; inherited framework choices were treated as defaults. Any adopted alternative has a recorded rationale and verified build, integration, accessibility and relevant device/fallback behavior. Implementation-specific checkers were adapted without dropping behavioral requirements.

- [ ] Topic identity/version is resolved from user context and primary sources; ambiguous names were not silently substituted.
- [ ] Research, layout and normal implementation choices proceeded without artificial approval handoffs.
- [ ] The first view exposes the central mechanism using concrete objects; one boundary state challenges its benefit.
- [ ] A control → model → visible consequence journey works in the actual rendered chapter.
- [ ] Independent playback scopes are local and clear; views claiming shared execution remain synchronized.
- [ ] Terminal playback stops without wrap/jump; provenance selection follows the declared current/locked rule.
- [ ] Full delivery inspected both languages and desktop/tablet/mobile, including the core canvas. A focused repair inspected affected language/width risks and states without claiming a full audit.
- [ ] Screenshot captures were opened and inspected; browser, visual and build results refer to the final input revision.
- [ ] Full runs passed the evidence-record validator; missing browser access remains blocked, never waived as success.
- [ ] Confirmed P0–P2 defects are fixed with regression evidence; completion does not depend on the user discovering obvious gaps.

## Optional QA matrix schema

Use a module-owned JSON matrix when a change spans several values or coupled dimensions. Keep only affected dimensions in the file:

```json
{
  "dimensions": {
    "mode": ["baseline", "alternative"],
    "viewport": ["wide", "narrow"]
  },
  "requiredCrossProducts": [["mode", "viewport"]],
  "cases": [
    {
      "name": "baseline wide",
      "state": { "mode": "baseline", "viewport": "wide" },
      "checks": ["model invariant", "rendered evidence"]
    },
    {
      "name": "baseline narrow",
      "state": { "mode": "baseline", "viewport": "narrow" },
      "checks": ["model invariant", "rendered evidence"]
    },
    {
      "name": "alternative wide",
      "state": { "mode": "alternative", "viewport": "wide" },
      "checks": ["model invariant", "rendered evidence"]
    },
    {
      "name": "alternative narrow",
      "state": { "mode": "alternative", "viewport": "narrow" },
      "checks": ["model invariant", "rendered evidence"]
    }
  ]
}
```

Run `check-qa-matrix.mjs` to verify dimension values and required combinations are represented. The helper validates coverage structure; module tests and rendered QA still determine whether the assertions are true.
