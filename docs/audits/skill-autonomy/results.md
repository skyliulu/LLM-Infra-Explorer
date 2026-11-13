# Skill autonomy upgrade validation

## 2026-10-28 — Outcome-first correction

The earlier hierarchy trial passed mechanical checks but the user still could not explain why DeepInfer was fast/cost-effective. Treat this as a substantive skill failure, not a request for more feature cards. Both Skills now establish a testable reader concern/thesis and outcome-to-cause map before hierarchy, preserve mechanisms necessary to that argument, and require independent outcome acceptance as well as mechanical QA.

The actual regenerated DeepInfer case underwent an independent repair loop: reviewer rejected the first Wide-EP explanation as an unsupported visible conclusion, then accepted the added same-hardware/same-work expert grouping experiment. Light/Dark canvas surfaces, headline economic scope and natural Chinese were also checked. Current acceptance is in `docs/module-runs/deepinfer/performance/qa.md` and `outcome-review.md`.

`thesis-forward-eval.md` is a blind decision handoff for a different framework, generated without reading DeepInfer implementation/history. It preserved performance/cost conditions and necessary mechanisms instead of collapsing into a scheduler tour. It also identified bias from earlier QA and positive-thesis assumptions; the analysis Skill now explicitly treats its thesis as a falsifiable hypothesis. This is one analysis behavior test, not a universal one-shot guarantee.

Date: 2026-10-27. Scope: repository skill and its evidence helper, not a new technical chapter.

## Validation performed

| Level | Result | Actual evidence / limitation |
|---|---|---|
| Official skill format check | Passed | Installed skill-creator `quick_validate.py` printed `Skill is valid!`. PyYAML was missing; installed only into a temporary validator directory and supplied via process-local PYTHONPATH. No project dependency changes. |
| Evidence helper tests | 15/15 passed | `node --test .agents/skills/develop-interactive-module/scripts/module-run.test.mjs`; synthetic fixtures cover input mutation, missing/stale evidence, failing or blocked checks, claim/journey links, blocking findings, path escape, malformed schema, init overwrite and snapshot invalidation. |
| Existing coverage validator | Passed | `node .agents/skills/develop-interactive-module/scripts/check-qa-matrix.mjs --self-test`. |
| CLI discovery | Passed | `module-run.mjs --help` documents init/snapshot/verify. The helper never executes recorded commands or marks results passed. |
| Independent behavioral dry run | Six scenarios reviewed; decisions conform | See `behavior-dry-run.md`. This is a scoped interpretation exercise, not six completed chapter tasks. |
| Independent gate review and retest | Four reported defects fixed | See below. Valid control fixture still passes; all four original negative fixtures now reject. |
| Application compilation | Passed | `npm run build`: Vite 5.4.21, 1996 modules, successful output. Existing Browserslist freshness notice remains; no application source changed. |

## Behavioral grading

Evaluator received scenario prompts and current skill, not expected answers or `evals/scenarios.json`. Grading below was performed afterward against the maintained scenario criteria.

| Scenario | Decision evidence in independent report | Dry-run verdict |
|---|---|---|
| Topic delivery | Detects existing FlashDecode; verifies split/reduction, analytical/measurement boundary, preserved structure, browser gate and local delivery | Conforms |
| Ambiguous DeepInfer | Searches context/primary sources before asking; refuses silent substitution; defers dependent implementation if identity remains unresolved | Conforms; real web identity resolution was not executed in this dry run |
| Terminal repair | Reproduce current behavior, distinguish wrap/selection/layout causes, preserve layout, regress end/reset/replay without full dossier | Conforms |
| Assessment only | Recognizes existing Linear comparison; delivers gap assessment without implementation/run creation | Conforms |
| Browser unavailable | Finds supported fallback; rejects stale Linux import as universal acceptance; blocked rendered evidence prevents completion | Conforms; browser fallback was not executed |
| Resume and steering | Reconciles changed model with old passes, preserves objective/functionality, snapshots before fresh checks | Conforms |

The reviewer surfaced ambiguities about existing topics, proportional repair QA, model versus browser coverage and full-QA integration. The skill/references now explicitly resolve these. The independent report is retained as the pre-clarification observation, not edited to pretend those ambiguities never existed.

## Gate review findings and fixes

| Finding | Fix and regression | Independent retest |
|---|---|---|
| P2: eight-byte PNG magic accepted as screenshot | Require structural PNG chunks through IDAT/IEND; truncated fixture fails | Original fixture rejects |
| P2: reviews could reference pre-snapshot screenshots | Apply freshness checks to review log/screenshot references as well as checks | Original fixture rejects |
| P3: array chapterId coerced through regex | Require string identity | Original fixture rejects |
| P3: QA integration skip contradicted documented policy | Restrict skip to reasoned redesign exception | Original fixture rejects |

All four findings are fixed. The independent reviewer also confirmed changed input bytes and lexical path escapes are rejected. Junction creation was denied by the sandbox, so realpath containment was inspected but not exercised with a junction. PNG framing is checked; decoded pixels/CRC integrity and screenshot meaning are not established by this helper.

