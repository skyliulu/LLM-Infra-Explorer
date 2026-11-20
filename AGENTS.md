# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start development server (Vite, hot reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

Module model checks are available as `npm run check:*` commands in `package.json`; choose the checks affected by the change. Validate rendered interactions via `npm run dev` as well. A production build alone does not establish visual or technical correctness.

## Architecture

**LLM-Infra-Explorer** is a React SPA for interactively visualizing LLM infrastructure concepts. It deploys as a static site to GitHub Pages.

**Stack:** React 18 + Vite + Tailwind CSS + Framer Motion + Lucide React

**Technology choice:** This describes the current implementation, not a fixed technology requirement. Choose rendering, interaction libraries, module frameworks and necessary build infrastructure for explanatory clarity and usable interaction. Alternatives may be adopted autonomously when justified by the teaching outcome; record the decision and verify integration, production delivery and affected existing behavior. The implementation examples and framework-specific conventions below are defaults for the current stack. Other implementations must preserve their user-visible contracts through appropriate adapters or equivalents. A technology change alone does not require another design approval.

### Navigation flow

`main.jsx` → `App.jsx` → `MainDashboard.jsx` (sidebar + tab routing) → individual visualization components

`MainDashboard` manages which tab is active via local `useState`. Clicking a card on `HomeLanding` navigates to the corresponding visualization. The sidebar is collapsible on mobile.

### Visualization modules (`src/components/`)

Each file is a self-contained, interactive visualization:

| Component | Concept |
|---|---|
| `LLMInference.jsx` | Token prefill/decode, KV cache lifecycle, MoE vs Dense, temperature sampling |
| `ParallelStrategies.jsx` | 6D parallel topology (DP/TP/PP/CP/EP/ETP), tensor slicing, GPU mapping |
| `FlashAttention.jsx` | Tiled attention vs standard, SRAM/HBM IO tracking |
| `SparseAttention.jsx` | Single-canvas full-attention cost comparison, DSA selection, CSA/HCA compression with SWA, source provenance and separate indexer accounting |
| `CacheArchitecture.jsx` | CSA2 40-layer cache ownership, separate Top-K sources, FP4 byte budgets, CED prefill/decode and bounded decoder replay |
| `FlashDecode.jsx` | KV cache splitting, parallel reduction |
| `SpeculativeDecoding.jsx` | Autoregressive baseline, Draft–Target verification, rejection correction, KV rollback, tree candidates |
| `Quantization.jsx` | Offline RTN/AWQ/GPTQ/SmoothQuant, INT4/INT8/FP8 representation, online activation/KV quantization and scale lifecycle |
| `Engram.jsx` | DeepSeek n-gram memory retrieval, async prefetch |
| `RadixCache.jsx` | SGLang radix tree KV cache, LRU eviction, block reuse |
| `MooncakeL3.jsx` | Implemented open-source KV stack: control/data-plane split, 3 engineering difficulties, shared L3 KV pool, zero-copy RDMA fetch and reuse economics |
| `DpAttention.jsx` | DP/TP hybrid attention, KV cache sharding, cross-rank communication |
| `LinearAttention.jsx` | Softmax, kernelized linear attention, recurrent state, and GLA gating |
| `DeepInfer.jsx` | Offline engine architecture, exclusive Prefill/Decode batches, concrete request lifecycle and CPU/device overlap |

### Styling conventions

- The brand shell retains its dark identity. Workbenches support the shared Light, Dark and System appearance control; `docs/theme.md` describes CSS palette compilation and renderer exceptions.
- Framer Motion for animated transitions (`motion.div`, `AnimatePresence`)
- `clsx` + `tailwind-merge` for conditional class composition
- Responsive breakpoints: `md:` for sidebar/layout changes

### Shared workbench conventions

