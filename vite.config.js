import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative assets so the site works whether the repository name changes
  // (e.g. AI-Infra-Viz vs LLM-Infra-Explorer) or is served from a subpath.
  base: './',
});
