// Static checks for section schemas and locale files.
//
// These complement `shopify theme check`: they focus on the contract between
// a section's {% schema %}, its Liquid markup and the two English locale files,
// so a section copied into another theme brings every key it needs.
//
// Rules come from Shopify's section schema reference:
// https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema
// https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SCHEMA_TAG = /{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/g;
const SETTINGS_WITHOUT_ID = new Set(['header', 'paragraph']);
const MAX_SECTION_NAME_LENGTH = 25;
const MAX_RANGE_STEPS = 101;

/**
 * Return the raw JSON text inside {% schema %}...{% endschema %}.
 * @param {string} source Liquid source
 * @returns {{ json: string | null, error: string | null }}
 */
export function extractSchema(source) {
  const matches = [...source.matchAll(SCHEMA_TAG)];
  if (matches.length === 0) return { json: null, error: 'missing {% schema %} tag' };
  if (matches.length > 1) return { json: null, error: 'more than one {% schema %} tag' };
  return { json: matches[0][1], error: null };
}

/**
 * Flatten nested locale objects into dotted keys that point at strings.
 * @param {Record<string, unknown>} object
 * @param {string} [prefix]
 * @returns {Map<string, string>}
 */
export function flattenLocale(object, prefix = '') {
  const result = new Map();
  for (const [key, value] of Object.entries(object)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of flattenLocale(value, dotted)) result.set(k, v);
    } else if (typeof value === 'string') {
      result.set(dotted, value);
    }
  }
  return result;
}

/**
 * Collect every "t:" reference anywhere in a schema object.
 * @param {unknown} value
 * @param {string} [where] JSON path used in error messages
 * @returns {{ key: string, where: string }[]}
 */
