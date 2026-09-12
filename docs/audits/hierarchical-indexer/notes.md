# Hierarchical indexer extension — 2026-09-12

## Change contract

Extend the existing CSA2 workbench, not a new chapter or alternative attention mode. Preserve the accepted layer-map/record-inspector split, major section order, global controls, default-open source trace, byte budget and CED forward timeline. Add a cooperating indexer canvas below that pair, inside the same workbench. Existing selected layer, context length and prefill/decode drive it. New local state is playback checkpoint and inspected example address; changing layer/context/phase resets this local state. Language is presentation-only.

Capabilities: timeline, resource metrics, data movement, dense layout, math. Teaching question: how does the first decoder indexer establish a reusable candidate domain while later layers still select different addresses?

## Primary-source ledger

Verified the official pinned `inference/model.py` and `inference/config.json` over HTTPS on this date. Web open rejected the URL; PowerShell Invoke-WebRequest successfully retrieved the same official pinned raw files for inspection. No guessed implementation substituted for the source.

Source: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/517ef625df97ec57aadc91b67506a57c20fdc5bb/inference/model.py

Config: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/517ef625df97ec57aadc91b67506a57c20fdc5bb/inference/config.json

| Claim | Evidence | UI/model consequence |
|---|---|---|
| Source L21, 2,048 candidate blocks, 8 positions/block, Top-512 | config candidate_source_layer=20, candidate_topk_blocks=2048, candidate_block_size=8, index_topk=512 | Actual-scale panel caps the selection domain at 16,384; global cache record count remains unchanged. |
| Block score is maximum position score; latest reachable block is pinned | model.py select_candidate_blocks, lines 583–611 | Numeric blocks show L21 maxima; newest block is labelled pinned even when lower-scoring. |
| Source layer emits candidate mask separately from its own global Top-K | model.py lines 569–580 | L21 selection is not filtered through its candidate mask. |
| Later index sources rescore shared K and mask by the original candidate pool | model.py lines 551–579 | L25/L29/L33/L37 change scores and selected IDs without changing blocks. |
| Reuse returns shared Top-K | model.py _compress_topk_idxs | Reuse uses the nearest index source's IDs, with no new query score computation attributed to the reuse layer. |
| Reference calculates scores before masking | model.py lines 554–575 | Candidate ratio is a selection-domain bound, never a measured speedup or claim of skipped reference matmul. |
| Causal visibility is per query | model.py compress_lens masking | The actual-scale panel refers to the final query position. Prefill is not illustrated as all queries sharing one pool. |

## Deliberate simplifications

The cell example has at most 32 positions, keeps at most 3 blocks of 8 and chooses at most 2 positions. Scores are deterministic supplied teaching values, not model output. Pool capacity exceeds example Top-K plus the pinned slot, preserving the real configuration's guarantee that source Top-K positions fit within selected blocks. A preliminary two-block/four-pick example was corrected before delivery because it could reverse that relationship. Matrix labels distinguish original L21 block maxima from the selected indexing layer's position scores.

Only causally available positions are instantiated. Output addresses are one-based and sorted by position. The mathematical score definition is shown separately; projection, RoPE, multihead computation and FP4 rounding are not simulated. The real budget and reduced example are explicitly labelled and never mixed. Candidate masks are not claimed to reduce persistent KV bytes. No measured quality or latency improvement is asserted.

## Verification

- `npm run check:cachearch`: 480 existing architecture states, 132 execution states, 400 new indexer states and explicit block-pinning invariants pass.
- New states cover 10 context lengths × 40 layers, short and partial blocks, candidate bounds, source ownership, Reuse ID equality, fixed pools, causal IDs, different Reindex results, and source Top-K inclusion.
- `npm run check:workbench`, module convention required checks, production build and `git diff --check` pass. Existing Unicode-math review warning concerns pre-existing representations; the new scoring and address formulas use MathFormula. Existing Browserslist freshness notice remains.
- Rendered baseline: before.png. Preserved 40-layer topology and default-open record inspector visually inspected after integration.
- Browser: L21 vs L25 vs L26; million-token metrics 1,000,000 / 16,384 / 512; one-token Decode metrics and single cell all equal 1; stage buttons, cell selection, reset, playback completion and disabled final-step control checked. Playback delay is 2,000ms in the timer implementation; browser confirms progression and terminal state, not a precision timing benchmark.
- English and Chinese desktop/390px views inspected. At phone size document client/scroll width both 375px; only KaTeX's intentionally hidden MathML accessibility subtree reports internal width overflow. No visible matrix or page overflow.
- No separate DevTools console capture or screen-reader certification claimed.

Delivery is local; no commit/push requested for this extension. Unrelated debug.log is untouched.
