# Why the autonomous workflow changed

Reviewed 2026-10-27. This is maintenance rationale, not a source of new chapter-specific technical claims.

## Observed repository conversations

Read local chat turns through the app's thread reader; retain only project-relevant observations here. Titles are cited verbatim where a title was returned. Transcribed technical names in old messages are evidence of user experience, not authoritative domain facts.

| Evidence | Observed correction | Reusable consequence |
|---|---|---|
| “重做 linear attention 章节”, chat `019f6103-42ac-7d00-bdd9-f930dd5cebb7`, turn `019f6632-0a68-7ce0-be11-1c5d5f410e0d` | Growing KV looked shorter than fixed state at the selected scale; local controls were far from effects; compression lacked visible many-to-one behavior | Calibrate comparable quantities, choose revealing defaults without hiding crossover, show transformation and colocate controls |
| Same chat, turn `019f663a-3f4e-7d83-bd6f-49bb22ddb239` | Principle copy did not explain the diagram; pseudocode merely translated formulas | Explain the selected operation and visible consequence; include actual runtime state/dispatch evidence when material |
| “梳理 DeepSeek V4.1 KV 压缩展示”, chat `01a09061-af79-76e1-b210-bb25742daa5a`, turns `01a09b31-a3b7-75a1-a36c-4ba0a4edbc08`, `01a09b27-6dbd-7d91-8137-b651f32a99db` | Hidden state, compression and concatenation remained symbolic; record count and feature dimension were confusing | Use small instantiated matrices, label axes and distinguish projection from sequence compression; keep K/V identity through gathering |
| Same chat, turns `01a09b19-93b9-7c23-839a-a6748244783d`, `01a09b1b-896a-7603-85c6-edfab47a3f45` | Playback wrapped/jumped at the end; tracked provenance stayed on an old token | Add terminal-state and current-versus-locked provenance journeys |
| Same chat, turns `01a09b47-fcfd-71a3-b722-6f6aa44a3b6c`, `01a09b4e-b171-76f3-92c1-f22724f89008` | Macro/detail playback scopes felt disconnected; comparison and explanation needed excessive vertical scrolling | Explicit local clocks; simultaneous comparison when useful; compact contextual explanation, not mandatory repeated cards |
| Project audit chat `019f665b-558a-7910-9eb6-1a8ea73aadee`, turn `019f760a-4422-7c00-8da2-a0d805e744c8` | Preview captured the header but missed dynamic core canvases | Inspect the actual teaching evidence and key states, not just page shell or saved-file existence |

The old skill already had good modeling and visual rules. Its weakness was operational: little guidance for topic identity, research completion, autonomous decisions, interruption recovery, evidence freshness and fixing issues before handoff. Adding more style prohibitions alone would not close that gap.

## Public practices inspected

