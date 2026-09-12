import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import postcss from './postcss.config.js';

export default defineConfig({
  plugins: [react()],
  css: {postcss},
  // Use relative assets so the site works whether the repository name changes
  // (e.g. AI-Infra-Viz vs LLM-Infra-Explorer) or is served from a subpath.
  base: './',
});
