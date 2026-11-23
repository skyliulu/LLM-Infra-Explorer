---
name: develop-interactive-module
description: Turn a technical topic, paper, or implementation into a researched, working interactive LLM infrastructure chapter in this repository. Also use for chapter repairs, extensions, redesigns, and rendered QA. Own research, teaching design, implementation, integration, verification, and repair through delivery; assessment or planning requests remain assessment or planning.
---

# Develop an Interactive Module

Deliver a working explanation that lets a reader **see and investigate why the mechanism works**. Treat “讲透 X，做成交互式图解” as an implementation request. Own the decisions and verification needed to finish; the user should not have to act as the researcher, art director, or test operator.

## Operating contract

- Default to autonomous local delivery. State the outcome, choose reasonable reversible defaults, record assumptions, and continue through verification. Internal plans, research notes and storyboards are working artifacts, not approval gates.
- Choose technology for explanatory clarity and usable interaction. The existing React/Vite/Tailwind/Motion stack is a starting point, not a constraint: evaluate and adopt other renderers, libraries, module frameworks or necessary build changes when they materially improve the result. A technology change alone does not require another approval. Preserve the accepted learning behavior and project experience through appropriate integration.
- Honor narrower intent: “先评估 / 先讨论 / 只规划” ends with that artifact; it does not authorize implementation. Repairs and extensions preserve accepted major regions, control placement and interaction paths. New chapters and requested redesigns permit composing a suitable structure.
- Discover answers in the repository and primary sources before asking. Ask only when unresolved topic identity, incompatible requirements, missing essential evidence/access, or an actual permission boundary prevents correct work. Continue independent work while awaiting an answer. Do not ask users to choose routine layouts, palettes, state models or QA paths.
- A topic example in a request to improve this skill is not a request to implement that topic. Local delivery does not itself request publishing or pushing; honor any actual authorization already present.
- When extending a working chapter, compare the default reading path before and after the addition. Preserve the prominence, continuity and access distance of the primary explanation; choose the placement of supporting detail by its teaching role. Technical depth and optional verification must not displace the mechanism the reader came to understand. Apply the whole-page comparison in [reader-review.md](references/reader-review.md), not only checks on the new component.
- A successful build is one check, not acceptance. Never label unexecuted browser checks, scenario dry runs, or self-reported quality scores as verified output.
- Every chapter delivery includes an automatic owner read-through of the actual rendered page from first screen to footer and its important branches. This is required without a user reminder and cannot be delegated to an independent reviewer or replaced by local checks. Apply [reader-review.md](references/reader-review.md); autonomously repair and reread within the authorized scope before delivery.
- For a **system or framework** topic, the teaching contract is the system's technical difficulties and component relationships, not one subordinate mechanism. Carry a difficulty ledger, a control/data-plane relationship map with interface payloads, and the rejected design alternative into the brief; if the proposed thesis explains only a cache tier, scheduler policy or data format, it is a section rather than the spine. See [technical-analysis.md](references/technical-analysis.md#systems-and-frameworks-difficulty-ledger-and-relationship-map).

## 1. Discover scope and establish the teaching contract

Read `AGENTS.md`, current `design-qa.md` entries for the affected module, routing/shared primitives, and two relevant neighboring chapters. Read [project-integration.md](references/project-integration.md) for the integration surface and tool discovery. Inspect only relevant conversation history when available; extract repeated failures, not every historical preference.

Classify the task as **create, repair, extend, redesign, QA, or assess**. For an existing chapter, capture affected modes and rendered baseline before layout-affecting edits. Declare what may change and what must survive. Work within that contract; if a repair cannot fit, explain the concrete conflict and ask about the scope expansion instead of silently redesigning it.

Search the registry before creating a topic chapter. If it already exists, inspect current coverage and deliver the requested improvement there. If it already meets the request, verify and report that coverage; do not duplicate it or invent work merely to generate a diff.

For a new chapter or substantial redesign, read [autonomous-delivery.md](references/autonomous-delivery.md) and initialize a resumable run:

```bash
node .agents/skills/develop-interactive-module/scripts/module-run.mjs init chapter-id --topic "Technical topic" --kind create
```

