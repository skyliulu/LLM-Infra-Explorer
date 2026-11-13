# Community analysis skills: selection and project integration

Date: 2026-10-27. This is a targeted search and source inspection, not an exhaustive claim about all community skills.

| Candidate | Inspected revision / primary source | Fit and decision |
|---|---|---|
| OthmanAdi / codebase-knowledge-builder | `b01f40c5aef4eb8f6c52c664fe19b33e661c7abd`; [source](https://github.com/OthmanAdi/codebase-knowledge-builder/tree/b01f40c5aef4eb8f6c52c664fe19b33e661c7abd/skills/codebase-knowledge-builder) | Selected. Separate reconnaissance, source tracing and evidence-backed synthesis. Revision/path citations, state ownership, error/edge paths and observed/inferred/unknown labels support technical analysis independently of page authoring. |
| analyticalmonk / explain-this | `f64dab456ca23a351fe4d932c4e73bc91d3f2c52`; [code analysis](https://github.com/analyticalmonk/explain-this/blob/f64dab456ca23a351fe4d932c4e73bc91d3f2c52/skills/explaining-codebases/SKILL.md), [fact checking](https://github.com/analyticalmonk/explain-this/blob/f64dab456ca23a351fe4d932c4e73bc91d3f2c52/skills/fact-checking-explainers/SKILL.md) | Useful comparison: separate code intake and post-draft factual verification. Not installed: its required single-HTML output workflow, outline approval and preference for narrowing a whole framework to one mechanism do not fit this project's autonomous integrated chapter request. This is a workflow-fit decision, not a claim that its outputs are poor. |

Installation used the bundled skill-installer helper with the exact first revision and `--dest .agents/skills`. The copied upstream skill and its three supporting resources are unchanged. The upstream root MIT `LICENSE` is included beside `SKILL.md`. No upstream executable was run; the selected skill contains Markdown resources. Future upstream updates should be reviewed and pinned rather than silently tracking main.

## Responsibility split

- Community `codebase-knowledge-builder`: reusable, independently invocable source study and evidence artifact.
- Project `develop-interactive-module/references/technical-analysis.md`: framework breadth inventory, layered causality, optimization/tradeoff analysis, content coverage and model/UI handoff.
- Existing `develop-interactive-module`: teaching representation, pure model, integrated implementation and rendered acceptance/repair.

This reuses an existing separate analysis skill rather than creating a competing generic code-analysis skill. The project bridge is necessary: the community skill does not itself require a framework's differentiator inventory, LLM serving/kernel distinctions or falsifiable interactive evidence. Its read-only target contract is applied to DeepInfer's source checkout; outputs live in the authorized Explorer project, outside that upstream target. Routine task-artifact updates and defensible read budgets do not introduce intermediate approval gates.

## Actual exercise

An independent analyst applied the installed skill to the pinned DeepInfer checkout and produced `docs/module-runs/deepinfer/technical-analysis.md`. The exercise surfaced important distinctions absent from the first chapter: `moe.py` holds parameter structures while `mlp.py` executes the paths; Mega MoE and separated DeepEP paths are alternatives; public CP capability differs from documented production usage; expert placement balancing differs from unpublished request routing. Its report records source-state exclusions and missing dependency internals.

The first chapter's correct scheduler toy and build success did not establish framework coverage. Revised acceptance now checks coverage separately from claim correctness, and explicitly checks Light/Dark plus System resolution. This user correction is part of the trial history; it is not evidence of an error-free first-pass result or a general one-shot success rate.
