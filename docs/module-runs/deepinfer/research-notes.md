# DeepInfer primary-source research

Inspected 2026-10-27. Official project: https://github.com/deepseek-ai/DeepInfer . Pinned commit: `553741557a57df44a46fb3ab72b6aafeaf945337` (2026-10-25 19:59:27 +08:00, `fix: validate boolean environment variables with strict parsing (#218)`; shallow clone in `C:/Users/29043/AppData/Local/Temp/deepinfer-primary-research`, outside this repository). Read source statically; did not install dependencies, download model weights, or execute GPU inference.

## Teaching scope and release boundary

Teaching question: **How can an inference engine choose its next batch, reserve finite KV space, and overlap host bookkeeping with device work while committing only verified output?** This produces a coherent engine-level chapter distinct from existing algorithm chapters.

The README presents an offline inference release for DeepSeek-V4.1-Flash, supporting optimized kernels, attention DP/balanced CP, MoE EP/EPLB, DSpark variable verification, SWA bounded replay, asynchronous scheduling, invariant/deterministic options and structured output. It explicitly excludes the complete production KV cache service, VE/Prefill/Decode disaggregation integration, and request load balancing across DP replicas. Do not equate the local GPU block allocator with the omitted distributed KV service. `LLMEngine` also explicitly says there is no online-serving wrapper.

