# Automatic reader read-through

Use before delivering a new or revised chapter. The owner performs this automatically as part of the task; do not wait for the user to ask, complain or supply another review. An independent reviewer supplements this pass and cannot perform it on the owner's behalf.

## Read the artifact as the reader encounters it

After functional checks, open the current rendered chapter at its first screen with a representative initial state. Read continuously to the footer in the primary reader language, following the page's actual order. Then open the important alternative branches and nested explanations, use their teaching controls, and return to their parent. Do not replace the experience with source/i18n inspection, selected screenshots, a control checklist, the author's planned explanation or an earlier pass verdict.

Keep the original user question available as the acceptance target. While reading, use only information the page has actually introduced; do not mentally fill gaps from research or implementation knowledge. Observe what a reader would know before each section, what it adds, and why it belongs at that point. Inspect actual surfaces and typography as well as words. This continuous pass needs a representative browser view, not another full responsive/theme matrix. Existing bilingual/theme checks still apply separately.

Look for these demonstrated failure modes:

- **Lost thread:** a convincing headline followed by disconnected examples; a conclusion asserted without the preceding explanation earning it; a detour that takes more attention than the reader's core question.
- **False hierarchy:** selecting one component reveals unrelated mechanisms; returning “up” opens a different architecture; upper components do not map to lower objects; branches require unexplained prerequisites.
- **Results without mechanisms:** a slider changes a percentage, a preset swaps resource counts, or boxes rearrange, while the claimed computation, reuse, movement, waiting or tradeoff remains visible only in prose. Decide what the reader can infer from the objects and interaction, not whether a callback fires.
- **Broken argument across chapters:** details are either dumped into this chapter or linked away before this chapter establishes their necessary role. Preserve the smallest mechanism that explains the local claim.
- **Reading friction:** awkward Chinese, repeated headings, dense caveats, unexplained symbols, weak visual hierarchy and sources/process language interrupting the main explanation. Necessary assumptions stay readable and subordinate; do not remove limitations to make the story smoother.
- **Brochure/name-drop cards & unmotivated add-ons:** static cards that merely list algorithm or architecture names without showing their mechanism in the canvas, or lower panels dropped onto the page without an observable causal bridge from the preceding mode—especially when they switch from concrete readable examples to opaque placeholder IDs or bare coordinate lists.
- **Unnecessary disclosure click-tax & buried additions:** collapsed `<details>` toggles that expand to only 1–2 short lines or a single formula, or newly added first-class formats/features hidden inside non-default sub-states where a scanning reader cannot discover them.

Judge these against the chapter's actual teaching claim. A structural selector or count-only experiment can be sufficient when that relationship is the learning object; this pass does not require animation, a simulation or more controls in every section.

## Check the cost of an addition to the whole experience

For repairs and extensions, compare the same viewport and representative state with the baseline. Check what occupies the first useful screen, how far the reader travels to reach the primary mechanism, whether its connected objects remain visible together, and whether existing controls still act near their subjects. A correct, responsive new panel can still degrade the chapter by interrupting the argument or stretching its layout; passing local checks does not establish that the addition belongs there.

A depth addition also has a reading cost. After adding technical detail, re-read the default path for text load: a longer lead, a five-row card and a multi-paragraph aside can leave the canvas with less prominence than the prose. Depth may move into a disclosure when its summary states the conclusion, but the retelling must not depend on opening every disclosure; if it does, the summary is not carrying the argument.

Separate necessary explanation from optional verification. Keep the causal reasoning required for the chapter's answer on the default path. Introduce supplementary detail after its prerequisites and preserve a clear return to its parent; choose inline, drill-down, disclosure or another placement from the relationship being taught. Do not hide essential reasoning merely to reduce clutter, or turn one successful repair pattern into a universal layout rule. Record the experience before and after, including the default path without opening extras and the return after exploring them.

## Do not pass a readable summary as a demonstrated explanation

Judge **narrative comprehension** and **the promised visual/interactive explanation** separately; both must meet the user's contract. An expert can paraphrase a paragraph that names the cause without the artifact making that cause understandable. For each central mechanism, identify what the reader actually observes, what changes and why, and which part is merely assumed, preset or stated in prose. If the user asked to understand that mechanism through interaction and it remains an assertion next to changing counts, that is a central P2 gap, not a P3 polish item. A scope disclaimer or correct arithmetic does not repair the missing explanation.

Do not apply a generic “framework chapters may use brief dependency summaries” rule to lower an explicit request for a particular mechanism. Keep secondary internals in their owning chapter, but show the smallest causal relationship necessary for this chapter's promise. Conversely, do not demand a full standalone algorithm simulator for every supporting dependency.

For a **system or framework** chapter, close the page and test the system-level answer: name each technical difficulty, the constraint and magnitude behind it, the mechanism that answers it, what would fail without it, who decides / executes / stores, what crosses each interface, and which design alternative was rejected. A retelling that can only describe the request flow, or that lists components without the difficulties they answer, fails even if every screen is polished.

