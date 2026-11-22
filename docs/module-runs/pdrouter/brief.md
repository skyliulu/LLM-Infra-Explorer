# PD Disaggregation & Cache-Aware Routing — Module Brief

## Reader Concern & Explanatory Thesis
- **Reader Question**: Why do modern online serving systems (DistServe, Splitwise, Mooncake, Dynamo, SGLang Router) physically separate Prefill and Decode pools and replace load-only gateways with cache-aware routers — and when does that separation stop paying off?
- **Testable Thesis**:
  1. **Phase Interference & Transfer Boundary (§1)**: Collocating compute-bound Prefill and memory-bound Decode causes long prompts to stall active Decode tokens (breaking TPOT SLO); Chunked Prefill eases TPOT jitter at the cost of TTFT and bandwidth contention; P/D Disaggregation meets both TTFT and TPOT SLOs *only when* KV transfer bandwidth (RDMA/NVLink) keeps transfer latency far below the TTFT budget (reversing on slow 10GbE links).
  2. **Router Trilemma (§2)**: Load-only routing destroys prefix KV cache reuse (`0%` hit), while prefix-only routing pins hot system prompts onto one worker until queueing/KV pressure explodes P99 TTFT; cache-aware load-balanced routing spills hot prefixes once a worker crosses its load threshold, dynamically warming a replica and minimizing P99 TTFT.
  3. **Dynamic P:D Ratio & Goodput (§3)**: Cluster SLO Goodput is capped by `min(Prefill capacity, Decode capacity, KV link capacity)`. Long-input RAG shifts optimal `P:D` toward Prefill, long-output Reasoning/CoT shifts it toward Decode, and higher prefix cache hit rate shrinks effective prefill tokens `ISL_eff = ISL * (1 - h)`.

## Scope & Ownership
- Placed in new sidebar group `Serving Systems` (`在线服务系统`), route `#pdrouter`.
- Complements `DeepInfer` (single-engine batching & CPU/GPU overlap), `RadixCache` (single-node prefix tree), and `MooncakeL3` (L3 KV pool & RDMA substrate) by owning multi-node P/D pool separation, cluster-level prefix routing, and SLO Goodput capacity balancing.
