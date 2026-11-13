# Automatic reader-gate correction — 2026-10-28

## Observed failure

The previous workflow included outcome questions and independent review but did not require the owner to actually read the rendered artifact continuously before delivery. Local controls, screenshots, model checks and reviewer approval were treated as sufficient. A later user-triggered owner reading found disconnected explanation structure and missing mechanism demonstrations. The failure was in both the definition of the acceptance step and its execution.

## Changed behavior

- The rendering Skill automatically requires the owner to read a new/revised chapter from first screen to footer, explore important branches/returns, reconstruct an answer from visible content, record friction, repair within authorization, and reread the whole explanation after content/structure changes. This happens without a user reminder.
- An early reader pass checks the first usable slice before expanding the page. The final owner pass remains mandatory. Independent review cannot substitute for it.
- The analysis Skill checks a connected reader argument before handing off. AGENTS, QA and delivery references route to the same `references/reader-review.md` workflow. Assessment-only and skill-only requests retain their scope.
- The completion helper requires a `reader` check containing owner, actual route/path, reconstructed answer, observed friction, a note and inspected current screenshot. It rejects missing/skipped/failed/stale reader checks despite green local checks. Snapshot invalidates the old reading and retelling.

## Executed mechanical validation

- `node --test .agents/skills/develop-interactive-module/scripts/module-run.test.mjs`:22/22 passed. New negative cases cover missing/unperformed owner review, delegate substitution, empty reading/reconstruction/evidence, stale checks/screenshots and unresolved whole-chapter teaching failure. Fixtures are synthetic bookkeeping tests, not rendered chapter QA.
- Official skill-creator `quick_validate.py`: both Skills valid. Windows validation used temporary existing PyYAML path and `python -X utf8`.
-22 local Markdown references across changed workflow documents resolve.
- Current DeepInfer completion verification intentionally fails: status/teaching/reader acceptance remain incomplete and P2 findings remain open. Changed workflow files also invalidate prior input hashes; no hashes or screenshots were relabeled to claim a fresh chapter pass.
- No application source was changed, chapter regenerated, deployed or reaccepted in this skill-only request.

Logs: `helper-tests.log`, `rendering-skill.log`, `analysis-skill.log`, `references.log`, `deepinfer-blocked.log`.

## Behavioral evaluation

An independent fresh-context agent received the revised Skill, the original DeepInfer delivery goal, the existing URL and a statement that mechanical checks were green, without prior review findings. The evaluation was read-only and its initial output isolated at `C:/Users/29043/AppData/Local/Temp/deepinfer-reader-forward-20261028/`. Its unchanged report is archived as `forward-report.md`.

**Triggering: passed in this case.** The agent actually read the Chinese Light desktop page continuously from first screen to footer, then explored the main branches, controls and device/engine/service returns. It did so without another user request to perform a reader review. It did not claim to rerun the full mechanical matrix or repair code.

**Judgement: insufficient for the user's contract.** The agent recommended delivery and classified the preset-only resource allocation and brief kernel explanation as P3. This is a false positive against the owner/user's broader accepted concern: these were needed to explain the principle interactively, not merely to name it in prose. The evaluator also used a working lower breadcrumb as evidence of hierarchy continuity without establishing its correspondence to the upper P/D map. The current page was not reaccepted.

**Resulting correction:** reader-review now separates fluent narrative reconstruction from the promised visual/interactive explanation. It requires a central-mechanism audit with concrete observations vs assumptions/narration, prevents generic framework scope from downgrading explicitly requested central mechanisms, and asks for actual upper/lower object mapping. The final judgement wording was not forward-tested a second time in this request; no second behavioral pass is claimed. Automatic repair/reread was not exercised end-to-end because the evaluator was explicitly read-only.

## Limits

The helper cannot establish that an agent genuinely read or understood a page; it prevents omitted/incomplete evidence from being accepted. Actual reader judgment and repair remain the owner's responsibility. A successful isolated run would show automatic triggering in that case, not universal one-shot chapter quality or an executed autonomous repair loop under read-only restrictions.
