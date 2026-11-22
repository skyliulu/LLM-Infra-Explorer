# Content, Math, and Implementation

## Maintain a claim ledger

Before polishing prose, record each important claim with:

- its authoritative basis;
- assumptions and execution context;
- the model fact that implements it;
- the visual evidence that demonstrates it;
- the limitation or version boundary that prevents overgeneralization.

Use the same terms for a concept across controls, canvases, formulas, metrics, and implementation evidence. Do not let user-facing copy become a second, conflicting technical model.

Execution context selects narrative and provenance as well as numbers. If a shared stage represents prefill in one state and decode in another, update its explanation, source symbol/link, pseudocode and visible input highlight for that actual operation. A correct canvas with stale stage copy still fails technical acceptance. Check executable behavior against comments when they disagree; bound the claim to the inspected revision rather than repeating an inaccurate comment.

For implementation-level explanations, apply [implementation-fidelity.md](implementation-fidelity.md): verify the active source path and reconcile its runtime facts with the model and page. Make the progression from small example to real execution explicit; simplifying dimensions must not alter semantics, ownership or dependencies. Source inspection is required for implementation claims, while a visible code panel is optional. A documentation link or self-consistent test alone does not establish accuracy.

## Establish the chapter hierarchy

Start with one reader question and a top-down responsibility map, not a catalogue of implementation features. Each level should answer a narrower part of its parent's question; retain the parent context and a clear way back. Read the project's Analyze Technical Principles skill for chapter ownership. Research notes may be comprehensive while the visible chapter deliberately selects a small coherent argument. Cross-chapter links should say what the destination explains and preserve this chapter's own integration story.

Keep titles concise and consistent with neighboring chapters. Headings (`h2`/`h3`/`h4`) are short single-clause navigation labels, not mini-summaries: state the mechanism or core question cleanly without stuffing parenthetical glosses, colon sub-clauses, or multi-topic enumerations (`A、B 与 C`) into the heading. Move qualifiers and explanations to visual legends, control labels, or a single short lead line. Separate two explanatory levels when useful:

- design or architecture: what representation, resource, or topology changes;
- execution: how one real token, chunk, request, or kernel step updates the system.

Use parallel heading grammar and typography across levels. Avoid internal engineering labels such as "single real decoder routine" in user-facing titles.

## Integrate extensions into their teaching family

Before adding a new section to an existing chapter, test whether the extension belongs **inside an existing semantic region**:

- **Embed inline** when the new concept is a new variant of an existing axis (for example, adding a new algorithm to an existing algorithm tab bar or a new load/batch parameter to an existing race or capacity control bar), the missing branch of an existing mode switch (for example, showing parallel prefill inside the `Prefill` branch of a `Prefill / Decode` toggle), or a precision/format refinement of an existing card.
- **Create a separate section only when** the extension introduces genuinely distinct physical objects or a different state model that would distort the existing canvas if forced into it. Never bolt on a catch-all appendix section (such as "Modern Evolution", "Frontier Topics", or "Production Boundaries") that bundles several unrelated sub-topics at the bottom of a chapter.

Separate the object being configured, its numeric format, and the implementation recipe. For example, W4A16 describes bit budgets, not whether weights use INT4 or FP4, and neither determines KV precision. Dependent views follow the selected format; independent object settings stay independent.

Teach the general mechanism before a model-specific recipe. Keep implementation names, constraints and sources available in the example or provenance, rather than making them the title of a general concept. This does not prohibit architecture-specific chapters when their organization is itself the learning object.

Within one teaching family, keep corresponding regions in the same place across modes: for example storage comparison on the left and reconstruction on the right when that is the accepted arrangement. Reuse its visual components, density and disclosure pattern; do not give each format a different visual language. Preserve real structural differences rather than forcing all mechanisms into identical stages.

Keep prose tight: use at most one short lead layer per visual block instead of stacking a section intro, subsection hint, mode paragraph, card conclusion, and scope footnote around the same diagram. Let live numbers, visual state, and short labels carry the argument, and move optional caveats into compact notes or disclosures.

When reusing a view, recheck its text as well as its numbers: sample counts, dimensions, bit fields, units and precision labels must describe the active format. Copying an FP16 field label into an FP4 view can produce a convincing but incorrect diagram.

## Structure the inspector around the current selection or stage

Use these questions to select the information needed for the current state; they are not eight mandatory visible cards. Combine related answers and keep the primary explanation compact. Prefer this reading order:

1. current selection, state, or stage and its mechanism;
2. core problem;
3. difference from the comparison mode;
4. what to observe on the canvas;
5. core formula;
6. variable meanings and live dimensions;
7. engine-style pseudocode;
8. capability boundary.

Keep each block concise. Do not repeat the same paragraph in the canvas and inspector.

## Read the copy as a reader

Before delivery, read the Chinese page in reading order and rewrite it as an engineer explaining the idea to another engineer. Say who does what, to which object, and why. Prefer a concrete question or action over an abstract noun chain. Translate the explanation independently rather than following English sentence structure.

Avoid process/audit language in the main narrative: source snapshot identifiers, capability matrices, canonical models, evidence gates, "教学值", "本次教学主线", "机制如何串起来", and repeated "边界/契约/后果" labels. Keep necessary assumptions and provenance in a compact note or disclosure near the relevant example. These examples do not ban ordinary technical words when they help the reader.

Keep established terms such as Prefill, Decode and KV Cache where useful, explain them on first use when needed, and use the same terminology in controls and prose. Remove awkward literal translations, vague "支撑/协同/赋能" phrasing, redundant disclaimers and repeated "不是 X 而是 Y" contrasts. Preserve necessary limitations and real distinctions.

Copy acceptance is semantic: can the reader restate the idea, identify the next step and connect labels to the diagram? A banned-word count or shorter character count is not proof of natural writing. Check the actual Chinese render for long labels and review English for the same meaning.

## Render mathematics consistently

- Author mathematical expressions as LaTeX.
- Render them with the shared `MathFormula` component.
- Keep language-independent LaTeX outside translation dictionaries.
- Do not fake subscripts, superscripts, tensors, or operators with Unicode or `font-mono` strings.
- Pair a complex equation with variable explanations or a visualization that shows the same operation.
- Derive displayed dimensions and sizes from current state.

## Write useful implementation evidence

When implementation detail contributes to the teaching claim, use primary implementation evidence and show the abstraction level of an inference engine rather than a literal transcription of the equation. Do not add pseudocode merely to fill a standard panel.

Depending on the topic, expose concepts such as:

- request and sequence metadata;
- allocation, slot mapping, block tables, or cache lookup;
- prefill/decode dispatch;
- tiled, chunked, recurrent, fused, or collective kernels;
- workspace and intermediate ownership;
- persistent state write-back or final-state commit;
- output projection and synchronization.

Highlight the block corresponding to the current visual stage. Preserve indentation and horizontal readability. Label deliberate simplifications.

## Keep algorithm relationships explicit

For every mode, state:

- what problem it solves;
- what structure it reuses from the baseline;
- the one structural difference that matters most;
- the resource or quality tradeoff;
- what it still cannot guarantee.

Do not describe an extension as an unrelated algorithm when it reuses the same backbone.
Do not present one implementation's constraint as a universal property. State version, backend, hardware, shape, or execution-context boundaries when they materially affect the claim.

## Maintain i18n

Route all visible prose through `t(key)` and keep Chinese and English keys identical. Keep mathematical source shared. Verify both languages after layout changes because translated lengths may alter wrapping and panel height.