- [Anthropic skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md): realistic prompt-based evaluations and iterative improvement. Adopt behavioral scenarios and separate artifacts from assertions. Do not copy its human approval/evaluation loop into every chapter run; this user's requested operating mode is autonomous.
- [Explain This](https://github.com/analyticalmonk/explain-this): separates explanation authoring and fact checking, with checkable claims traced to sources or corrected/removed. Adopt the claim gate. Its standalone HTML, Canvas and fixed page template do not match this React repository.
- [Superpowers verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md): fresh execution evidence before completion claims. Adopt final-revision checks and failure visibility, without importing unrelated workflow steps.
- [Explain](https://github.com/asunchu/explain): selects format according to explanatory need and distinguishes behavioral verification from installation/discovery claims. Keep interaction choice tied to the teaching object; do not broaden this repository skill into a general writing/video tool.

These are workflow references, not evidence that this revised skill guarantees autonomous design quality. No external skills were installed or copied wholesale. A run-record checker validates consistency and evidence files, not source truth, screenshot quality, or learning outcomes.

## Later real trial: DeepInfer

The user requested a full case after the initial workflow revision. `docs/module-runs/deepinfer/qa.md` and `independent-review.md` record the executed result. Despite passing initial model/convention checks, independent review found wrong-diagram timing selection, stale Prefill narration/source in a Decode branch, and removed/excluded request selection inconsistencies. These observed failures motivated scope-qualified semantic identity, selection falsification, and context-derived narrative/provenance checks in the maintained references. Mobile timing segments motivated an equivalent native selector without distorting the quantitative scale.

The trial completed with autonomous repairs and no intervening human correction. First-pass and final evidence remain distinct. It establishes one real delivery, not universal first-generation quality or a comparative benchmark against the previous skill.

Final run validation exposed an additional integration issue: the browser returned native JPEG bytes under filenames chosen as PNG. Supporting references now require detecting native encoding and preserving it with a matching suffix. The helper supports PNG/JPEG framing and tests extension agreement; this replaces an unjustified PNG-only delivery constraint without weakening freshness or usable-file checks.

## Later trial: system chapter depth and control geometry (2026-11-14)

A Mooncake chapter was delivered from the user's request to explain "Mooncake as an L3 cache". The
user then reported three successive gaps: the chapter showed only the L3 usage rather than Mooncake's
own principles; after a scheduler/placement section was added, it still did not explain the overall
architecture's technical difficulties, relationships and details; and the playback / next icons were
not centered inside their buttons.

Observed failures and reusable consequences:

- **Scope anchored on the requested mechanism.** The original request named an integration (L3), and
  the chapter thesis, claims and first view all centered on that tier. When the user asked for the
  system's principles, adding another mechanism demo satisfied the existing gates but not the new
  reader concern. Consequence: for a system/framework topic, state the system's difficulties,
  ownership/interfaces and rejected alternative before accepting a subordinate-mechanism thesis as
  the spine. Added to the analysis skill and to `technical-analysis.md`.
- **Gates rewarded a defensible but narrow thesis.** The cache-economics argument was visible,
  sourced and testable, so model, interaction, visual and reader gates could all pass while the
  architecture's difficulty was never explained. Consequence: the delivery table and QA checklist now
  require a difficulty ledger, a control/data-plane relationship map with interface payloads and a
  rejected design alternative for system chapters.
- **Downscaled screenshots cannot establish control geometry.** Full-page and full-section captures
  made a 2-3 px icon offset invisible; the shared playback rule sized the box but did not center its
  content, while sibling chapters compensated with inline-flex classes. Consequence: control-level QA
  now requires a computed-style read or ~4x crop of icon-only controls, checks the glyph center and
  the box separately, and compares size/shape/padding with sibling modules. A shared sizing rule
  without content alignment is treated as incomplete.

This is one trial. It motivated the added gates; it does not establish that the revised workflow
guarantees architecture depth or pixel-level control quality.

## Later trial: paper fidelity and copy load (2026-11-14)

The same system chapter was revised twice more. First the owner asked whether the rendering of Mooncake
matched the real implementation; then the owner reported that the architecture section's text ran too
tall. Both were legitimate: interface-level claims (block IDs in the prefill request, the decode
scheduler's TBT double-check) had been added from memory during the previous revision, and the page
presented analytical budgets as if they were measured. The paper-versus-stack boundary existed, but
only in a small note; the design comparison occupied four lines on the default path.

- **Paper design vs current implementation.** A named system that began as a paper has three layers:
  the paper design, the current implementation (renamed services, a scheduler that became an index,
  added layers), and the deployment context. Interface facts must come from the pinned paper section,
  and the page must say which layer it draws. Added to `implementation-fidelity.md`, the analysis
  skill, and the system-chapter checks.
- **Readout budgets are not measurements.** Time/byte/SLO budgets need their assumptions in the same
  visible block. Added to the system-chapter checklist.
- **Depth has a reading cost.** A longer lead, a five-row card and a multi-paragraph aside can leave
  the canvas less prominent than the prose. After a depth addition, re-read the default path; a
  supporting comparison can be a disclosure whose summary states the conclusion, but the retelling
  must not require opening every disclosure. Added to `reader-review.md` and the QA checklist.

This is one trial; it motivated the checks, not a guarantee that every system chapter will be
source-faithful or visually balanced.
