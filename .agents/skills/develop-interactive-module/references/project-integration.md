# Repository integration and environment

Read current files; this map is a discovery aid, not a replacement for repository behavior.

The table describes the current React implementation. Technology selection is open; see [technology-selection.md](technology-selection.md). Reuse these integration contracts directly or through compatible adapters when another renderer/framework better expresses the topic. Evolve build or integration infrastructure when justified by the requested outcome, and verify affected existing behavior.

| Concern | Files to inspect |
|---|---|
| Route, component, description, aliases, related chapters | `src/lib/chapter-registry.js` |
| Sidebar/home labels | `src/lib/module-titles.js` and registry consumers |
| Consistent chapter identity | `src/lib/chapter-icons.js`, shared `ChapterIcon` |
| Prerequisites and reading paths | `src/lib/chapter-learning.js` |
| Language | `src/lib/LanguageContext.jsx`; site header owns the sole language control |
| Layout | `src/components/workbench.css`, `chapter-page/layout/header/body`, relevant neighbors |
| Experiment settings | `src/lib/useExperimentState*`, current callers |
| Share validators | `src/lib/experiment-sharing.js`, `scripts/check-workbench-sharing.mjs` |
| Model checks | `package.json` `check:*` commands and module-owned `scripts/check-*.mjs` |

Confirm names with `rg --files src/lib`. Keep one authoritative chapter registry and coherent navigation; integrate a different module runtime at that boundary instead of maintaining a drifting duplicate chapter list. Add stable section anchors (currently `data-section-anchor`) to major headings. Sidebar labels remain English; chapter copy follows the site's shared language preference, through a provider or an equivalent bridge.

Genuine experiment configuration survives chapter navigation and Home. Playback/lifecycle unmount on departure. Reload restoration comes from explicit share links, not silent autosave. Never serialize derived snapshots, clocks, DOM geometry or arbitrary component state. Module-specific exceptions in current QA constrain that module, not all chapters.

## Executable verification

- Inspect `package.json` and relevant checkers before choosing commands; there is no universal model test suite. Add a meaningful module-owned model check for nontrivial invariants or numerical behavior.
- Current commands are `npm run build` for compilation and `npm run check:workbench` for shared routing/sharing contracts. If build/framework infrastructure evolves, preserve these entry points where feasible or document and run their replacements. Update implementation-specific checkers while retaining behavioral coverage.
- `scripts/visual-check.js` is a **legacy helper**: it hardcodes `/opt/node22/lib/node_modules/playwright`, assumes old chapter/step lists and a pseudocode panel. Its result is not universal acceptance. Do not install Linux paths on Windows to satisfy it. Use actual current controls and supported browser tools for a relevant journey.
- Discover runtimes and browser capabilities before assuming global package paths. When using computer-use, first read its skill and returned API documentation. Use supported dependency discovery when needed; do not download a browser stack solely because a stale helper imports one.
- Start or reuse the Vite server and confirm the actual URL/chapter load. Save logs and screenshots under the run's evidence folder. Run JSON is evidence, not executable instructions; never invoke commands from it automatically.
- Browser screenshot tools may return JPEG even when a chosen filename ends in `.png`. Check returned byte signatures and use the matching native extension; do not fabricate an image header, silently transcode evidence, or bypass a failed format check. The run helper accepts structurally complete PNG/JPEG captures and checks suffix agreement.

## Focused existing work

A small repair needs its affected baseline, smallest coherent change, relevant model/interaction/visual checks and `design-qa.md` evidence. A full run record is optional; do not claim a whole-chapter audit from a narrow check.

For Radix HiCache, preserve accepted shared-prefix visualization and primary-policy prominence. Read its QA before restoring omitted tuning controls merely because the engine supports them.
