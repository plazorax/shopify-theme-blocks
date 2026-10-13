# Shopify Theme Blocks

![CI](https://github.com/plazorax/shopify-theme-blocks/actions/workflows/ci.yml/badge.svg)

Three drop-in Online Store 2.0 sections for Shopify themes: an FAQ accordion, a
comparison table and a before/after image slider. No dependencies, no inline
JavaScript, and every file can be copied into an existing theme.

## Why

These patterns appear in most storefronts and are often built with a
JavaScript accordion, a `<div>` grid posing as a table, or a slider that ignores
the keyboard. Here they are built on platform primitives:

- `<details>`/`<summary>` for disclosure, with no script.
- A real `<table>` with header scopes, so screen readers announce row and column.
- `<input type="range">` for the slider, so keyboard, touch and assistive
  technology support come from the browser.
- Translated schemas, presets, and a validator that keeps schema, markup and
  locales in sync.

## Install

1. Copy the files for the sections you want into your theme, keeping the folders:

   ```text
   sections/faq-accordion.liquid
   assets/section-faq-accordion.css

   sections/comparison-table.liquid
   snippets/comparison-table-value.liquid
   assets/section-comparison-table.css

   sections/before-after-slider.liquid
   assets/section-before-after-slider.css
   assets/before-after-slider.js
   ```

2. Merge the `sections.<section_name>` keys (for example `sections.faq_accordion`)
   from `locales/en.default.json` and `locales/en.default.schema.json` into your
   theme's locale files. Merge, do not replace, or the theme loses its own keys.
3. In the theme editor, choose **Add section** and pick the section.

Do not copy `layout/`, `config/` or `templates/`; they only exist so Theme Check
treats the repo as a theme.

## Sections

| Section | What it does | File |
| --- | --- | --- |
| FAQ accordion | Native `<details>` items, optional one-open-at-a-time mode and FAQPage JSON-LD | `sections/faq-accordion.liquid` |
| Comparison table | Up to 4 columns, one block per row, check/cross icons with text alternatives, sticky feature column | `sections/comparison-table.liquid` |
| Before/after slider | Two images compared with a native range input and a small custom element | `sections/before-after-slider.liquid` |

Settings and implementation notes: [docs/sections.md](docs/sections.md).
Running the validator, tests and Theme Check: [docs/development.md](docs/development.md).

## Status

v0.1.0 — reference implementation. Checked with Theme Check, a schema/locale
validator and unit tests, but not yet rendered in a live store or theme editor.
English locales only. Full list: [docs/limitations.md](docs/limitations.md).

## License

[MIT](LICENSE) © 2026 Oleksii Shaposhnikov
