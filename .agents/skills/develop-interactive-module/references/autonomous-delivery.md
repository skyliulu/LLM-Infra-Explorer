# Autonomous delivery and evidence record

Use for new chapters, substantial redesigns or an explicitly requested full delivery audit. The record makes work resumable and prevents build-only handoff. It is not a scheduler, separate agent runner, or proof of design quality.

## Gates

| Gate | Exit evidence | Failure action |
|---|---|---|
| Identity/research | resolved topic/version; central claims trace to primary sources; chapter responsibilities and conceptual hierarchy address the user's topic level; conflicts bounded | investigate gaps in the central explanation, relocate dependency internals, bound unsupported claims without silently reducing requested scope; ask only if identity/essential evidence remains unresolved |
| Teaching contract | question, first view, exploration, prerequisite boundary and change contract in `brief.md` | select a representation that exposes the mechanism |
| Model | tested shapes, dependencies, constraints and independent numerical/invariant oracle | repair model before decorating views |
| Vertical slice | real browser control changes the model and visible evidence | inspect early; change representation if needed |
| Coverage/integration | affected dimension coverage; navigation, language, sharing and lifecycle exercised | finish missing paths and dependent views |
| Visual/teaching review | opened screenshots; observable findings at relevant widths/languages/boundaries in light and dark; System resolution recorded | fix clipping, contrast, misleading scales, detached controls, empty space and weak evidence |
| Owner reader acceptance | owner personally read the current rendered chapter continuously, explored important branches/returns and reconstructed its answer; actual path, friction and repairs in reader-review.md | autonomously repair the explanation within task scope, then reread the whole; independent approval and local checks cannot waive this gate |
| Final verification | current-file checks, build, closed P0–P2 issues, QA and valid run record | rerun invalidated checks; keep incomplete work labeled |

Defaults are decisions, not questions: audience is an engineer familiar with basic LLM inference; output is one integrated bilingual interactive chapter; toy tensors are small and deterministic. Choose a default that reveals the claim, then expose its limitation. Override from user/context. Choose the renderer, module framework and necessary build approach using [technology-selection.md](technology-selection.md); the current React stack is an available default. Paid APIs, publishing services and background automation are not prerequisites for this workflow.

## Research completion

Organize `research.md` around claims affecting the visible mechanism. Record source versions/commits and section/symbol locators. A performance claim needs measurement conditions; otherwise show labeled analytical cost. Code-level claims need implementation evidence: a paper alone does not establish engine allocations/dispatch. Toy examples need shapes, values/seed and a hand-checkable result. Do not cite inaccessible content as read.

Keep central claims in `run.json` with model and visual consequences. Supporting background can stay in the note. Research is sufficient when changing a central UI fact would require changing a ledger claim; collecting links is not the objective.

Architecture claims need source-backed relationships, concrete interfaces and a usable drill-down. Verify actual topology/ownership/navigation invariants where modeled; do not invent numerical metrics, timelines or tensor simulations merely to satisfy a generic model/visual gate. Coverage is relative to the accepted principle and chapter responsibilities, not the size of a research inventory.

## Record lifecycle

`module-run.mjs init` creates a **pending** record only. It never generates chapter code, executes checks, or marks pending results passed. Edit it as work runs. Use a unique chapter/run ID for a separate experiment; initialization refuses overwrite.

```bash
node .agents/skills/develop-interactive-module/scripts/module-run.mjs init example --topic "Example topic" --kind create
node .agents/skills/develop-interactive-module/scripts/module-run.mjs snapshot docs/module-runs/example/run.json src/components/Example.jsx src/components/example/model.js
node .agents/skills/develop-interactive-module/scripts/module-run.mjs verify docs/module-runs/example/run.json
```

Run `snapshot` **before final verification** on all relevant implementation and shared integration files. After edits, snapshot new inputs and rerun affected checks; never refresh hashes around old evidence. The verifier detects changed bytes and evidence older than the snapshot; it cannot detect omitted inputs or fabricated results. Record each check's start time; create its logs/screenshots after the snapshot. Keep earlier baseline screenshots separate.