Use `docs/module-runs/<chapter-id>/` for the run record, a concise `brief.md`, and `research.md`. Reuse the run when continuing. Small repairs use the affected `design-qa.md` entry and focused evidence; do not burden a label correction with a full dossier.

In the brief, decide:

- **Teaching question:** what should a reader understand or predict after exploring?
- **Explanatory thesis:** what result or design concern motivated this request, and what causal answer should the reader be able to give? Preserve that concern through decomposition; a generic architecture tour or a polished local demo is not enough.
- **Prerequisites and scope:** supply essential concepts in context or link existing chapters; do not implement a whole prerequisite course.
- **Chapter ownership:** decide what this chapter teaches in depth, what it connects to the system, and what belongs in a named neighboring chapter. Read the destination before promising its coverage. A dependency's importance does not automatically make its internals part of this chapter.
- **Mechanism and tradeoff:** what changes, why it helps, where it fails or costs more.
- **First useful view:** which concrete objects and relationships make the mechanism visible immediately?
- **Exploration:** the meaningful action, changed model fact, visible consequence, and expected boundary state.
- **Change surface:** affected modes, execution contexts, parameters, selections, languages and widths; preserved behavior for existing work.

Choose only needed capabilities: `timeline`, `multiple-modes`, `resource-metrics`, `structural-comparison`, `data-movement`, `dense-layout`, `math`. These select design and verification requirements, not a feature checklist.

## 2. Resolve identity and verify the technical model

Before committing to an ambiguous name, inspect user links, local context and authoritative search results. Record the resolved project/paper, version or commit and source. Do not substitute a familiar similarly named project. If materially different candidates remain, ask one precise identity question and leave dependent implementation pending.

Use primary papers, official documentation and actual source implementations. Read relevant content, not only search snippets. For implementation-level teaching, source-check the claimed path at a pinned revision and execution context; follow [implementation-fidelity.md](references/implementation-fidelity.md). Shallow examples may simplify size/presentation while preserving semantics and dependencies; deeper views must expose the verified implementation relationship and identify remaining abstractions. Stop broad searching once the central mechanism, shapes, execution, resource accounting and boundary have adequate evidence. Read [content-and-math.md](references/content-and-math.md) when producing claims, equations or implementation evidence.

For technical topics, framework/system explanations or feedback about focus/depth, read [technical-analysis.md](references/technical-analysis.md) and use Analyze Technical Principles. Establish the central question, conceptual hierarchy and chapter ownership before choosing experiments. Use repository analysis only when the task or an unresolved implementation fact calls for it. Complete research does not mean putting every discovered feature on the page.

Record each central claim in the run: source URL and section/symbol, execution assumptions, simplification/boundary, pure-model consequence, exploration trigger, expected visual evidence. Resolve or explicitly bound source conflicts; remove unsupported claims rather than inventing internals or speedups. Distinguish training/prefill/decode, logical/physical state, estimated/measured cost and illustrative/real tensor values where relevant.

## 3. Design evidence before panels

Read [interaction-model.md](references/interaction-model.md) and [visual-grammar.md](references/visual-grammar.md). Compare two plausible representations briefly in the brief, then choose the one exposing the mechanism with less indirection. Do not create two full implementations or ask the user to art-direct them.

Choose the implementation after choosing the representation. Read [technology-selection.md](references/technology-selection.md) for a new chapter/redesign or when the current renderer limits clarity, density, performance or interaction. Record the chosen approach, relevant alternatives and evidence in the brief. Routine repairs need no technology survey unless technology causes the defect.

- Start from concrete model objects: dimension-labeled matrices, token positions, cache slots, state containers, devices or requests. Operation-name boxes and prose do not substitute for showing a central transformation.
- For a genuine optimization, expose the relevant baseline, mechanism, benefit and cost together on shared inputs and quantitative scales. Include a boundary where the benefit shrinks or reverses when supported; do not manipulate scales to guarantee a win.
- For cooperating subsystems, show the connected architecture together, then overview → component → record → return. Comparison tabs must not pretend those subsystems are alternatives.
- Put controls beside the canvas they affect. Separate independently paced explorations into explicit local playback scopes; views claiming the same execution derive from the same lifecycle. Do not force one global clock on independent canvases.
- Keep the first view understandable and immediately useful. Put detailed derivations/provenance in contextual inspectors; preserve visible tradeoffs and primary controls. Avoid paragraphs inside nodes or a page of cards before the experiment.
- Carry the analysis handoff's concrete objects and relationships into the first useful view and local experiments. A sourced result may introduce the question; local counts must point to visible objects. Prefer direct selection on those objects with a nearby consequence/inspector over a separate selector followed by explanatory text and another jump. Preserve the continuous default argument and parent context; do not turn cooperating components into replacement views.