- [README, release scope](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/README.md#L3-L43)
- [LLMEngine docstring](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/engine/llm_engine.py#L130-L142)
- [Official production architecture Q&A](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/doc/inference_deployment_qa.md) describes the wider internal system, including storage and routing that are not present as complete release functionality. Label such context **production architecture described by DeepSeek**, not **code implemented in this simulator**.

## Exact public execution path

1. `LLM.generate` tokenizes/enqueues the input list; `LLM._run_engine` repeatedly calls `has_unfinished_requests`, then `step`; when none remain it calls `flush_inflight_reqs` to drain asynchronous output. It clones pooled request outputs because the next engine step releases them. This is an offline batch loop, not an HTTP request router.
2. `LLMEngine.step` calls C++ `Scheduler.schedule`, applies block/state clone-and-zero operations, prepares metadata, then `_execute_model_async_step` dispatches worker execution.
3. `Worker.execute_model_step` launches the current main forward; post-processes the previous step; samples/verifies current output and generates next draft tokens; runs `pre_sampler_sync`; and either post-processes current immediately (prefill/non-ZOS) or retains current state for the next call (ZOS decode).
4. `LLMEngine._process_model_outputs` calls `process_MTPInfo`, then `Scheduler.process_outputs`, then builds request outputs. Accepted output, queue transitions, KV valid counts and stopping status are committed here.

Sources:

- [LLM._run_engine, lines 168 onward](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/entrypoints/llm.py#L168)
- [LLMEngine.step, lines 860 onward](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/engine/llm_engine.py#L860)
- [Worker.execute_model_step, lines 89 onward](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/worker/worker.py#L89)
- [LLMEngine._process_model_outputs, lines 687 onward](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/engine/llm_engine.py#L687)

## Scheduler truth

Queues are `waiting`, `prompted`, `running`; the normal offline path mainly uses waiting/running. `prompted` supports already-prefilled/forked work entering decode. Do not invent a separate permanent finished queue: `SchedulerOutputs.finished_seqs` is a per-step handoff, and finished resources are finalized in `pre_sampler_sync`.

`Scheduler._schedule` chooses **one step type for the whole DP group: prefill OR decode**. It does not mix prefill and decode requests in one batch. PROMPT engines only prefill; COMPLETION engines only decode. NORMAL engines gate prefill on <=90% GPU block-cache usage and schedulable waiting work, then use ALL/ANY collective votes. ALL attempts are every 70 decode steps by default; ANY fallback every 100 (nonzero) decode steps. A prefill step resets `decode_step` to zero. A second vote falls back to decode if nobody could actually admit prompt work, preventing an empty-prefill livelock. A rank can issue an empty placeholder prompt step to stay synchronized with peers. Toy timing parameters may be reduced, explicitly labeled.

`_schedule_prefill` consumes waiting in queue order; an unschedulable head blocks following work. It checks prompt-length, initial block/state capacity, active-sequence limit, and sum-of-key-context budget, then computes a chunk from remaining batch-token capacity (CP pads to `2*cp_size`, otherwise 1). With chunking disabled, an incomplete prompt is not admitted. Multimodal chunks cannot split an image region. For a plain fresh prompt it allocates the block table for the full current sequence, **not only the current chunk**. A partial chunk remains WAITING, is reinserted at the waiting front when output is processed, and emits no output token. Only the final prompt chunk transitions into running and emits the first sampled token. In NORMAL mode encountering a partial chunk ends that prefill batch.

`_schedule_decode` first removes finished running requests, admits eligible prompted requests, then sorts running by output length descending. It consumes from the back (shortest generated output first). Under block pressure it preempts from the front (longest output first). **The source comment at the method header says shortest-output victim, but the actual comparator and indexes do the opposite; follow executable code.** It conservatively requires at least one free block even when an individual sequence may fit its current allocation, then `_append_slot` grows/shrinks the block table. With normal recomputation allowed, preemption preserves committed tokens, resets cache/inflight/MTP state, frees block/state references, and pushes the request to waiting front for replay. With stop-on-preemption or structured-output constraints it terminates instead. COMPLETION engines require stop-on-preemption because they have no prefill channel.

- [Scheduler._schedule](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/scheduler.hpp#L275)
- [Scheduler._schedule_prefill](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/scheduler.hpp#L351)
- [Scheduler._schedule_decode including comparator/victim selection](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/scheduler.hpp#L559)
- [Scheduler._preempt](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/scheduler.hpp#L766)
- [Default attempt intervals](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/environ.py#L180-L186)

## Allocation and commit invariants

- Block ID zero is reserved; `Blocks(n)` exposes `n-1` real blocks. Allocate pops a free block and increments refcount. Fork pinning increments refcount. Free decrements it; only zero returns to the free list. Persistent block IDs carry ownership; a colored array should not silently renumber surviving blocks.
- `can_allocate_nolock(n)`: NEVER when requested n >= configured total block count; OK when available >= n; otherwise LATER. Thus NEVER is impossible under total capacity, LATER is temporary pressure.
- State slots are a separate manager; a prompt needs both block capacity and one state slot when the model uses state.
- `Sequence.get_num_blocks()` computes `ceil((committed token length + total_inflight_tokens + draft token count)/block_size)`. This is physical reservation, not the count of verified KV tokens. With overlap, reservation includes speculative/inflight slack.
- `KvCacheState.num_tokens` is the logical valid processed prefix; `input.tokens` holds committed tokens and excludes draft candidates. The newest sampled main token is not forward-processed yet.
- `process_outputs` first advances `num_tokens` optimistically by scheduled q. During decode it then commits from the previous baseline using the count actually appended: accepted draft prefix plus one sampled/residual main token, truncated if stopping fires. Rejected draft KV is excluded from the logical valid prefix. Unused physical block reservations can be reclaimed on a later `_append_slot`; do not imply every rejection immediately frees a whole block.
- Finished requests release blocks/state via `LLMEngine.pre_sampler_sync` → `finalize_seq` → `Scheduler.free_seq`; step metadata/output-pool release is deferred so callers finish reading it.

- [BlockManager and Blocks](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/block_manager.hpp#L27)
- [Sequence.get_num_blocks](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/sequence.hpp#L291)
- [KvCacheState optimistic/actual commit](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/sequence.hpp#L200)
- [Scheduler.process_outputs](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/scheduler.hpp#L872)
- [pre_sampler_sync finalization](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/engine/llm_engine.py#L830)

## Overlap and DSpark verification boundaries

ZOS is overlap, not permission to use stale sampled token IDs on the device. `Worker._correct_seqlens_qk` remaps requests between previous/current batches and corrects device query/key lengths from the previous sampler result. `MetadataZOS` carries previous sampled IDs, draft IDs and accepted counts. CPU scheduling can run before the immediately previous output is post-processed. The current main forward is launched before waiting/post-processing the previous sample event; current decode post-processing is deferred to the next step. Prefill is processed immediately. Flush drains the last retained step. The first/final boundary needs warmup/drain rather than an endless steady-state drawing. "Zero overhead" is the upstream name, not a promise that scheduling takes zero time or a measured speedup on this webpage.

For an ordinary `nextn=0` trace, q is always1 and inflight accounting already predicts k; `compute_seqlens_k_zos` is only called when nextn>0. Remapping still supplies the previous device sampled IDs before CPU ledger commit. CPU can schedule one further forward before learning EOS/length termination; `process_outputs` discards late output for already-finished requests. A simple synchronous canonical trace plus a separate illustrative dependency diagram should disclose that division rather than imply a full emulator of asynchronous cancellation/late-result behavior.

The sampler verifies the **previous** draft candidates with the main model, accepts only the contiguous valid prefix, samples at the first rejection from residual probability (or samples a bonus main token if all accepted), and creates the **next** draft candidates. Confidence does not accept a token: it selects how much draft work to verify. The verifier remains authoritative.

`MTPVarlen.schedule` starts with one main row per request, considers additional draft rows sorted by estimated cumulative acceptance, and maximizes expected committed tokens divided by estimated forward+sampler time using a profiled graph-size performance curve plus runtime estimators. In the absence of that curve it verifies all available draft rows. CPU chooses total q from older confidence; the GPU can redistribute per-request lengths using freshest confidence while preserving that total budget. `process_MTPInfo` turns conditional per-position confidences into cumulative products, and stores current/previous estimates. Do not model confidence as independent equal-value positions or as actual acceptance outcomes.

- [Worker._correct_seqlens_qk](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/worker/worker.py#L191)
- [Sampler documented verification lifecycle](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/layers/sampler.py#L59-L86)
- [Sampler._verification](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/deepinfer/model_executor/layers/sampler.py#L411)
- [MTPVarlen.schedule](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/mtp_varlen.hpp#L150)
- [process_MTPInfo](https://github.com/deepseek-ai/DeepInfer/blob/553741557a57df44a46fb3ab72b6aafeaf945337/csrc/engine/scheduler.hpp#L1196)

## Toy demonstrations with checkable outcomes

Use plain text, CP1, no prefix hits/forking/structured output unless the UI explicitly supports them. Timing/cost curves and acceptance outcomes must be labeled illustrative, never benchmark data.

1. **Chunked prefill**: batch budget 8, prompt A length12, prompt B length4, active limit2, block size4, sufficient blocks, nextn0 and simplified attempt interval1. First prefill schedules A q8, reserves all3 prompt blocks, leaves A waiting, generates0. Second prefill schedules A q4 and B q4; each completes its prompt and samples its first token. Only now can decode advance either request. Key-context budget must cover12+4 in the second batch.
2. **Verified KV boundary**: A prompt length12 has just completed prefill: committed token length13 (12 prompt+first output), valid KV12. Three draft candidates are available. A decode with q4 has one pending main token plus three draft verification rows. If2 draft tokens accept and the third rejects, append2 accepted+one residual output: committed length16, valid KV15. Provisional valid KV16 is corrected to15; the newest residual output remains unprocessed. Do not display draft candidates as committed output before verification.
3. **Pressure/recompute**: configure pool with `N+1` slots for N usable blocks, keep slot0 visibly reserved. Set A generated-output length6, B length1, and no free block. Decode sorts [A,B], tries B, preempts A to release blocks, then schedules B. A returns to waiting with its committed token history preserved and valid KV0, so its full retained token history must be recomputed. Label this tiny-pool pressure scenario as pedagogical; production KV pressure is hardware/model dependent.
4. **Confidence budget**: two requests with three candidates each; conditional confidences A=[.9,.8,.7], B=[.6,.5,.4] imply cumulative scores A=[.9,.72,.504], B=[.6,.3,.12]. If a selected total q budget is5 (two main rows+three draft rows), choose A first2 and B first1. Expectation is2+.9+.72+.6=4.22 committed tokens before stop effects, not an observed acceptance count. The total budget itself must come from an explicitly illustrative time curve, since upstream profiles hardware.
5. **Overlap warmup/drain**: compare synchronous schedule→forward→sample→post-process with ZOS scheduling next batch before prior CPU post-process and launching current forward before waiting prior event. Count GPU/CPU busy intervals from the same toy duration model; show initial warmup and explicit drain. Do not claim overlap alters accepted content or hides genuine data dependencies.

## Scope decisions and caveats

- Keep storage/offload/DP routing/disaggregation as architecture context or source links; do not present a simulated production cluster as public-code behavior.
- Actual device kernels, EP/CP collectives, SWA bounded replay, model layers, sampler distributions and performance profiling are best linked as cooperating subsystems or existing chapter drill-downs. This chapter need not reimplement their full mathematics to explain engine ownership.
- Determinism upstream has qualifications: README requires NVIDIA batch-invariant mode, disables variable verification, and uses fixed sequence seeds for deterministic sampling. A deterministic toy trace does not establish bitwise production equivalence.
- README default maximum draft length is5. Toy draft length3, block size4, interval1 and synthetic performance curves are chosen to make state visible and must be disclosed.
- Static source inspection establishes the branch logic above, not empirical throughput, hardware support validation or output-quality equivalence.
