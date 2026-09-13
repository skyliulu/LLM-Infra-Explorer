# CED session lifecycle extension

## Change contract

2026-09-13. Extension of the existing CED chapter, not a replacement of its accepted architecture. The business overview, prefill/decode microscope, byte ledger and hierarchical indexer retain their controls and order. The new session canvas follows the single-forward microscope and connects its states across time.

Teaching question: **What survives as a session generates tokens, releases its working set, and returns after its local checkpoint expires?**

Capabilities: timeline, resource metrics, data movement, dense layout, math. Three turns are moments in one history, not competing algorithms. The initial length follows the existing chapter token setting; the timeline cursor, playback and inspector are local lifecycle state. Language, appearance and viewport must not affect the model. No new serialized configuration is introduced.

## Claim ledger

| Claim | Basis | Model / visible evidence | Boundary |
|---|---|---|---|
| Three pairwise Encoder sources and one single-position Decoder source own global records | Pinned official configuration and reference model, source IDs 2/8/14/20 | Source lanes retain record IDs; odd positions remain partial; an even decode position publishes three new paired records | Grouped operation-complete checkpoints, not simultaneous kernels |
| Consumers reuse records instead of allocating copies | Official CSA2 configuration; SGLang cross-layer sharing | One lane per owner; Decoder append adds 356 B, not twenty copies | Query scores and outputs are not shared caches |
| SWA is layer-local and bounded to 128 positions | Official report; SGLang architecture overview | Two representative per-layer circular-slot grids; endpoint and evicted range advance with decode | Each grid represents multiple independent layer states, not a single shared cache |
| Encoder local-state reconstruction preserves existing global records | Official report §3.2; SGLang §4.1 | Cold return reloads global records, then repairs the prefix tail with zero new global bytes | Approximate boundary, not equality to full prefill; missing compressor working state must also be recovered |
| Decoder tail construction differs from Encoder checkpoint repair | Official report §2.2; SGLang §4.2 | New-request suffix processing precedes Decoder tail state and continuous decode | Architecture view 20+20. SGLang retains layer 20 (L21) on the full path, truncating only layers 21–39 per chunk |
| Global history and local checkpoints have different retention lifetimes | Official report §3.2 | Save retains global data and a short-TTL Encoder checkpoint; expiry removes only that checkpoint | No production TTL duration, persistent-store transport scheduler or global-miss recovery is simulated |

Official pinned source root: <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/517ef625df97ec57aadc91b67506a57c20fdc5bb/> (`inference/config.json`, `inference/model.py`, `DeepSeek_V41_Tech_Report.pdf`). Runtime clarification: <https://www.lmsys.org/blog/2026-09-10-deepseek-v41>, September 10, 2026, sections 1, 2 and 4.

## Accounting and dependency boundaries

- Complete-record bytes use the existing 288 B main-KV + 68 B index-K ledger. Three groups have `floor(n/2)` records; one has `n`. Partial pairs, SWA, activations, allocation alignment and copied buffers are excluded.
- The trace has 33 operation-complete snapshots: first input plus four decode inputs; short-gap tool return with three new input positions and two decode inputs; TTL expiry; return with two new input positions and two decode inputs. Final processed length is initial length + 13.
- A generated position is counted as processed only after its Decoder forward pass. Sampling creates the next input, not an already-stored KV entry.
- The session working set is explicitly released between turns for this teaching trace. The reload counter counts global payload loaded into GPU, not physical SSD reads, network traffic or end-to-end latency.
- Warm Encoder checkpoint recovery avoids **window repair**, not all computation. Reconstructing Decoder states can require reevaluating old Encoder tail features; those features are not assumed to be persisted for free. Position counters intentionally do not claim to measure total Encoder work, FLOPs, TTFT or a speedup.
- A global miss requires a full-prefill path; the selected trace teaches the distinct global-hit/local-miss case. Generic storage media and movement policies remain in Radix HiCache.
- SGLang's opt-in bounded replay is approximate. Its encoder path excludes speculative decoding; tail-only decoding does not support full prompt hidden-state capture or input logprobs. The canvas uses one chunk, non-speculative generation and labels the architecture/runtime split.

## Validation

`scripts/check-ced-session.mjs` checks 363 snapshots across 11 lengths, including odd/even compression boundaries, 127/128/129 local-window boundaries and one million positions. Checks cover stable addresses, immutable replay, global growth after local eviction, load before repair, no token advance before Decoder, lifetime transitions, final totals and bilingual coverage.

Rendered cases and screenshots are recorded in `docs/audits/ced-session/` and `design-qa.md`. Baseline was inspected before layout edits in the local browser: existing chapter overview and technical microscope, including the prefill/decode control. The first local tab had stale imports while Vite was stopped; a fresh browser tab against the restarted project server was used for validation.
