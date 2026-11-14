# From principles to a chapter

First establish the reader's concern and explanatory thesis with the analysis skill. Carry an outcome-to-cause map into the rendering brief: result → controlling quantities → design decisions → mechanisms → costs/conditions. A hierarchy organizes the argument; it does not determine the argument. Preserve the user's intended outcome even when a smaller existing demo is easier to implement.

For a technical topic or framework explanation, use [Analyze Technical Principles](../../analyze-technical-principles/SKILL.md). Start with the problem, design reasoning and hierarchy, then decide chapter ownership before authoring experiments. Repository orientation is optional evidence work, not the default explanation method.

The analysis handoff is a concise `principles.md` in the module run: central question, top-down decomposition, causal request/data path, responsibilities/interfaces, design choices and tradeoffs, evidence, and a chapter-ownership table. Distinguish **explain here**, **explain the integration here / link for internals**, and **omit because irrelevant to this question**. Judge coverage against the chapter's accepted question, not every feature in a README or every row in research notes.

Carry the first useful observation and default argument progression into the brief. For each central mechanism, preserve the analysis handoff's object/shared input, transformation or relationship, resource consequence, boundary and reader prediction. The renderer chooses how to expose these facts; it must not quietly replace an ownership or time relationship with a changing count and explanatory prose. A result anchor can be measured or qualitative according to evidence. Do not require a headline metric, three benefit cards or a particular page structure on every topic.

A framework chapter explains how the framework organizes work, resources and state. Dependencies get enough context to establish their input/output and why the framework needs them. A specialized algorithm belongs to the chapter teaching that algorithm. Linking is successful editorial placement when the interface and causal connection remain clear. Do not duplicate its equations, knobs or simulator simply because the framework uses it. Conversely, do not replace a framework's own organizing principles with a feature list and links.

For a **system or framework** chapter the handoff must also carry:

- a **difficulty ledger** — for each of the two to four technical difficulties, the constraint and its unit/magnitude, what fails without the mechanism (counterfactual), the mechanism that answers it, and the boundary;
- a **relationship map** — control plane vs data plane, who owns each resource/state, the concrete payload or decision crossing every interface, and the request/state transitions;
- the **rejected design alternative** and why the system chose otherwise.

The chapter's first useful view should expose that relationship map (who decides, who executes, who stores, what moves), not a component inventory. Each central mechanism should be traceable to a named difficulty; a mechanism with no difficulty behind it is background or belongs elsewhere. If the proposed thesis explains only one subordinate mechanism of a system, verify against the reader's system-level concern before accepting it as the chapter spine.

The handoff also states which layer the chapter draws: the paper's design or the current implementation. Pin the paper section for interface-level facts, name renamed services or a scheduler that became an index, and carry the boundary into the page where the reader meets the architecture. A claim added after the first analysis pass returns to the primary text before it enters the brief.

For each mechanism, record the strongest evidence level available: **pinned source code, then docs, then the paper**. Code wins wherever it exists; a paper-only mechanism is labeled as design, not current behavior.

For real implementation-level claims, inspect the matching path at a pinned revision and context as required by [implementation-fidelity.md](implementation-fidelity.md), not only when an obvious doubt arises. The installed Codebase Knowledge Builder can help with orientation/tracing; it is not required for every explanation. Design docs and papers establish motivation and abstractions; executable source checks actual behavior and constraints. Keep this evidence behind a principle-led explanation. Neither source paths nor API names should determine the reader's hierarchy.

Keep research broader than the page. Deep implementation notes can remain in the run without turning into visible navigation. For broad topics use overview → responsibility → mechanism as meaningful levels, with a parent context and return path. A flat list of eleven detailed features plus a breadcrumb is not a hierarchy.

Before handoff, describe in ordinary language what the reader should now be able to explain. Remove any panel, control or detour that does not support that outcome. Apply the reader-facing copy pass in [content-and-math.md](content-and-math.md) before rendered QA.

The analysis handoff does not complete reader acceptance. The chapter owner automatically performs [the continuous rendered reader pass](reader-review.md), including actual default order, alternative branches and return paths, before delivery. Its failure reopens the argument/representation and triggers in-scope repair and whole-page rereading; do not wait for the user to discover the gap.