export function collectSchemaTranslationRefs(value, where = 'schema') {
  if (typeof value === 'string') {
    return value.startsWith('t:') ? [{ key: value.slice(2), where }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSchemaTranslationRefs(item, `${where}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      collectSchemaTranslationRefs(item, `${where}.${key}`),
    );
  }
  return [];
}

/**
 * Find storefront translation lookups such as {{ 'a.b.c' | t: name: value }}.
 * @param {string} source Liquid source (schema excluded)
 * @returns {{ key: string, args: string[] }[]}
 */
export function findLiquidTranslationRefs(source) {
  const refs = [];
  const pattern = /(['"])([\w.-]+)\1\s*\|\s*t\b(?:\s*:\s*([^|}%\n]*))?/g;
  for (const match of source.matchAll(pattern)) {
    const args = match[3] ? [...match[3].matchAll(/(\w+)\s*:/g)].map((m) => m[1]) : [];
    refs.push({ key: match[2], args });
  }
  return refs;
}

/**
 * Names of {{ placeholders }} used inside a translation string.
 * @param {string} text
 * @returns {string[]}
 */
export function interpolationNames(text) {
  return [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]);
}

/**
 * Static `section.settings.x` and `block.settings.x` references.
 * Dynamic lookups such as section.settings[key] are intentionally ignored.
 * @param {string} source
 * @returns {{ section: Set<string>, block: Set<string> }}
 */
export function findSettingRefs(source) {
  const collect = (owner) =>
    new Set([...source.matchAll(new RegExp(`\\b${owner}\\.settings\\.(\\w+)`, 'g'))].map((m) => m[1]));
  return { section: collect('section'), block: collect('block') };
}

function validateSettings(settings, where, errors) {
  if (!Array.isArray(settings)) {
    errors.push(`${where}: "settings" must be an array`);
    return new Map();
  }

  const byId = new Map();
  settings.forEach((setting, index) => {
    const at = `${where}[${index}]`;
    if (typeof setting?.type !== 'string') {
      errors.push(`${at}: missing "type"`);
      return;
    }
    if (SETTINGS_WITHOUT_ID.has(setting.type)) {
      if (typeof setting.content !== 'string') errors.push(`${at}: ${setting.type} needs "content"`);
      return;
    }
    if (typeof setting.id !== 'string' || setting.id === '') {
      errors.push(`${at}: missing "id"`);
      return;
    }
    if (byId.has(setting.id)) errors.push(`${at}: duplicate setting id "${setting.id}"`);
    byId.set(setting.id, setting);
    if (typeof setting.label !== 'string') errors.push(`${at} (${setting.id}): missing "label"`);

    if (setting.type === 'range') validateRange(setting, at, errors);
    if (setting.type === 'select' || setting.type === 'radio') validateOptions(setting, at, errors);
  });
  return byId;
}

function validateRange(setting, at, errors) {
  const { min, max, step = 1, default: fallback } = setting;
  const label = `${at} (${setting.id})`;
  if (![min, max, step, fallback].every(Number.isFinite)) {
    errors.push(`${label}: range needs numeric min, max, step and default`);
    return;
  }
  if (min >= max) errors.push(`${label}: min must be lower than max`);
  if (step <= 0) {
    errors.push(`${label}: step must be positive`);
    return;
  }
  if ((max - min) / step + 1 > MAX_RANGE_STEPS) {
    errors.push(`${label}: more than ${MAX_RANGE_STEPS} steps`);
  }
  if (fallback < min || fallback > max) errors.push(`${label}: default ${fallback} is outside ${min}-${max}`);
  if (!Number.isInteger(Number(((fallback - min) / step).toFixed(6)))) {
    errors.push(`${label}: default ${fallback} is not on a step of ${step} from ${min}`);
  }
}

function validateOptions(setting, at, errors) {
  const label = `${at} (${setting.id})`;
  if (!Array.isArray(setting.options) || setting.options.length === 0) {
    errors.push(`${label}: ${setting.type} needs a non-empty "options" array`);
    return;
  }
  const values = setting.options.map((option) => option?.value);
  if (new Set(values).size !== values.length) errors.push(`${label}: duplicate option values`);
  if (setting.default !== undefined && !values.includes(setting.default)) {
    errors.push(`${label}: default "${setting.default}" is not one of the options`);
  }
}

/**
 * Structural checks for one parsed section schema.
 * @param {any} schema
 * @param {Map<string, string>} schemaLocale flattened en.default.schema.json
 * @returns {{ errors: string[], sectionSettings: Set<string>, blockSettings: Set<string> }}
 */
export function validateSectionSchema(schema, schemaLocale) {
  const errors = [];

  if (typeof schema?.name !== 'string' || schema.name === '') {
    errors.push('schema: missing "name"');
  } else {
    const resolved = schema.name.startsWith('t:') ? schemaLocale.get(schema.name.slice(2)) : schema.name;
    if (resolved && resolved.length > MAX_SECTION_NAME_LENGTH) {
      errors.push(`schema.name: "${resolved}" is longer than ${MAX_SECTION_NAME_LENGTH} characters`);
    }
  }

  const sectionSettings = validateSettings(schema?.settings ?? [], 'schema.settings', errors);

  const blocks = new Map();
  const blockSettings = new Set();
  (schema?.blocks ?? []).forEach((block, index) => {
    const at = `schema.blocks[${index}]`;
    if (typeof block?.type !== 'string') {
      errors.push(`${at}: missing "type"`);
      return;
    }
    if (blocks.has(block.type)) errors.push(`${at}: duplicate block type "${block.type}"`);
    if (block.type !== '@app' && block.type !== '@theme' && typeof block.name !== 'string') {
      errors.push(`${at} (${block.type}): missing "name"`);
    }
    const settings = validateSettings(block.settings ?? [], `${at}.settings`, errors);
    for (const id of settings.keys()) blockSettings.add(id);
    blocks.set(block.type, settings);
  });

  const presets = schema?.presets ?? [];
  if (!Array.isArray(presets) || presets.length === 0) {
    errors.push('schema: no "presets", so the section cannot be added from the theme editor');
  } else {
    presets.forEach((preset, index) => {
      const at = `schema.presets[${index}]`;
      if (typeof preset?.name !== 'string' || preset.name === '') errors.push(`${at}: missing "name"`);
      for (const id of Object.keys(preset?.settings ?? {})) {
        if (!sectionSettings.has(id)) errors.push(`${at}.settings: unknown setting "${id}"`);
      }
      const presetBlocks = preset?.blocks ?? [];
      if (Number.isInteger(schema.max_blocks) && presetBlocks.length > schema.max_blocks) {
        errors.push(`${at}: ${presetBlocks.length} blocks exceed max_blocks (${schema.max_blocks})`);
      }
      presetBlocks.forEach((block, blockIndex) => {
        const blockAt = `${at}.blocks[${blockIndex}]`;
        const definition = blocks.get(block?.type);
        if (!definition) {
          errors.push(`${blockAt}: unknown block type "${block?.type}"`);
          return;
        }
        for (const id of Object.keys(block.settings ?? {})) {
          if (!definition.has(id)) errors.push(`${blockAt}.settings: unknown setting "${id}"`);
        }
      });
    });
  }

  for (const { key, where } of collectSchemaTranslationRefs(schema)) {
    if (!schemaLocale.has(key)) errors.push(`${where}: translation key "${key}" not found in en.default.schema.json`);
  }

  return { errors, sectionSettings: new Set(sectionSettings.keys()), blockSettings };
}

async function listLiquid(dir) {
  try {
    const entries = await readdir(dir);
    return entries.filter((name) => name.endsWith('.liquid')).sort().map((name) => path.join(dir, name));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readJson(file, errors) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    errors.push(`${file}: ${error.code === 'ENOENT' ? 'file not found' : `invalid JSON (${error.message})`}`);
    return {};
  }
}

/**
 * Validate every section and snippet of a theme folder against its locales.
 * @param {string} root theme root (contains sections/, snippets/, locales/)
 * @returns {Promise<{ errors: string[], sections: number }>}
 */
export async function validateTheme(root) {
  const errors = [];
  const rel = (file) => path.relative(root, file) || file;

  const storefrontLocale = flattenLocale(await readJson(path.join(root, 'locales/en.default.json'), errors));
  const schemaLocale = flattenLocale(await readJson(path.join(root, 'locales/en.default.schema.json'), errors));

  const usedSchemaKeys = new Set();
  const usedStorefrontKeys = new Set();

  const sectionFiles = await listLiquid(path.join(root, 'sections'));
  const snippetFiles = await listLiquid(path.join(root, 'snippets'));

  for (const file of [...sectionFiles, ...snippetFiles]) {
    const source = await readFile(file, 'utf8');
    const isSection = sectionFiles.includes(file);
    const markup = source.replace(SCHEMA_TAG, '');

    for (const { key, args } of findLiquidTranslationRefs(markup)) {
      usedStorefrontKeys.add(key);
      const text = storefrontLocale.get(key);
      if (text === undefined) {
        errors.push(`${rel(file)}: translation key "${key}" not found in en.default.json`);
        continue;
      }
      for (const name of interpolationNames(text)) {
        if (!args.includes(name)) errors.push(`${rel(file)}: "${key}" expects "${name}" but it is not passed`);
      }
    }

    if (!isSection) continue;

    const { json, error } = extractSchema(source);
    if (error) {
      errors.push(`${rel(file)}: ${error}`);
      continue;
    }
    let schema;
    try {
      schema = JSON.parse(json);
    } catch (parseError) {
      errors.push(`${rel(file)}: schema is not valid JSON (${parseError.message})`);
      continue;
    }

    const result = validateSectionSchema(schema, schemaLocale);
    errors.push(...result.errors.map((message) => `${rel(file)}: ${message}`));
    for (const { key } of collectSchemaTranslationRefs(schema)) usedSchemaKeys.add(key);

    const refs = findSettingRefs(markup);
    for (const id of refs.section) {
      if (!result.sectionSettings.has(id)) errors.push(`${rel(file)}: section.settings.${id} is not defined in the schema`);
    }
    for (const id of refs.block) {
      if (!result.blockSettings.has(id)) errors.push(`${rel(file)}: block.settings.${id} is not defined in any block`);
    }
  }

  for (const key of schemaLocale.keys()) {
    if (!usedSchemaKeys.has(key)) errors.push(`locales/en.default.schema.json: unused key "${key}"`);
  }
  for (const key of storefrontLocale.keys()) {
    if (!usedStorefrontKeys.has(key)) errors.push(`locales/en.default.json: unused key "${key}"`);
  }

  return { errors, sections: sectionFiles.length };
}
