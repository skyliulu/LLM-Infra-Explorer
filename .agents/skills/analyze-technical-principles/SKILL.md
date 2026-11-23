---
name: analyze-technical-principles
description: Analyze a technical idea or framework through its problem, design reasoning, conceptual hierarchy and component relationships. Use for top-down explanations, chapter planning, teaching-focus corrections and principled decomposition; decide chapter ownership and source-check implementation-level claims. Repository walkthroughs are optional.
---

# Analyze Technical Principles

Turn a topic into a coherent explanation of **why it is designed this way and how its parts fit together**. The output is a teaching model, not a source-code inventory. In this project, pair with develop-interactive-module when implementation is requested; analysis-only requests stop at analysis.

## Start with the reader's question

Establish the subject's level: an algorithm, a component, a broad foundational domain, a framework or a whole service. State one central question in ordinary language and the explanation the reader should be able to give afterward. Inspect neighboring chapters and the reader's prerequisites before selecting depth. Do not replace the user's broad question with a tiny implementation toy, or respond to shallow content by dumping all available details into one page. Equally, do not misread "avoid detail dumps" as license to prune core backbone pillars of a broad foundational or system domain: a narrow optimization can focus on baseline → mechanism → tradeoff/boundary, whereas a broad domain or serving-system chapter must still carry its full causal spine (physical/system organization → core mechanisms and tradeoffs → resource/protocol boundaries → failure diagnosis or architectural evolution).

Before decomposing, establish the **explanatory thesis**: why this subject matters to this reader, what apparent result needs explaining, and the causal answer the chapter will defend. A topic name and a question such as “how does it work?” are insufficient when the user's concern is performance, cost, reliability or a design choice. Record the reader's desired conclusion in their terms, then test whether the proposed question still covers it. Do not let existing demos or easy-to-animate mechanisms choose the thesis.

Treat the initial thesis as a hypothesis, not a required positive verdict. Look for conditions that invalidate it. Draft the reader concern before consulting earlier QA verdicts, then use existing artifacts as evidence to challenge rather than inherit the earlier focus.

Build an outcome-to-cause map: observed result → controlling quantities → design decisions → necessary mechanisms → conditions and costs. Distinguish the subject's distinctive contribution from generic background. An architecture inventory can support this argument but cannot replace it. For a performance/cost topic, connect useful throughput under latency/quality constraints to resource use and unit economics; explain both work eliminated and resources used more effectively where supported. Do not silently equate throughput, per-user speed, income, profit or investment recovery.

Use a counterfactual to check explanatory completeness: if the most detailed demo were removed, could a reader still explain the subject's main result? If not, the chapter is centered on that demo instead of the user's question. If only generic queue/executor/cache responsibilities remain after replacing the project name, find the subject-specific design reasoning before handoff.

## Build the explanation from the top down

1. **Problem and constraints.** What makes the straightforward approach insufficient? What workload, resource or correctness constraint motivates the design?
2. **Organizing idea.** What is the main design decision? Show the system or representation as a whole before naming its optimizations.
3. **Responsibilities and interfaces.** Decompose the whole into components by what they own and exchange. Trace a representative request, tensor or state through them. Distinguish composition, execution order and alternatives; do not flatten them into interchangeable feature tabs.
4. **Necessary mechanisms.** Drill into the design choices that explain the central question. For each, connect the problem → change → benefit → cost. Stop when a deeper detail no longer helps this chapter's argument.
5. **Return to the whole.** Explain how the mechanism changes its parent component and the end-to-end behavior. Keep parent context and a way back in the eventual interaction.

These are reasoning steps, not five mandatory panels. Useful hierarchy changes the question at each level; a breadcrumb above a flat list of unrelated features does not create hierarchy. Do not use code directories, class names, kernel names or a README feature list as the conceptual structure.

## Systems and frameworks: difficulty ledger and relationship map

When the subject is a system or framework, the explanation must show **why its organization exists**, not just what the components do. Three commitments are required before choosing views:

