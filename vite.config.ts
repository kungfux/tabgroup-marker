import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { manifestPlugin, type Browser } from './build/manifest-plugin.ts';

const projectRoot = import.meta.dirname;
const pkg = JSON.parse(
  readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'),
) as {
  version: string;
};

// Modes: chrome | firefox | development-chrome | development-firefox
export default defineConfig(({ mode }) => {
  const browser: Browser = mode.endsWith('firefox') ? 'firefox' : 'chrome';
  const isDev = mode.startsWith('development');
  const src = (path: string) => resolve(projectRoot, 'src', path);

  return {
    root: 'src',
    publicDir: resolve(projectRoot, 'public'),
    define: { __BROWSER__: JSON.stringify(browser) },
    plugins: [
      manifestPlugin({
        browser,
        manifestDir: src('manifest'),
        version: pkg.version,
      }),
    ],
    build: {
      outDir: resolve(projectRoot, 'dist', browser),
      emptyOutDir: true,
      sourcemap: isDev,
      minify: !isDev,
      target: 'es2022',
      rollupOptions: {
        input: {
          background: src('background/index.ts'),
          content: src('content/index.ts'),
          popup: src('popup/index.html'),
          settings: src('settings/index.html'),
        },
        output: {
          // Stable names so manifest paths stay valid.
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  };
});