## 4. Implement a complete vertical slice, then complete the teaching question

Normalize inputs, derive a pure domain snapshot, then render all dependent views from it. Store only genuine configuration and lifecycle state. Classify independent, constrained, derived, mutually exclusive and presentation controls. Define reset/remap behavior before wiring mode changes.

Implement a representative path end to end early: real control → model transition → visible operation/result → synchronized explanation/metric. Render it before expanding to more modes. If the essential mechanism remains invisible, fix the representation now rather than adding prose later.

Read this first usable slice in reader order before expanding it. Catch an incoherent organizing idea here; do not defer the first holistic reading until after every panel has been built.

For timelines, follow real dependencies and distinguish pending/active/passed/done. A serial lane has one active operation; actual parallel lanes may execute together. Advance tokens only after their pipeline completes; end cleanly without accidental wrap or end-frame jump. Preserve stable object identities when tracing provenance.

In the current React shell, reuse shared language, `MathFormula`, `ChapterIcon`, workbench spacing and experiment state/sharing conventions. Other rendering/module technologies must integrate those user-visible contracts through adapters or equivalent implementations: one site language control, correct LaTeX, coherent chapter identity, navigation, configuration lifecycle and share links. A specific hook, CSS framework or component API is not itself the learning requirement. Follow [project-integration.md](references/project-integration.md); keep changes relevant to the accepted outcome.

## 5. Inspect, repair, and reverify autonomously

Read [qa-checklist.md](references/qa-checklist.md) and the gates in [autonomous-delivery.md](references/autonomous-delivery.md). Execute checks appropriate to affected behavior:

1. Model invariants and numerical oracles, including representative and boundary cases.
   For a real implementation path, reconcile the model and rendered states with the inspected source, including non-default branches that the chapter exposes. Use independent numerical/reference expectations where applicable; tests that repeat the visualization's own assumptions do not prove source fidelity. Unresolved central correctness or implementation mismatches block technical acceptance, even if the page is readable and the build passes.
2. Browser journeys: change controls, inspect coupled views, traverse drill-down and return, switch modes mid-run, reset, finish playback where present, leave/reenter the chapter, and use a share link when affected. Static default-state screenshots never satisfy browser journeys or the owner reader pass: exercise at least one non-default branch per interactive section in every delivered chapter (including each chapter in a multi-chapter batch) to catch unresolved i18n keys, clipped narrow bar labels, and prose-only alternate states.
3. For full chapter delivery, inspect the actual teaching canvas in Chinese/English at desktop, tablet and mobile widths, including dense and boundary states, in both light and dark themes. Verify shared shell contracts by reading back observable rendered output rather than DOM counts or guessed storage keys: confirm `data-theme` actually flipped between light and dark, inspect every rendered option label in the overview/section-jump dropdown (not merely anchor counts), confirm active navigation remains reachable/visible, and check contrast, dimensions, proportionality, control proximity, connections, narrow-segment label fit, empty space, console, math and overflow. Open and inspect screenshots, not just save them.
4. Conventions, applicable domain checks, the actual production build, and workbench routing/sharing checks when affected. On the current stack these are `npm run build` and `npm run check:workbench`. If technology changes, keep these entry points working where feasible or update their documented replacements and validate the same behaviors. Adapt React-specific lexical checks to the chosen implementation; never waive the underlying quality requirement because a checker assumes the old stack.
5. Owner reader acceptance: follow [reader-review.md](references/reader-review.md), personally read the final rendered chapter continuously, explore important branches and reconstruct its answer from what is visible. Record actual reading order and friction, repair substantive gaps without waiting for the user, then reread the whole explanation. Functional/visual matrices and independent approval do not waive this gate.