For hierarchy continuity, trace an actual object from the main overview into detail and back to its original parent, including any separately drawn lower architecture. Write how the upper and lower objects correspond. A working breadcrumb or retained selection inside one of two disconnected maps does not by itself establish that mapping. Likewise compare the selected component's scope with the whole explanation it opens; correct paragraphs can still be misplaced.

Read the ending as carefully as the opening. Put the chapter aside and write the explanation a reader could now give to the original question, plus a condition under which the result would not hold. Do not copy the brief's expected answer. Support that reconstruction with specific visible sections/interactions. If it relies on information missing from the page, the explanation has not passed, even if every local statement is correct.

## Repair without handing the work back

A missing central explanation, discontinuous hierarchy or control that fails its teaching purpose is a P2 delivery failure. Record the observed location and the understanding it prevents. Within an implementation task, revise the appropriate cause—scope/argument, representation, model or prose—and repair autonomously within the user's authorization. Do not deliver a list of routine defects and ask the user whether to fix them.

After repairs that change content, hierarchy or reading order, read the complete chapter again; a cropped screenshot of the repair does not establish that the whole now works. Recheck affected technical/browser evidence. Stop only when the reader outcome and required checks pass, or when an actual unresolved access/identity/permission constraint prevents further work. Keep blocked/incomplete status honest. Assessment-only and skill-only requests keep their narrower scope: report or improve the workflow without silently rebuilding a chapter.

Use an early read-through after the first usable vertical slice to catch a poor organizing idea before adding more panels. The final owner pass remains required after the last changes affecting the explanation. Independent review cannot waive a failed owner pass, and owner enthusiasm cannot waive an independent substantive finding.

## Keep a short observable record

For a full run, write `reader-review.md` with:

- original reader question and current route/language/rendered state;
- actual reading path, including default order, opened alternatives and return paths;
- the explanation reconstructed after reading and the visible basis for it;
- a short central-mechanism audit: promised understanding → observed diagram/interaction → what is only assumed or narrated → pass/fail; plus upper/lower object mapping when there are multiple architectures;
- friction/gaps found, their effect on understanding, repair and full reread outcome;
- final pass/fail and current revision/evidence references.

Use the run's `reader` check to record `reviewer: owner`, `route`, `readingPath`, `retelling`, `frictions`, `startedAt` and evidence. Reference a note and an actually inspected screenshot, not only matrix files. Do not invent a clean first pass or turn a template into claimed observations. A small repair may keep a concise entry in `design-qa.md`; it still gets the actual reader pass without requiring a new dossier. Preserve earlier failed passes as history, and invalidate a passing reader check when the explanation changes.

The helper verifies bookkeeping, freshness and missing evidence. It cannot read for the agent or establish comprehension. Never claim that a machine-accepted record proves the chapter is well explained.


## Match the technical reader, not merely the author's retelling

For a technical report or engineering chapter, first read the default scrolling path without opening optional controls. It must contain the argument: workload and constraint, design choice, necessary internal mechanism, remaining bottleneck, and evidence. If the page reaches its conclusion while all supporting reasoning is hidden in replacement views, fail the reading architecture. A connected article with embedded experiments is one option; do not impose it on an algorithm whose execution itself is the primary explanation.

Test depth with an engineering prediction: can the reader explain what changes in a tensor shape, data placement, synchronization dependency or admission decision, and predict a relevant boundary? Correct slogans about reuse, fusion or utilization are insufficient. Require concrete interfaces and the specific constraint connecting each section to the next; do not substitute more feature names, toy percentages or caveats for that depth.

Review copy as published technical prose. Headings should identify the mechanism or design decision. Remove repeated tour-guide imperatives and rhetorical questions when they displace information. Preserve necessary qualifications, but move provenance/audit process out of the main argument. Information density means useful relationships per screen, not simply smaller type or more cards.

## Compare the experience within this project

For a substantial redesign, especially after feedback about visual quality or teaching friendliness, use the neighboring chapters inspected at discovery as actual rendered references. Compare the first useful screen, one direct object interaction, and a dense mechanism view. Record what the reader can see and infer in the same viewport before and after acting: representation, hierarchy, semantic color, control distance and meaningful relationships per screen. Borrow the useful relationship, not another topic's panel count or unearned metrics.

Do not pass a large mostly empty architecture followed by distant experiments merely because every topic exists somewhere. Likewise, a changing text table is insufficient when the claim depends on a spatial/time relationship that the reader must reconstruct manually. Treat the missing visible relationship as a teaching defect; reducing padding or moving all reasoning behind selectors alone does not repair it. Keep a continuous default argument while making exploration direct and contextual. Screenshot counts and a correct retelling cannot settle this relative experience check.