Paths in the record are relative to `run.json`, including `inputs`. They must resolve inside the repository, including symlinks. Preserve native PNG/JPEG screenshot bytes with matching `.png`/`.jpg`/`.jpeg` extensions and nonempty evidence files. Inspect the actual returned encoding rather than assuming that a filename controls the browser's screenshot format. The helper checks image framing, not decoded pixels or scientific meaning. A passed browser/visual check references screenshots; a passed command check supplies command, exit code 0 and a log. The verifier never executes commands.

Record structure (initialized JSON is the editable example):

- `schemaVersion`, `chapterId`, `topic`, `kind`, `status` (`in_progress`, `blocked`, `complete`), `nextAction`.
- `capabilities`: used capabilities; `assumptions`: chosen defaults; `inputs`: relative file → SHA-256; `snapshotAt`.
- `artifacts`: `{ id, kind: note|log|screenshot, path }`.
- `claims`: `{ id, statement, source, locator, boundary, model, trigger, expected, checkIds }`. Each central claim links a passed model check and passed browser check. Execution assumptions go in `boundary` or research note.
- `checks`: `{ id, kind, status, startedAt, artifactIds, command?, exitCode?, reason? }`. Required kinds: `research`, `model`, `browser`, `visual`, `reader`, `conventions`, `build`, `integration`. Status: `pending|passed|failed|blocked|skipped`. Only integration may be skipped with reason, for a redesign without integration changes; create requires passing integration. Multiple checks per kind are allowed; none remain pending/failed/blocked at completion.
- The `reader` check additionally needs `reviewer: owner`, actual `route` (include language/state), nonempty `readingPath` array, `retelling` reconstructed from the page, and `frictions` array (may be empty). Its evidence includes the `reader-review` note and an inspected current screenshot. Record failures and fixes in findings; a filled reader record does not waive a failed teaching verdict or open P2. Follow [reader-review.md](reader-review.md) for the actual automatic read/repair/reread workflow. `snapshot` invalidates this check and clears the old reading/retelling fields to prevent accidental reuse.
- `journeys`: `{ id, action, expected, checkIds }`. Cover central controls/claims, not just idle. Full runs need behavioral journeys.
- `reviews`: `{ area, verdict: pass|fail, observation, artifactIds }`. Areas: `technical`, `teaching`, `interaction`, `visual`, `integration`. Include reviewer identity/mode and observable evidence in observation, not just “looks good”.
- `findings`: `{ id, severity: P0|P1|P2|P3, status: open|fixed, description, checkIds }`. Fixed defects link passing regression checks. P0–P2 cannot remain open; disclose open P3.

Required note artifact IDs: `brief`, `research`, `qa` (may reference root `design-qa.md`) and `reader-review`. Reviews reference these and actual screenshots/logs. Machine validation checks references and evidence presence/freshness, not prose semantics or scientific truth. Historical records without the reader gate retain their original scope; they do not satisfy the strengthened completion contract. Continuing an old run adds a pending/failed reader check and completes real review before another delivery, without inventing past coverage.

A full QA run exercises the existing chapter's route/navigation, shared language, experiment lifecycle and relevant sharing behavior as its integration check even when it changes no integration files. A focused extension does not require a full run; if its scope grows into substantial redesign, use the redesign record and gates. Skipping integration is restricted to a redesign whose accepted contract leaves that surface unchanged, with a recorded reason.

For coupled dimensions, put `qa-matrix.json` in the run and run `check-qa-matrix.mjs`; include its successful log in integration/browser evidence. A matrix specifies cases, not proof they ran. Map observed cases to check IDs in the QA note.

## Self-correction and stopping

Ask: What enters? What changes? Why does it help? Where does it stop helping? Can I trace one object? Try to falsify the claim with a boundary input and trace a non-default selection.

Fix P0 (crash/false central mechanism), P1 (wrong result/broken principal interaction) and P2 (misleading evidence, unusable narrow layout, missing central explanation) before completion. P3 is minor polish without a false teaching consequence. Do not downgrade a central failure to avoid work.

When the same remedy fails twice, inspect a different causal layer: source/model, dependency, representation or environment. Continue while a new justified action exists. If progress requires an unavailable capability or unresolved user decision, record `blocked`, exact evidence, unaffected work and one next action. Bound unchanged retries, not legitimate implementation effort.

On interruption save the record and `nextAction` without completion. On resume inspect current diff/record/evidence and invalidate affected gates. Later narrow follow-ups must not erase the accepted objective.
