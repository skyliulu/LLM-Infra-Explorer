# Choose technology from the explanation

The user explicitly allows the rendering system and technology stack to evolve. Optimize for a technically faithful, clear and usable interactive explanation. Existing components and dependencies provide a useful baseline, not a ceiling. Preserve behavioral contracts and accepted scope while choosing implementation freely.

## Decide from the teaching object

First specify what a reader must see and manipulate: relationships, transformations, moving records, dense fields, topology, spatial ownership, timing or parameter effects. Then compare suitable implementation approaches. Candidate families include DOM/CSS, SVG, Canvas, GPU rendering, graph/layout engines, dedicated math/plot renderers, workers/WASM, or a different module framework. This list does not require any family or package.

Evaluate only approaches relevant to the task:

| Criterion | Evidence to seek |
|---|---|
| Explanatory fit | Can the central transformation, stable identity and actual scale be shown directly? |
| Interaction | Selection, inspection, zoom, scrubbing, linked views and keyboard paths needed by this concept |
| Density and performance | Representative sparse/dense scenes on target devices; input responsiveness and readable labels |
| Accessibility and language | Text/math clarity, semantic controls, keyboard access and bilingual layout |
| Delivery | Production build, asset paths, browser support, hosting and reproducibility |
| Maintenance | Dependency/API complexity, testability, debugging, integration and ongoing ownership |

Do not select 3D or GPU rendering merely for novelty, or force a difficult geometry into HTML simply because the project already uses it. Compare a promising alternative against the current approach when it has a plausible explanatory advantage. Use a small representative spike if that advantage is uncertain, then select one approach; do not build two complete chapters.

Read current official documentation and inspect existing dependencies before adopting a specific library/API. Verify its relevant browser/runtime and distribution requirements rather than assuming a name guarantees suitability. State measured observations separately from anticipated benefits. No universal performance cutoff or preferred library is required.

## Record a compact decision

For new chapters/redesigns or a technology-driven repair, add to `brief.md`:

- the visual/interaction requirement driving the choice;
- real constraints versus inherited defaults;
- selected renderer/framework and why relevant alternatives fit less well;
- spike evidence when needed, target-device/browser limitations and fallback;
- integration/build/dependency changes and how they will be verified.

Retain the current approach if it already expresses the mechanism well. Adoption of another renderer, framework or build approach is an autonomous engineering decision within the requested outcome. Explain the decision in progress/delivery; do not ask the user to select a stack or approve it merely because it differs from the repository today. Clarify only an actual incompatible requirement, scope conflict, paid/external service or access boundary not already authorized.

## Integrate at the useful boundary

Choose a local adapter, a separate bundled module, or broader infrastructure change according to the actual benefit and maintenance cost. A broader change is justified when it is necessary or clearly beneficial to the requested delivery; do not impose a full-site migration when a contained implementation works equally well. Keep unrelated chapter behavior working and validate affected shared surfaces.

Preserve route/search access, bilingual behavior, mathematical meaning, experiment settings, share links and responsive reading order. Existing React hooks/components are reusable implementations of those contracts; another framework can implement compatible adapters. An isolated page that cannot be reached from the workbench is not an integrated chapter merely because its own demo runs.

Keep one authoritative domain model. Imperative drawing, workers and GPU kernels consume its snapshots or own an explicitly modeled lifecycle; they must not invent a conflicting simulation behind the UI. Renderer effects belong in controlled adapters. Clean up animation loops, event handlers, observers, workers and graphics resources on teardown; check re-entry and hot reload as appropriate.

Use meaningful semantic controls and readable text/math alongside non-DOM scenes where needed. Test resize, zoom, hit testing, device-pixel scaling and selected-object correspondence for renderers that expose those risks. When a GPU/device capability is optional, verify a clear fallback or an explicit supported-device boundary without losing the core teaching claim.

## Verify the chosen implementation

Production build and actual hosted/preview asset resolution must work with the chosen packaging. Preserve the project's static deployment capability unless the task has a concrete reason to change it; record and exercise any changed delivery requirements. Technology flexibility does not imply a request to publish or purchase infrastructure.

Retain source/model, behavior, rendered and integration checks regardless of implementation language or renderer. Adapt implementation-specific convention checks with equivalent assertions and document the mapping. Capture current screenshots and real interaction evidence at relevant widths/languages and target hardware. A more sophisticated renderer must earn its place through clearer observable evidence, not a larger dependency list.