- Use `src/lib/chapter-registry.js` for routes, chapter descriptions, search aliases, and related chapters. Sidebar labels remain English; translated content uses the shared language provider.
- Use `chapter-page`, `chapter-layout`, `chapter-header`, and `chapter-body` with `src/components/workbench.css` for outer spacing and surfaces. Keep algorithm geometry, density, semantic colors, and split ratios module-owned. Group reset/play/step so the group wraps together.
- Use `useExperimentState` only for genuine experiment configuration. Configuration survives chapter navigation, including visits to Home; lifecycle/playing state stays local and unmounts on departure. Reload persistence is explicit through a share link, not implicit autosave.
- Shareable primary settings need validators in `experiment-sharing.js`; never serialize timers, DOM geometry, derived snapshots, or arbitrary component state. Add a stable `data-section-anchor` to major headings for bilingual section links. Run `npm run check:workbench` when changing sharing or routing.

### Visualization component conventions

Every visualization component (`src/components/*.jsx`) follows the durable project conventions below. Page structure and stage count remain concept-dependent; do not force a module into a layout that misrepresents the underlying algorithm.

**Theme:** The authored base palette uses light workbench surfaces (`bg-slate-50 text-slate-800`, cards as `bg-white border border-slate-200`) against the dark shell. The shared theme compiler supplies the dark palette. Author both-theme-compatible semantics and verify actual Light/Dark rendering, including inline SVG/canvas colors that the compiler does not transform. Do not add a chapter-local appearance control.

**Top control bar structure (default):** Keep title + subtitle, primary comparison mode, reset/play/step controls, and language switching together when they affect the whole module. Place controls that affect only one lower canvas beside that canvas instead of in the global header.

**i18n pattern:** All text goes through `t(key)`. Every component has a top-level `i18n = { zh: {...}, en: {...} }` object where `zh` and `en` keys are identical. Language comes from shared `useLanguage()` in `src/lib/LanguageContext.jsx`. The site header owns the only language control; saved preference takes precedence over browser language, and sidebar labels remain English. Do not add chapter-local language state or buttons. Never hardcode display strings in JSX.

**Mathematical notation:** All mathematical expressions must be authored as LaTeX and rendered through the shared KaTeX-backed math component (`MathFormula`). Do not imitate formulas with plain strings, Unicode subscripts/superscripts, or `font-mono`. Keep language-dependent prose in i18n, but keep language-independent LaTeX source outside the translation dictionaries. Complex equations must be paired with a variable explanation or a visualization that makes their role clear.

**Timeline capability:** Use a playback state machine only when ordered execution is part of the learning object:
```js
const [phase, setPhase] = useState('idle');   // 'idle' | 'running' | 'done'
const [step, setStep] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
// Timeline modules require handleNextStep(), reset(), togglePlay().
```

**Timeline auto-play pattern:**
```js
useEffect(() => {
  if (!isPlaying || isDone) return;
  const timer = setTimeout(handleNextStep, delay); // delay varies per step
  return () => clearTimeout(timer);
}, [isPlaying, step, ...deps]);
```

**Canonical domain model:** Store only user-controlled and genuine lifecycle state. Normalize constrained inputs, then use a pure `getXxxState(...)`, `deriveXxxModel(...)`, or equivalent function to compute all render data. Rendering is always a pure `model → UI` mapping with no side effects.

**Interaction capabilities:** Declare only the capabilities a module needs: timeline, multiple modes, resource metrics, structural comparison, data movement, dense layout, and math. Timeline state such as token/chunk position and active stage is conditional; mode, execution context, dimensions, parameters, selection, and lifecycle state must still drive every dependent canvas, metric, formula, code highlight, and explanation from one model.

**Layout:** Choose the smallest layout that makes the teaching relationship clear. A canvas, pseudocode panel, and principle inspector may be arranged in columns, rows, or layered sections. Do not require a fixed three-panel layout. When execution order is the learning object, show the full pipeline in one canvas and distinguish `active`, `passed`, and `pending` stages.

**Color semantics:**
- Give algorithms persistent identity colors only when comparison benefits from them
- Separate algorithm identity from transient active/write/warning/done colors
- Alert/bottleneck: `rose` with `ring` glow (`shadow-[0_0_15px_rgba(244,63,94,0.5)]`)
- Optimal/done: `emerald` / `green`
- Inactive: `bg-slate-100 border-slate-200`
- Pseudocode bg: `bg-[#0d1117]`
- Verify contrast for selected buttons, pale backgrounds, formulas, matrix cells, lines, and sliders; never rely on hue alone