- **Difficulty ledger.** Name the two to four technical difficulties that make the straightforward design insufficient: a resource or timing constraint such as bandwidth, capacity, latency, occupancy, contention, or scheduling under a promise. For each difficulty record the constraint and its unit or magnitude, the counterfactual (**what fails without the mechanism**), the mechanism that answers it, and the boundary where it stops helping. A mechanism that cannot be tied to a named difficulty is background at best, or belongs to another chapter. The page's central mechanisms should be traceable to this ledger.
- **Relationship map.** Separate the control plane from the data plane. State who owns each resource and each piece of state, what crosses every interface (the concrete payload or decision, not just a line), and the request or state transitions. A row of boxes labelled with component names does not establish relationships; the reader should be able to say who decides, who executes, who stores and what each hand-off contains.
- **Design alternative.** Name a real competing design (monolithic, a different disaggregation, a different partitioning) and why the subject chose otherwise. Do not present the resulting architecture as inevitable or as the only possible answer.
- **Design versus implementation.** Pin the paper revision and section for interface-level facts (who sends what, which IDs or decisions cross a boundary, what is checked and when). **Source code at a pinned revision outranks docs and papers for behavior; use the paper only when no implementation is available or when the explanation is explicitly about the design, and label it as design.** When the subject system is implemented, the architecture view is the implemented stack; a paper mechanism absent from the implementation appears only as an unimplemented boundary, never as the primary canvas. Name where the current implementation has moved on — a renamed service, a scheduler that became an index, new layers — and state which layer the explanation draws. Do not fill interface details from plausibility, and do not attribute the paper's guarantees to the current deployment.

If the subject is a system but the proposed thesis explains one subordinate mechanism (a cache tier, a scheduling policy, a data format), test the thesis against the user's system-level concern. When it does not answer that concern, the mechanism becomes a section and the system's difficulty/relationship argument becomes the spine.

## Make the argument observable

Plan the reader's entry point as well as the decomposition. Introduce the result or concrete constraint worth explaining early, with its metric/operating conditions when evidence exists. A problem, resource difference or boundary case can serve when no measurement is available; never invent a headline number to fill the opening. A large architecture inventory before any useful observation can obscure an otherwise correct thesis.

For each central mechanism, hand off the **object and shared input → transformation/relationship → resource consequence → cost or boundary → reader prediction**. Name the tensor rows, physical copies, blocks, requests or records the reader will trace, what remains identical across a comparison, and which fact changes. A metric table and a paragraph naming the cause do not establish the relationship. State whether the relationship is spatial, temporal, ownership, numerical or a decision so the renderer can expose it directly; a time-dependency claim should not leave readers comparing many text states in their heads.

Keep two compatible paths: a continuous default argument that reaches the answer, and local exploration that reveals the necessary internal evidence without losing the parent. Assign each section one engineering question; put implementation provenance and repeated qualifications in context instead of making every section follow the same summary template. For Chinese, prefer concrete mechanism headings and object/action sentences. Depth is the ability to predict behavior at a boundary, not the number of details included. These are handoff criteria, not a requirement for a fixed card count, timeline, article layout or animation.

Before adding depth to an existing explanation, classify its role: necessary causal reasoning, supporting evidence, or optional verification. Research completeness and implementation fidelity do not require equal prominence for every verified detail. Keep indispensable mechanisms on the default path; place secondary material where its prerequisites and parent relationship are clear. Evaluate the addition against the whole reader journey: does it strengthen the argument, or replace the organizing idea with a detour? Choose the presentation from that role rather than prescribing one disclosure pattern for all topics.

## Decide chapter ownership before experiments

Make a small table: concept, role in this system, depth here, owning chapter, and reason. Use three editorial decisions:

- **Explain here:** the organizing principle or mechanism this chapter promises to teach.
- **Connect here, deepen elsewhere:** explain the dependency's purpose, input/output and effect on this framework; link to its algorithm chapter. Read the destination and do not claim it covers details it does not contain.
- **Leave out:** material unnecessary for this reader question; retain relevant research in notes when useful.

A framework's dependency on an important algorithm does not transfer ownership of that algorithm to the framework chapter. Equally, a page of links without the framework's own organization is incomplete. Select the explanation that makes the reader understand the system, not the one with the most controls or named features. If a useful destination is missing, record the gap and supply only essential context here; do not silently create an unrelated course or fabricate the destination's coverage.

Challenge the selected question against the user's topic level. A framework-wide request is not satisfied by a scheduler animation alone: the explanation must connect work admission, execution/resources and state/results at the appropriate level. An algorithm request still needs its central mechanism here: for example, explaining FlashAttention requires how tiled computation preserves attention normalization and changes memory traffic, rather than delegating that mechanism to another chapter. An interface should name concrete objects that cross it, not merely draw boxes labelled "component" and "backend".

