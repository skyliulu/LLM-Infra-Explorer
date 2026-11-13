# DeepInfer executed acceptance record

2026-10-27. Final production bundle tested at `http://127.0.0.1:4173/#deepinfer`. Source snapshot: `553741557a57df44a46fb3ab72b6aafeaf945337`. This is a browser teaching implementation, not execution of DeepInfer's hardware runtime.

## Source and model

Research ledger and independent source inspection confirm the reduced scope: one rank, NORMAL engine, nextn0, sufficient memory, two decode-ready toy slots and prefill-attempt interval1. The public default interval70 and omitted distributed/memory conditions are visible. No mixed prefill/decode batches or partial-prefill output are invented. First output comes from final prefill. Physical whole-prompt reservation is explicitly separate from computed-token cells.

`check:deepinfer`: 612 snapshots across18 primary configurations, independent first-batch/output oracles, monotone counts, bounded chunks, ordinary decode input indices, terminal retirement, both timing tracks and per-resource/dependency constraints. Three-round synthetic totals are24 synchronous and18 overlapped units; one round is8 in both. These are assumed-duration examples, not measured performance.

## Actual browser journeys

Recorded in `evidence/browser-journeys.json` on the final production bundle:

- Nine scenario/budget combinations: reached device sample and then CPU commit through real buttons. Independent expected computed positions distinguish mixed A6/B2, the two-slot pressure limit and long-prompt chunking. Partial prompts emit zero; pending candidates become committed only at commit.
- Default decode step9: source links to `_schedule_decode` at L559, A1/B1 input outlines visible, selected C explicitly excluded from active batch.
- Pressure → select D → mixed: A is selected consistently in both row and inspector. Initial architecture IDs also reflect D in the four-request scenario.
- All12 operations on both tracks in both checkbox states:48 actual clicks verify the selected diagram and interval. Baseline commit3 stays22–24; async commit2 stays11–13.
- At390px, the equivalent operation dropdown selects baseline commit3 correctly without relying on a tiny time segment.
- Seek to terminal, return one event, autoplay to end, inspect with keyboard, then replay/pause: final3/2/3 outputs and retired state remain stable without wrap.
- Home return preserves long/12/false configuration and resets lifecycle/selection. Generated share URL restores those settings after a real document reload with step0. Plain document reload restores mixed/8/true defaults. Fragment-only navigation is deliberately distinguished from document reload; it preserves in-memory settings as intended.
- Final production browser console returned no warning/error entries. No evidence is borrowed from the initial Vite missing-component overlay during concurrent integration.

## Rendered inspection

`evidence/rendered-layout.json` records18 actual rendered states:1440/768/390px × English/Chinese × mixed/pressure/long. Each uses the appropriate first-sample state; pressure has four requests and long has20 prompt cells. No document overflow, checked component overflow or KaTeX errors. At390px, computed request columns are55px and219px, without an empty third column. All layouts retain the five-label timing legend and24-option equivalent operation picker.

Owner inspected representative screenshots at each width/language and the actual viewport while operating controls. Independent reviewer opened desktop English, tablet Chinese and two mobile language/density cases at original detail; findings are in `independent-review.md`. Tokens wrap at narrow widths, group identities and source links remain readable, and selected/pending states use outlines and counts beyond hue. Future token labels were darkened for light-background contrast; dense primary labels were increased to11px.

First-pass captures are retained as `evidence/first-pass-*.jpg`. Final captures are `evidence/final-*.jpg`. Full-page capture stitching may place sticky headers/focused skip links partway through the saved document; clean viewport captures supplement them. That capture artifact was not treated as proof of an application clipping defect.

## Findings and autonomous correction

| ID | Severity | Reproduction | Correction and regression |
|---|---|---|---|
| DI-1 | P2 | Click baseline commit3; inspector resolved async list | Selection includes track+operation; pure probes and48 browser clicks |
| DI-2 | P2 | Step9 Decode still explained Prefill and lacked its input marker | Context-specific copy/source and decoded-output inputIndex outlines; model and browser case |
| DI-3 | P2 | Select D then change scenario; inspector silently used A without highlight | Normalize/reset identity for all dependent views; excluded-request explanation; model and browser case |
| DI-4 | P3 | Four-request fixture still labeled entry A/B/C | Entry identities derived from scenario rows; rendered pressure captures |
| DI-5 | P3 | Mobile time segments too narrow for reliable touch selection; labels hidden | Preserve quantitative scale, add readable legend and equivalent34px-high native selector; actual390px picker case |
| DI-6 | P2 tooling | Browser returned native JPEG bytes under chosen PNG filenames; PNG-only gate rejected usable captures | Preserve bytes, normalize25 suffixes/references, support complete PNG/JPEG framing with matching extensions;18 helper tests and actual evidence gate pass |

All findings fixed. Independent review observed no remaining P0–P2 within its source/model/screenshot scope. A suspected mobile third-column regression was disproved by the final CSS override and actual computed two-column layout, rather than patched without reproduction.

## Skill improvement and inference limits

The real case added representation-qualified selection, excluded/removed-object journeys, execution-context-specific narrative/provenance checks, narrow-layout legends, and distinct first-pass/final evidence to the skill. Existing topic research, proportional repair and open technology selection rules remain.

Final evidence validation also exposed the screenshot transport assumption: naming a file `.png` did not change the browser's native JPEG bytes. Files were renamed without transcoding or changing captured pixels; the helper now verifies supported native format framing and suffix agreement. Truncated images, misleading suffixes and stale evidence remain rejected. This is an actual-tool compatibility correction rather than a gate bypass.

One user task proceeded through research, implementation, independent findings, repair and final production acceptance without further user correction. The first implementation did have defects. This demonstrates autonomous detection/repair for this case, not a measured general one-shot success rate or error-free first-generation guarantee. Fresh-topic trials are needed before claiming broad reliability.

No weights/GPU runtime, actual latency, multi-rank voting, physical memory exhaustion/preemption, speculative acceptance or full production service was validated here. Those boundaries are disclosed in the chapter and are outside its reduced teaching contract.

Final `module-run.mjs verify docs/module-runs/deepinfer/run.json` passed after native-format normalization. The record retains20 final runtime/skill-input fingerprints, fresh command/browser/visual evidence, independent review, six closed findings and explicit scope limits. Evidence consistency is additional verification, not a replacement for the executed source/model/UI review above.
