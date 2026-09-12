# Site appearance

The header owns the only appearance control: Light, Dark, or System. First visits follow the operating system; explicit preferences are stored under `infra-explorer-theme`. The provider listens for system and cross-tab preference changes. Theme state is separate from chapter experiment state. The inline bootstrap in `index.html` applies the preference before React mounts.

The existing light workbench palette remains the light branch. The brand shell and home page retain their established dark identity. `scripts/theme-colors.mjs` compiles chapter CSS and Tailwind colors into CSS `light-dark()` pairs by role (surface, text, border). Vite imports the PostCSS configuration so palette edits reload during development. This avoids per-chapter theme switches and duplicated override stylesheets.

Preserve alpha, semantic hue identity, already-dark code surfaces, and light text on saturated controls. Bright saturated surfaces are dimmed for light-text contrast. Images are not recolored. Explicit SVG presentation attributes or runtime inline colors are not processed by PostCSS: use theme-aware CSS classes, inherited `currentColor`, or an explicit `light-dark()` pair for those. Check new diagram colors in both themes. Do not use full-page inversion filters.

Browser support: `light-dark()` and `color-scheme` in current modern browsers. Reference: [MDN light-dark](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark). Native forms and scrollbars inherit the resolved color scheme.

Run `node scripts/check-theme.mjs` and `npm run build`, then inspect representative filled/selected/moving states, formulas, SVG labels, native inputs, narrow-screen header controls, and both languages. The color regression covers alpha, assets, idempotence, representative body-text contrast, semantic tints, and nested media rules; it does not prove contrast for every possible composite/opacity state.
