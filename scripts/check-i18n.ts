// Fails (exit 1) when en.json and ne.json differ in keys, a value is empty,
// code uses a t('key') that en.json lacks, or a shared error code has no message.
// Run: node scripts/check-i18n.ts [localesDir]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ERROR_CODES, UNKNOWN_ERROR } from '../packages/shared/src/errors.ts';

type Json = { [key: string]: Json } | string;

const root = resolve(import.meta.dirname, '..');
const localesDir = resolve(process.argv[2] ?? join(root, 'apps/mobile/locales'));
const sourceDirs = [join(root, 'apps/mobile/app'), join(root, 'apps/mobile/src')];

function flatten(obj: Json, prefix = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof obj === 'string') {
    out.set(prefix, obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

function load(lang: string): Map<string, string> {
  const raw = readFileSync(join(localesDir, `${lang}.json`), 'utf8');
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip a Windows byte-order mark
  return flatten(JSON.parse(text) as Json);
}

function walk(dir: string, files: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(path);
  }
  return files;
}

const en = load('en');
const ne = load('ne');
const problems: string[] = [];

for (const key of en.keys()) if (!ne.has(key)) problems.push(`missing in ne.json: ${key}`);
for (const key of ne.keys()) if (!en.has(key)) problems.push(`missing in en.json: ${key}`);
for (const [lang, map] of [['en', en], ['ne', ne]] as const) {
  for (const [key, value] of map) if (value.trim() === '') problems.push(`empty in ${lang}.json: ${key}`);
}

for (const code of [...ERROR_CODES, UNKNOWN_ERROR]) {
  if (!en.has(`errors.${code}`)) problems.push(`no message for error code: errors.${code}`);
}

const usage = /\bt\(\s*['"`]([\w.-]+)['"`]/g;
for (const file of sourceDirs.flatMap((d) => walk(d))) {
  for (const match of readFileSync(file, 'utf8').matchAll(usage)) {
    const key = match[1];
    if (key && !en.has(key)) problems.push(`used but not in en.json: ${key} (${file.slice(root.length + 1)})`);
  }
}

if (problems.length) {
  console.error(`i18n check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n check passed: ${en.size} keys in en and ne`);
