import { defineConfig } from 'vite';

// BASE_PATH is set by the GitHub Pages workflow ("/<repo>/"); local dev and preview serve from "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
});
