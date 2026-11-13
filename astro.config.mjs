import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mldangelo.github.io',
  base: '/burrito',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