For several coupled dimensions, create a module-owned `qa-matrix.json` and run:

Use pure-model checks for broad legal combinations and coupled invariants; browser journeys cover representative interactions plus each affected mode, risky transition and rendered boundary. Declare that distinction in the matrix/QA note instead of implying that enumerated combinations all ran in a browser.

```bash
node .agents/skills/develop-interactive-module/scripts/check-qa-matrix.mjs docs/module-runs/chapter-id/qa-matrix.json
node .agents/skills/develop-interactive-module/scripts/check-module-conventions.mjs src/components/YourModule.jsx --capabilities timeline,math
```

Review technical truth, teaching focus/hierarchy, natural reader-facing copy, interaction behavior, visual usability and project integration. For each, record observable findings and evidence; a numeric self-rating is not proof. Check whether the reader can follow the main idea without opening every dependency and whether each drill-down explains its parent. Fix defects within scope, add meaningful regression coverage for confirmed failures, and re-run affected checks. Recheck the final revision, not an earlier screenshot.

Review the user outcome independently of mechanical QA: ask the reviewer to reconstruct the chapter's causal answer from the rendered artifact, identify what distinguishes this subject, and explain a condition where the headline result would not transfer. Supply the original request and sources without the author's preferred answer or prior pass verdicts. A successful click journey, hierarchy, build or large screenshot matrix cannot waive a missing central explanation. Reopen the teaching design when this test fails.

For substantial work — including every new chapter, multi-chapter batch, and substantial redesign — bring two mature neighboring rendered chapters into this judgement before expanding the first slice, then check the final experience again as specified in [reader-review.md](references/reader-review.md). Compare depth of core pillars, useful observation, direct interaction and dense mechanism reading, not decoration or screenshot totals. When a request spans multiple chapters, deliver each chapter to full standalone depth rather than compressing every chapter into a thin starter skeleton to fit one pass. If repeated review exposes the same gap, revisit the argument/representation rather than accumulating more paragraphs, controls or QA records.

Include selection falsification in browser journeys: click corresponding objects on both comparison sides, inspect an object excluded from the active operation, then change configuration so the selected object disappears. Verify diagram identity, highlight, inspector, stage-specific copy and source stay aligned. Check a non-default execution branch even if it shares stage labels with the default branch.

Use one independent reviewer for substantial new chapters/redesigns when subagents are available and authorized by this workflow. Give the reviewer the user request, source basis, current artifact and acceptance contract; ask for observed issues and reproduction steps without supplying your preferred verdict. The owner integrates fixes. Otherwise perform a separate adversarial pass and record self-review; neither mode grants extra tool permissions.

If a tool/check remains unavailable, try a suitable supported fallback. Record the blocked check and cause, finish unaffected work, and deliver an accurately labeled partial result. Do not retry unchanged failures indefinitely or quietly waive the gate. If repeated design attempts fail the same teaching claim, revisit the representation/source model rather than endlessly changing CSS.

## 6. Deliver with evidence and a continuation point

Update `design-qa.md` with scope, resolved claims, actual checks, screenshots, findings, remaining limitations and contract impact. For full runs, record input hashes and validate the run record as specified in [autonomous-delivery.md](references/autonomous-delivery.md). Keep unexecuted checks pending/blocked; the helper validates evidence bookkeeping, not whether science or design is good.

Deliver a runnable chapter/preview and concise account of what the reader can now see, verification performed and unresolved limits only after the owner reader pass and other required gates succeed. For assessment, deliver assessment only. Do not end with an invitation for the user to discover obvious missing functionality or trigger the holistic read-through. Leave precise next actions in the run if interrupted; on resume inspect current files and continue from the earliest invalidated gate.

## Maintaining this skill

Use [skill-evaluation.md](references/skill-evaluation.md) and [evals/scenarios.json](evals/scenarios.json) when changing this workflow. Test realistic behavior and failure cases, not merely whether instructions contain expected words. [upgrade-basis.md](references/upgrade-basis.md) records research and historical failures; read it when revising the workflow, not on every chapter task.
