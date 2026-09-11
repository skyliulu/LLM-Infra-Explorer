# Sparse Attention matrix QA · 2026-09-11

`browser-results.json` contains 72 normal states (three mechanisms × two queries × two languages × three widths × overview/cache) and 26 short/long-history node states. `fresh-load.json` records default trends, final narrow layout and an empty warning/error console on a fresh page.

`final-connections.json` and `csa-final-connections-1280.png` capture the final wiring correction: independent history-to-index projection, main-cache-to-merge and selected-index-ID-to-merge. Other screenshots document the numeric matrices and responsive layout immediately before that wiring clarification.

Query switching preserves cached values while changing selected rows and output. C3 remains the selected identity across cache, index and merge, with sources T5–T12; L24 → C6 checks the local-to-global selection regression. Matrices show synthetic 2D values, not checkpoint dimensions or performance measurements.

The coverage manifest is `src/components/sparse-attention/matrix-qa-matrix.json`. The numerical regression is included in `npm run check:sparse`; detailed findings and boundaries are recorded in `design-qa.md`.
