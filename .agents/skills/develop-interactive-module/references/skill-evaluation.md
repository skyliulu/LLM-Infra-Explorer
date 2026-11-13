# Evaluate the skill's behavior

Use `evals/scenarios.json` when revising this workflow. Keep generated evaluation output outside the skill directory, e.g. `docs/audits/skill-autonomy/<run>/`. Do not create production chapters merely to test instructions.

## Three different validation levels

1. **Mechanical:** skill frontmatter/references, helper tests and negative fixtures. This catches broken scripts or a gate that accepts missing/stale evidence.
2. **Scenario dry run:** give an independent agent a realistic prompt, skill and minimum repository context. Ask it to perform a scoped decision/design exercise and report questions, assumptions, next actions and acceptance paths. Do not supply expected decisions. Grade observable decisions against scenario criteria afterward. This tests interpretation, not implementation quality.
3. **End-to-end:** execute a representative topic in an isolated workspace with source access and a real browser. Inspect actual source/model/UI/evidence, repair failures and record outcomes. Compare with the previous skill on the same task when claiming improvement. Do not report one dry run as proof of one-shot chapter quality.

For complex workflow changes, use an independent agent pass when available. The skill-creator workflow authorizes this evaluation; keep writes isolated, do not publish, and do not give the evaluator suspected bugs or an intended verdict. A read-only script audit may supplement behavioral runs. If unavailable, label self-review honestly.

## Acceptance

Grade named behaviors as passed/failed/not executed with concrete output evidence. Critical failures: silent topic substitution, implementation despite assessment-only scope, approval handoffs for routine decisions, unsupported central technical claims, fake comparisons/timelines, build-only completion, hidden browser failure, stale final evidence, or unrelated layout destruction.

Also treat missing automatic owner read-through as a critical failure: a realistic delivery prompt should initiate the continuous reader pass even when build/model/theme checks and an independent verdict are already green. The agent must use the rendered reading path and reconstructed answer, discover discontinuities without being told their location, and keep delivery blocked on substantive gaps. A scoped simulation that only names this action tests interpretation; an actual browser read tests execution. Neither proves that future chapters will always pass on their first implementation.

Grade triggering and judgement separately. An evaluator may perform a real continuous read yet accept a readable paraphrase where the requested interaction never exposes the central mechanism. Record that false positive and revise the judgement rule; do not report the whole evaluation as successful merely because the agent opened a browser or wrote a fluent retelling.

For implementation-depth claims, test source fidelity separately from fluent explanation and self-consistent model tests. A useful fixture includes an active backend/dispatch path, allocation details or a read-after-write dependency that the candidate view must reconcile. Failure to identify a central source/model/view mismatch is a critical technical false positive. Clearly distinguish synthetic-source reasoning, executed reference checks and real hardware verification; do not claim a dry run establishes fidelity of existing chapters.

Visual quality and teaching clarity require inspected rendered artifacts and reasoned findings. Do not substitute keyword counts, number of tests, a universal self-score threshold, or evidence-file existence for those judgments. Keep results and limitations in `design-qa.md` and the evaluation output. A new default should be supported by an observed failure, not invented during evaluation.

For an actual autonomous delivery trial, retain first-implementation screenshots, independent findings, in-scope repairs and final rechecks separately. Track whether a user had to supply additional correction versus defects the workflow found and fixed itself. One-input delivery can include internal review/repair; do not describe a corrected result as an error-free first implementation. One successful topic demonstrates that run, not a general success rate. Re-test revised guidance on fresh tasks before claiming broad reliability.

Run helper checks:

```bash
node --test .agents/skills/develop-interactive-module/scripts/module-run.test.mjs
node .agents/skills/develop-interactive-module/scripts/check-qa-matrix.mjs --self-test
```

Use the installed skill-creator's `quick_validate.py` for frontmatter and scaffold validation. It does not verify local reference links; inspect those separately.
