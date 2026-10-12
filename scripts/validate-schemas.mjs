#!/usr/bin/env node
// Usage: node scripts/validate-schemas.mjs [theme-root]
// Exits with code 1 when any section schema or locale check fails.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTheme } from './lib/theme-schema.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.argv[2] ?? defaultRoot);

const { errors, sections } = await validateTheme(root);

if (errors.length > 0) {
  for (const message of errors) console.error(`  x ${message}`);
  console.error(`\n${errors.length} problem(s) found in ${sections} section(s).`);
  process.exitCode = 1;
} else {
  console.log(`Schemas and locales OK (${sections} section(s) checked).`);
}