## Find evidence for principles

Prefer primary papers and architecture/design documentation for motivations, abstractions and tradeoffs. When teaching a real implementation, inspect the matching source for implementation-level claims: actual shapes/dtypes/layout, dispatch, state ownership and lifetime, dependencies, synchronization and resource accounting. This verification is required for those claims; a visible source walkthrough is optional. Use Codebase Knowledge Builder only when repository orientation or tracing helps. Follow the paired rendering skill's [implementation fidelity](../develop-interactive-module/references/implementation-fidelity.md) guidance; keep evidence version-aware without turning the page into a code tour.

Design the descent from principle to implementation deliberately. A small shallow example may reduce dimensions or omit secondary work, but must preserve the mechanism's mathematical semantics, ownership and dependency order. A deep view that promises a real path must map its objects and transitions to that path's pinned source and execution context. Name meaningful differences between the conceptual specimen and the implementation rather than silently treating a toy as production. Missing or contradictory evidence blocks the affected accuracy claim; qualify, repair or defer it before acceptance.

Separate model architecture, framework organization, deployment choices and implementation optimizations. Distinguish supported capability from enabled production configuration. Mark assumptions and unknowns. Do not invent intent, speedups, exactness or internal behavior from library names. Broader research notes can support a deliberately focused page.

For headline results, record the metric definition, workload, hardware, scale, operating point, source date/version and comparison scope. Keep public-engine benchmarks distinct from a complete production service. Trace claimed economics to their provenance; when costs or payback assumptions are missing, expose the missing variables or a clearly labeled sensitivity calculation instead of repeating a headline as fact. Do not multiply isolated optimization gains into a fabricated end-to-end gain.

## Handoff and review

For a chapter task, save a concise `principles.md` in its module run: reader concern, explanatory thesis and expected reader answer, outcome-to-cause map, hierarchy, design choices/tradeoffs, chapter-ownership table and evidence. For a system or framework chapter also include the difficulty ledger, the relationship map (control/data planes, owners, interface payloads, state transitions) and the rejected design alternative. Include the first useful observation, default argument progression and the central object/relationship/prediction handoff above. Hand the rendering skill concrete relationships and observations to express; leave rendering technology open.

Review by asking: Can the reader explain the organizing idea? Does each drill-down answer a narrower parent question? Are there details that belong elsewhere? Can one trace the whole without understanding every dependency? Are the important mechanisms clear enough to explain why the design works? For a system chapter, can the reader name each difficulty, the mechanism that answers it, what would fail without it, and the design alternative that was rejected? Research size and feature counts do not answer these questions.

Before handoff, read the proposed explanation in its intended reader order as connected prose. Check that each section uses only concepts already introduced and advances the original question; reconcile the component hierarchy with the causal argument. A list of individually correct mechanisms or a thesis headline is not a continuous explanation. Reconstruct the answer from the actual material, identify missing bridges, and revise before passing it to rendering.

For implemented chapters, the rendering skill's [automatic owner reader pass](../develop-interactive-module/references/reader-review.md) is mandatory before delivery. The owner personally reads the final page and its branches, records friction and autonomously repairs/rereads within the task scope. Do not assume an analysis handoff, independent reviewer, functional matrix or user-triggered later critique fulfills this step. For analysis-only work, apply the connected reading to the analysis itself without creating a page.

Write the visible explanation naturally in the reader's language. For Chinese, use concrete subjects and actions, familiar engineering terms and short meaningful headings. Avoid literal translations, abstract noun piles, repeated contrasts and audit language. Keep assumptions/provenance nearby but subordinate. The develop-interactive-module content reference defines the rendered copy review.


For a technical audience, write a short connected argument before allocating interactive panels. Each section should resolve a concrete engineering question and introduce the constraint that motivates the next decision. Include enough internal detail to predict behavior: data ownership, tensor batch shape, buffer lifecycle, dependency or scheduling criterion as appropriate. A default overview followed immediately by conclusions, with all reasoning behind selectors, is not a technical report. Check both the unclicked reading path and the optional exploration; neither should depend on the author filling gaps from research.
