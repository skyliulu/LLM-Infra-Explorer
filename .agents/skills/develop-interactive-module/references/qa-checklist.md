# Interactive Module QA Checklist

For full chapter delivery, apply common checks and the capability sections declared in the design brief. For focused repairs, apply affected checks plus the regressions at risk, and state the limited scope. New chapters have no pre-edit layout baseline; existing regions do. Model coverage can span legal combinations while browser coverage exercises representative paths, each affected mode, risky transitions and rendered boundaries; record which layer actually ran each case.

## Contents

- Change-contract integrity
- Technical and interaction truth
- Control geometry and parity
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
- [ ] New technical evidence was embedded in existing semantic regions (promoting architecture/algorithm variants to the primary mode switcher, or adding parameters/branches inline) whenever it extends an existing axis; no catch-all appendix card or static name-drop/brochure strip was bolted on without demonstrating the mechanism in an interactive canvas.
- [ ] Newly added first-class formats, algorithms, or tradeoffs are discoverable at sibling entry level (not buried behind an unselected sub-state or footnote), bridge causally from the preceding mode's limitation, and preserve concrete human-readable examples rather than opaque placeholder IDs or raw coordinate dumps.
- [ ] Headings (`h2`/`h3`/`h4`) stay concise and single-clause (no parenthetical glosses or multi-topic lists), visual blocks avoid stacked redundant prose layers, and collapsed `<details>` toggles are audited so no 1–2 line explanation or single primary formula is unnecessarily hidden behind a click.
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

### When the chapter explains a system or framework

- [ ] The difficulty ledger is present: each central mechanism is tied to a named constraint (bandwidth, capacity, latency, occupancy, contention, scheduling promise) with a unit or magnitude, the counterfactual, and the boundary where it stops helping.
- [ ] The relationship map is visible early: control plane vs data plane, who owns each resource/state, and the concrete payload or decision crossing each interface. A component inventory or a row of arrows labelled with names is not enough.
- [ ] A real design alternative is named and the reason for choosing this organization is stated; the architecture is not presented as inevitable.
- [ ] The thesis still answers the user's system-level concern; a subordinate mechanism (cache tier, scheduler policy, format) is a section, not the spine, unless the user asked for that mechanism.
- [ ] The page states which layer it draws — the paper's design or the current implementation — and names renamed services, a scheduler that became an index, or new layers where the reader meets the architecture.
- [ ] When the system is implemented, the architecture view is the implemented stack; a paper-only mechanism appears only as an explicitly unimplemented boundary, never as the primary canvas or default reading path.
- [ ] Each mechanism records its evidence level (pinned code / docs / paper). Where code exists it outranks docs and paper; a paper-only mechanism is labeled as design, not current behavior.
- [ ] Interface-level claims (who sends what, which IDs or decisions cross a boundary, what is checked and when) come from the pinned paper section or source, not from plausibility; claims added after the first research pass are re-checked and recorded with that locator.
- [ ] Analytical budgets (time, bytes, SLO) carry their assumptions in the same visible block; only measured values are presented as measurements.

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

## Control geometry and parity

A control can be functionally correct and still look wrong. Downscaled full-page or full-section screenshots do not prove the geometry of a 36px button; inspect the actual control.

- [ ] For every icon-only control family (playback, steppers, icon actions), verify the rendered box and the glyph separately with a computed-style read or a magnified crop (about 4×). The glyph center must sit within ~1px of the box center in both axes; a default button padding or baseline offset is a defect, not polish.
- [ ] The control's size, shape and padding match the sibling chapters that use the same shared group. When a shared rule sizes a box, its contents need explicit alignment (`inline-flex`/`center` or equivalent), not inherited text alignment.
- [ ] Every interactive control has visible hover, focus-visible and disabled states; disabled controls are either explained in place or removed rather than left unexplained.
- [ ] Native semantics survive: do not override a `<button>` role to style a list, use `aria-current` for "current step" rather than `aria-pressed`, and keep `aria-pressed` for real toggles.
- [ ] Related controls are grouped and ordered consistently with neighboring modules (reset / play / step), and a timeline does not expose two conflicting scrubbers.
- [ ] The same control family is checked at the narrow breakpoint, where wrapping can change the box size or alignment.

## Visual explanation

- [ ] Inspect the whole workbench surface in each theme before checking individual controls. Fixed dark diagram backgrounds are defects in the light branch unless a justified code/media surface requires them. Custom inline or component SVG `fill`/`stroke` styles use explicit `light-dark()` pairs or inherited `currentColor` (never bare light neutral hex fills that stay bright against dark text/surfaces), and are visually inspected in actual dark-mode screenshots. Record the main canvas background and readable text, not merely the resolved theme flag.
- [ ] Spatial or structural claims (hardware organization, network/fabric topology, cross-tier data paths, or generational architectural differences) are shown with an actual structural diagram whose regions/callouts link directly to the concrete mechanism or upgrade explanation rather than being flattened into metric bars or prose cards alone.

- [ ] The core difference is visible without reading long prose.
- [ ] Every important claim has a trigger, visible evidence, and representative or boundary snapshot.
- [ ] A mode switch changes every visual layer it claims to affect.
- [ ] Growth, fixed capacity, compression, recurrence, gating, movement, or parallelism use an appropriate visual variable.
- [ ] Resource comparisons share a quantitative scale.
- [ ] Matrices, tensors, and cache blocks have readable proportions.
- [ ] No major region is dominated by empty space or decorative text.
- [ ] Local controls are placed near their visible effect.
- [ ] Secondary annotations reuse the primary semantic objects instead of duplicating a disconnected explanation.
- [ ] After adding depth, the default path still carries the argument without delivering it as a wall of prose: re-read the lead, card rows and notes for height and density, and let a supporting comparison become a disclosure whose summary states the conclusion.

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
- [ ] Desktop, intermediate (sidebar-open / split-screen / tablet), and mobile widths preserve logical reading order without squeezing wrapping header titles into narrow vertical columns beside wide control bars.
- [ ] The rendered section-jump / overview dropdown was inspected in both languages: every option corresponds to a top-level section heading with concise, clean text—no container body dumps, glued badges, dynamic counter noise, raw line breaks, or disproportionately wide options.
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
- [ ] Compare corresponding regions across sibling modes at the same viewport: toggling a mode tab keeps the section heading (`h2`), jump-menu label, layout skeleton, control-bar grammar, surface styling, and atomic unit granularity (e.g., per-token chips / slot tiles) consistent—only real structural differences change, never mounting an alien second UI behind a tab. Verify sample counts, bit labels and dimensions against the active model.
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
