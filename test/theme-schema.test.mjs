import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectSchemaTranslationRefs,
  extractSchema,
  findLiquidTranslationRefs,
  findSettingRefs,
  flattenLocale,
  validateSectionSchema,
  validateTheme,
} from '../scripts/lib/theme-schema.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const schemaLocaleObject = {
  sections: {
    demo: {
      name: 'Demo',
      settings: { heading: { label: 'Heading' }, size: { label: 'Size' } },
      blocks: { item: { name: 'Item', settings: { text: { label: 'Text' } } } },
      presets: { name: 'Demo' },
    },
  },
};
const locale = flattenLocale(schemaLocaleObject);

const validSchema = () => ({
  name: 't:sections.demo.name',
  max_blocks: 3,
  settings: [
    { type: 'text', id: 'heading', label: 't:sections.demo.settings.heading.label' },
    { type: 'range', id: 'size', label: 't:sections.demo.settings.size.label', min: 0, max: 100, step: 4, default: 40 },
  ],
  blocks: [
    {
      type: 'item',
      name: 't:sections.demo.blocks.item.name',
      settings: [{ type: 'text', id: 'text', label: 't:sections.demo.blocks.item.settings.text.label' }],
    },
  ],
  presets: [{ name: 't:sections.demo.presets.name', blocks: [{ type: 'item', settings: { text: 'Hi' } }] }],
});

describe('extractSchema', () => {
  it('returns the JSON between schema tags, including whitespace-control variants', () => {
    assert.equal(extractSchema('<p></p>{%- schema -%}{"name":"x"}{%- endschema -%}').json, '{"name":"x"}');
  });

  it('reports a missing or duplicated schema tag', () => {
    assert.match(extractSchema('<p></p>').error, /missing/);
    const twice = '{% schema %}{}{% endschema %}{% schema %}{}{% endschema %}';
    assert.match(extractSchema(twice).error, /more than one/);
  });
});

describe('flattenLocale', () => {
  it('maps nested objects to dotted keys and keeps only strings', () => {
    const flat = flattenLocale({ a: { b: 'x', c: { d: 'y' } }, n: 1 });
    assert.deepEqual([...flat.entries()], [['a.b', 'x'], ['a.c.d', 'y']]);
  });
});

describe('collectSchemaTranslationRefs', () => {
  it('finds t: strings at any depth with a readable path', () => {
    const refs = collectSchemaTranslationRefs({ name: 't:a.b', settings: [{ label: 't:c.d', id: 'plain' }] });
    assert.deepEqual(refs, [
      { key: 'a.b', where: 'schema.name' },
      { key: 'c.d', where: 'schema.settings[0].label' },
    ]);
  });
});

describe('findLiquidTranslationRefs', () => {
  it('captures keys and named interpolation arguments', () => {
    const source = `{{ 'a.plain' | t }} {{ "a.args" | t: before: 10, after: x }} {%- assign y = 'a.assign' | t | escape -%}`;
    assert.deepEqual(findLiquidTranslationRefs(source), [
      { key: 'a.plain', args: [] },
      { key: 'a.args', args: ['before', 'after'] },
      { key: 'a.assign', args: [] },
    ]);
  });
});

describe('findSettingRefs', () => {
  it('collects static section and block setting ids only', () => {
    const refs = findSettingRefs('{{ section.settings.heading }} {{ block.settings.text }} {{ section.settings[key] }}');
    assert.deepEqual([...refs.section], ['heading']);
    assert.deepEqual([...refs.block], ['text']);
  });
});

