import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export type Browser = 'chrome' | 'firefox';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Objects merge recursively, arrays concatenate without duplicates, and
// scalars from the override win.
export function mergeManifests(base: Json, override: Json): Json {
  const result: Json = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (isObject(current) && isObject(value)) {
      result[key] = mergeManifests(current, value);
    } else if (Array.isArray(current) && Array.isArray(value)) {
      result[key] = [
        ...new Set([...(current as unknown[]), ...(value as unknown[])]),
      ];
    } else {
      result[key] = value;
    }
  }
  return result;
}

const readJson = (path: string): Json =>
  JSON.parse(readFileSync(path, 'utf-8')) as Json;

export function manifestPlugin(options: {
  browser: Browser;
  manifestDir: string;
  version: string;
}): Plugin {
  const basePath = resolve(options.manifestDir, 'manifest.json');
  const overridePath = resolve(
    options.manifestDir,
    `manifest.${options.browser}.json`,
  );

  return {
    name: 'extension-manifest',
    buildStart() {
      this.addWatchFile(basePath);
      this.addWatchFile(overridePath);
    },
    generateBundle() {
      const manifest = mergeManifests(
        readJson(basePath),
        readJson(overridePath),
      );
      manifest.version = options.version;
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}