## What this establishes

The workflow now has explicit autonomous decisions, identity/research gates, claim-to-visible-evidence design, early rendered slice, integration, self-correction, fresh final verification and resumable state. Existing focused-repair and assessment boundaries remain.

No full new-topic generation or old/new E2E comparison was executed. No one-shot success rate, visual-quality improvement percentage or guarantee of autonomous scientific correctness is claimed. A future real chapter run must still execute its source/model/browser/visual gates. These limits are evidence scope, not a request for intermediate design approval.

## Follow-up: open technology choice

The user subsequently clarified that rendering technology and stack selection are open. Skill/AGENTS now treat the current stack as a default, with selection based on the teaching object and verified integration/production behavior. Added `technology-selection.md` and a seventh maintained scenario, `open-technology-choice`. Official format validation, local links, scenario JSON structure and whitespace checks passed after these edits. This was a focused instruction update: the original six independent dry-run results above are unchanged; the new seventh scenario has not been independently run. No renderer/package was selected or installed for a hypothetical chapter.

## Real case executed: DeepInfer

The user then requested a real DeepInfer implementation and autonomous skill iteration. That complete local trial is now documented in [the executed acceptance record](../../module-runs/deepinfer/qa.md), with [independent review](../../module-runs/deepinfer/independent-review.md), first-pass captures and final production evidence. The earlier statement that no new-topic E2E run had been performed described the initial skill-upgrade phase; this later trial supplies that missing level of evidence for one topic.

The first implementation had three independently identified P2 interaction/teaching defects. They were corrected and regression-tested without user correction. The final trial includes612 model snapshots,18 rendered states,48 actual timing-segment selections, lifecycle/share/document-reload journeys and production build/integration checks. Skill instructions were refined from those failures, and an eighth maintained scenario covers cross-view selection. The separate open-technology-choice scenario still has not received a controlled independent trial; DOM was justified for this small real scene.

This is evidence of one-input autonomous delivery **including internal repair**, not an error-free first implementation, old/new controlled performance comparison or general one-shot quality rate. See the case record for exact scope and excluded GPU/benchmark/service behavior.

The real browser also returned native JPEG captures despite chosen PNG filenames, exposing an evidence-tool assumption that synthetic PNG-only tests missed. Corrected25 file suffixes/references without changing image bytes and extended the helper to PNG/JPEG framing plus extension agreement. The expanded18-test helper suite and real run-record validation pass; prefixes, truncated files, stale evidence and format/suffix mismatches remain rejected.
## Follow-up: content depth and appearance acceptance

User feedback falsified the first trial's sufficiency: its scoped scheduler/ZOS correctness did not establish framework coverage, and the appearance dimension had not been inspected. The corrected workflow reuses a pinned community code-analysis skill and adds the project technical-analysis handoff; it separates source truth from coverage and rendered quality.

Actual independent source study: `../../module-runs/deepinfer/technical-analysis.md`. Community selection/provenance: `community-analysis-skills.md`. Independent two-scenario decision exercise: `depth-theme-eval.md` (dry run only). Its multi-root/output convention and stale theme-description concerns were clarified in the project adapter/AGENTS after that evaluation; the report retains its original observations.

The corrected local artifact was actually built and operated in the production preview. Current evidence is in `../../module-runs/deepinfer/depth-qa.md`, `content-coverage.md`, `depth-review.md`, `theme-qa-matrix.json` and final `run.json`. It includes explicit 12-case theme/language/width coverage and 16 additional boundary captures, all independently opened, plus source/model/browser/integration repair. The old narrower run is preserved separately. This documents a corrected case, not a controlled old-vs-new benchmark or a broad success-rate claim.
## 2026-10-28 — Principle hierarchy and chapter ownership

Further user feedback corrected the prior default: codebase orientation and broad feature coverage were poor substitutes for conceptual analysis and editorial focus. The current entry point is the new `analyze-technical-principles`; Codebase Knowledge Builder is optional evidence work. The rendering skill now checks natural copy, meaningful parent/child questions and chapter responsibilities. Broad research can stay in notes; specialized algorithm internals stay in their owning chapters.

`principles-focus-eval.md` independently exercises a framework request and an algorithm request. The latter must still teach its own central mechanism; chapter ownership must not become an excuse for shallow explanations. It is a decision dry run, not a vLLM implementation or an E2E success-rate benchmark.

The revised DeepInfer page is the actual local trial. Current evidence: `../../module-runs/deepinfer/hierarchy/principles.md`, `qa.md`, `review.md`, and the root `run.json`. It replaces the flat feature explorer with three meaningful levels, preserves the framework loop, links specialist topics, rewrites Chinese, and fixes source/visual findings through real browser checks. Previous depth-trial outputs remain historical. Final reviews do not claim that the user's corrections were unnecessary or that one case proves general one-input reliability.