**Visualization principles:**
- Start from one teaching question and make the design-level difference visible before implementation details
- Distinguish alternative algorithms from coexisting subsystems. For a system with cooperating branches, start with its architecture and input/output connections, then let users drill into layers, components, and individual records while retaining a breadcrumb and return path. Use comparison switches for real alternatives, not for parts that coexist in one system.
- Use Before/After only when a real baseline/solution comparison exists
- Show logical and physical layers only when both materially explain the concept
- Give different algorithms their real stage maps; never align fake stages for UI symmetry
- Advance a token only after its actual pipeline completes; represent prefill/chunk/parallel work truthfully
- Encode growth, fixed capacity, compression, recurrence, gating, movement, or parallelism through changing visual variables instead of prose
- Keep matrices/tensors compact, readable, and dimension-labeled; do not stretch tiny values into oversized boxes
- Metrics (IO traffic, hit rate, memory blocks) are computed dynamically from the canonical model, never stored as duplicate state
- When engine pseudocode contributes to the teaching claim, it must expose runtime operations such as allocation, metadata, cache/state access, kernel dispatch, and write-back rather than translating formulas line by line

**To create, modify, extend, substantially refactor, or QA an interactive module**, use `$develop-interactive-module` from `.agents/skills/develop-interactive-module/SKILL.md`. Follow its interaction, visual grammar, content/math, and rendered QA references. Record final evidence in `design-qa.md`.

For a topic-to-chapter request, this skill owns research through verified local delivery without intermediate design approval gates. New chapters and substantial redesigns keep resumable evidence in `docs/module-runs/<chapter-id>/`; small repairs use focused QA. Assessment-only requests remain assessments. Do not infer a deployment request from local implementation.

For technical principles and chapter design, use `.agents/skills/analyze-technical-principles/SKILL.md` with the rendering skill's `references/technical-analysis.md` handoff. Establish the reader concern and a testable explanatory thesis before hierarchy: trace the result to causes, mechanisms, costs and conditions. A generic architecture tour or polished scheduler demo does not establish a framework's performance/cost explanation. Decide chapter ownership without moving the chapter's necessary mechanism elsewhere. Research completeness does not require showing every dependency. Codebase Knowledge Builder is optional for actual source-analysis tasks, not the default for principle explanations. Review Chinese copy for natural, concrete phrasing. Full rendered acceptance covers light/dark themes, both languages and desktop/tablet/mobile, plus System preference resolution; inspect actual canvas surfaces and record coverage and limitations. Substantial redesigns receive independent outcome review in addition to mechanical QA.

Before delivering any new or revised chapter, the owner automatically performs the rendering skill's `references/reader-review.md` pass: personally read the actual page continuously from first screen to footer, explore important branches and returns, and reconstruct the answer from visible content. Record the reading path and friction. Repair substantive gaps and reread within the existing authorization; do not wait for a user reminder. Independent review, test matrices and successful builds cannot replace or waive this owner gate. Small repairs keep a short record; assessment-only and skill-only requests retain their scope.

### Skill 编写与自我改进

- 编写或迭代 Skill 时，提炼可迁移的判断方法与验收标准：从具体失败中识别适用条件、被破坏的约束、决策原则和可观察的验证方式，不直接把某次修复方案升级为通用规则。
- 不将特化案例、项目名、临时配置、固定数值、单次排障过程或复盘日志堆入可复用 Skill；这些证据留在项目的设计或验收记录中。确属该 Skill 领域契约的接口、格式与来源可以保留，但须明确适用范围。
- 自我改进优先修订已有原则并消除重复、冲突和过时约束。检查新规则能否用于不同主题，以及是否会损害已经做好的体验；不要把一种页面布局、交互形式或实现选择规定为所有任务的默认答案。

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `main`. The Vite base path is relative (`./`) so the build works at any deployment path.