describe('validateSectionSchema', () => {
  it('accepts a well-formed schema', () => {
    assert.deepEqual(validateSectionSchema(validSchema(), locale).errors, []);
  });

  it('rejects duplicate ids, bad ranges and select defaults', () => {
    const schema = validSchema();
    schema.settings.push(
      { type: 'text', id: 'heading', label: 'Again' },
      { type: 'range', id: 'off_step', label: 'x', min: 0, max: 100, step: 4, default: 42 },
      { type: 'range', id: 'too_many', label: 'x', min: 0, max: 500, step: 1, default: 0 },
      { type: 'select', id: 'pick', label: 'x', options: [{ value: 'a', label: 'A' }], default: 'b' },
    );
    const { errors } = validateSectionSchema(schema, locale);
    assert.ok(errors.some((e) => e.includes('duplicate setting id "heading"')));
    assert.ok(errors.some((e) => e.includes('default 42 is not on a step of 4')));
    assert.ok(errors.some((e) => e.includes('too_many') && e.includes('more than 101 steps')));
    assert.ok(errors.some((e) => e.includes('default "b" is not one of the options')));
  });

  it('checks presets against blocks, settings and max_blocks', () => {
    const schema = validSchema();
    schema.presets[0].settings = { missing: true };
    schema.presets[0].blocks.push(
      { type: 'ghost' },
      { type: 'item', settings: { nope: 1 } },
      { type: 'item' },
    );
    const { errors } = validateSectionSchema(schema, locale);
    assert.ok(errors.some((e) => e.includes('unknown setting "missing"')));
    assert.ok(errors.some((e) => e.includes('unknown block type "ghost"')));
    assert.ok(errors.some((e) => e.includes('unknown setting "nope"')));
    assert.ok(errors.some((e) => e.includes('exceed max_blocks (3)')));
  });

  it('requires at least one preset', () => {
    const schema = validSchema();
    delete schema.presets;
    assert.ok(validateSectionSchema(schema, locale).errors.some((e) => e.includes('no "presets"')));
  });

  it('reports translation keys missing from the schema locale', () => {
    const schema = validSchema();
    schema.settings[0].info = 't:sections.demo.settings.heading.info';
    const { errors } = validateSectionSchema(schema, locale);
    assert.deepEqual(errors, [
      'schema.settings[0].info: translation key "sections.demo.settings.heading.info" not found in en.default.schema.json',
    ]);
  });

  it('enforces the 25-character limit on the resolved section name', () => {
    const longName = flattenLocale({ sections: { demo: { name: 'A section name that is far too long' } } });
    const merged = new Map([...locale, ...longName]);
    assert.ok(validateSectionSchema(validSchema(), merged).errors.some((e) => e.includes('longer than 25')));
  });
});

describe('validateTheme', () => {
  const tempDirs = [];
  after(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function makeTheme(files) {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'theme-blocks-'));
    tempDirs.push(dir);
    for (const [name, content] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
      await writeFile(path.join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
    }
    return dir;
  }

  it('passes on this repository', async () => {
    const { errors, sections } = await validateTheme(repoRoot);
    assert.deepEqual(errors, []);
    assert.equal(sections, 3);
  });

  it('finds markup/schema/locale mismatches in a broken theme', async () => {
    const schema = validSchema();
    const dir = await makeTheme({
      'sections/demo.liquid': [
        "{{ section.settings.heading }} {{ section.settings.typo }} {{ block.settings.txt }}",
        "{{ 'demo.greeting' | t }} {{ 'demo.missing' | t }}",
        `{% schema %}${JSON.stringify(schema)}{% endschema %}`,
      ].join('\n'),
      'sections/broken.liquid': '{% schema %}{ not json }{% endschema %}',
      'snippets/hello.liquid': "{{ 'demo.count' | t }}",
      'locales/en.default.json': { demo: { greeting: 'Hi', count: '{{ count }} items', unused: 'x' } },
      'locales/en.default.schema.json': { ...schemaLocaleObject, extra: 'unused' },
    });

    const { errors } = await validateTheme(dir);
    const expectFragments = [
      'sections/broken.liquid: schema is not valid JSON',
      'sections/demo.liquid: translation key "demo.missing" not found in en.default.json',
      'sections/demo.liquid: section.settings.typo is not defined in the schema',
      'sections/demo.liquid: block.settings.txt is not defined in any block',
      'snippets/hello.liquid: "demo.count" expects "count" but it is not passed',
      'locales/en.default.json: unused key "demo.unused"',
      'locales/en.default.schema.json: unused key "extra"',
    ];
    for (const fragment of expectFragments) {
      assert.ok(errors.some((e) => e.startsWith(fragment)), `expected an error starting with: ${fragment}\n${errors.join('\n')}`);
    }
    assert.equal(errors.length, expectFragments.length, errors.join('\n'));
  });

  it('reports missing locale files instead of throwing', async () => {
    const dir = await makeTheme({ 'sections/empty.liquid': '<p></p>' });
    const { errors } = await validateTheme(dir);
    assert.ok(errors.some((e) => e.endsWith('en.default.json: file not found')));
    assert.ok(errors.some((e) => e.endsWith('sections/empty.liquid: missing {% schema %} tag')));
  });
});
