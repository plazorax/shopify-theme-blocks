# Development

How to run the checks and what they cover. Back to the [README](../README.md).

## Repository layout

`sections/`, `snippets/`, `assets/` and `locales/` hold the code you copy into a
theme. `layout/`, `config/` and `templates/` are a minimal scaffold so that
`shopify theme check` can treat this folder as a theme. Do not copy them.

## Running the checks

Requires Node.js 20 or later. Theme Check needs the Shopify CLI, for example
`npm install --global @shopify/cli@4.9.3`, the version CI uses.

```sh
npm run validate      # schema and locale validator
npm test              # unit tests (node:test, no dependencies)
npm run theme-check   # shopify theme check --fail-level suggestion
npm run check         # validate + test
```

Last verified with Shopify CLI 4.9.3 (`shopify theme check`), Node.js 22.23.1
and npm 10.9.8. CI (`.github/workflows/ci.yml`) runs the validator, the tests
and Theme Check on Node.js 22.

## Validation

`shopify theme check` runs the
[Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check)
recommended rules, including schema translation keys and storefront `t` keys.

`scripts/validate-schemas.mjs` adds checks that Theme Check does not cover,
based on the
[section schema](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema)
and [input settings](https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings)
references:

- the schema parses and the section name is at most 25 characters;
- setting ids and block types are unique;
- `range` defaults are within bounds and on a step, with at most 101 steps;
- `select` defaults are one of the options;
- presets exist, have names, and only use known blocks and settings;
- every `section.settings.x` and `block.settings.x` in the markup is defined;
- every `t:` key resolves in `en.default.schema.json`, every `'key' | t`
  resolves in `en.default.json`, interpolation variables are passed, and no
  locale key is unused.

## Tests

The tests in `test/` cover the validator rules and run the
`<before-after-slider>` custom element in a `node:vm` context with a minimal
DOM stub.
