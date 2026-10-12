# shopify-theme-blocks

![CI](https://github.com/plazorax/shopify-theme-blocks/actions/workflows/ci.yml/badge.svg)

Three drop-in Online Store 2.0 sections for Shopify themes: an FAQ accordion,
a comparison table and a before/after image slider. They have no dependencies
and no inline JavaScript, and every file can be copied into an existing theme.

**Status:** v0.1.0, reference implementation.
**Tested with:** Shopify CLI 4.9.3 (`shopify theme check`), Node.js 22.23.1, npm 10.9.8.

## Why

These three patterns come up in most storefront projects. They are often built
with a JavaScript accordion, a `<div>` grid pretending to be a table, or a
slider that cannot be used from the keyboard. This repository shows the same
features built on platform primitives:

- `<details>`/`<summary>` for disclosure, with no script.
- A real `<table>` with header scopes, so screen readers can announce the
  row and column for each cell.
- `<input type="range">` for the slider, so keyboard, touch and assistive
  technology support come from the browser.

Each section ships with full schema translations, presets and a validator that
keeps the schema, the markup and the locale files consistent.

## Quick start

Copy the files for the section you want into your theme, keeping the folders:

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

Then merge the matching keys from `locales/en.default.json` and
`locales/en.default.schema.json` into your theme's locale files. Each section's
keys live under `sections.<section_name>`, for example
`sections.faq_accordion`. Do not replace your theme's files, because that would
remove its existing keys.

Open the theme editor, choose **Add section**, and pick **FAQ accordion**,
**Comparison table** or **Before/after slider**.

`layout/`, `config/` and `templates/` are a minimal scaffold so that
`shopify theme check` can treat this folder as a theme. Do not copy them.

To run the checks locally (Theme Check needs the Shopify CLI, for example
`npm install --global @shopify/cli@4.9.3`, the version CI uses):

```sh
npm run validate      # schema and locale validator
npm test              # unit tests (node:test, no dependencies)
npm run theme-check   # shopify theme check --fail-level suggestion
```

## Sections

### FAQ accordion (`sections/faq-accordion.liquid`)

One **Question** block per item (up to 50).

| Setting | Type | Default | Notes |
| --- | --- | --- | --- |
| Heading | text | Frequently asked questions | Rendered as `<h2>`. |
| Introduction | richtext | empty | Shown under the heading. |
| Open the first question by default | checkbox | off | |
| Allow only one open question at a time | checkbox | off | Sets the same `name` on every `<details>`. Browsers without support let several items stay open. |
| Output FAQPage structured data | checkbox | off | Emits schema.org `FAQPage` JSON-LD from the blocks. Skipped if no block has both a question and an answer. |
| Top / bottom padding | range | 40 px | 0 to 100 px. |

Block settings: **Question** (text) and **Answer** (richtext).

Search engines: Google shows FAQ rich results only for well-known government
and health websites
([Google Search Central, August 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes)).
The markup is still valid structured data, but most stores should not expect a
visible change in search results. Use it only once per page and only for
questions you wrote yourself
([FAQPage guidelines](https://developers.google.com/search/docs/appearance/structured-data/faqpage)).

### Comparison table (`sections/comparison-table.liquid`)

Columns are set on the section. One **Row** block per feature (up to 40).

| Setting | Type | Default | Notes |
| --- | --- | --- | --- |
| Heading | text | Compare plans | Also labels the scroll region. |
| Column 1 to 4 heading | text | Basic, Standard, Premium, empty | A column with an empty heading is not rendered. |
| Highlighted column | select | Column 2 | None or columns 1 to 4. |
| Highlighted column badge | text | Most popular | Shown above the highlighted column heading. |
| Background | color | `#ffffff` | Also used behind the pinned feature column. |
| Text | color | `#1a1a1a` | |
| Highlighted column background | color | `#eef3ff` | |
| Top / bottom padding | range | 40 px | 0 to 100 px. |

Row block settings: **Feature** (text), **Feature description** (text), and for
each column an **Icon** (none, check, cross) and **Text**. Icon and text can be
combined, for example a check with "Up to 5 users". Rows with an empty
**Feature** are not rendered.

### Before/after slider (`sections/before-after-slider.liquid`)

| Setting | Type | Default | Notes |
| --- | --- | --- | --- |
| Heading | text | See the difference | |
| Before image | image_picker | none | Shown on the left. A placeholder is rendered when empty. |
| After image | image_picker | none | Shown on the right. Use the same size and framing as the before image. |
| Aspect ratio | select | Adapt to image | Adapt, 1:1, 4:3, 3:4, 16:9. "Adapt" uses the after image, then the before image, then 16:9. |
| Starting position | range | 50 % | 0 to 100 %, step 5. |
| Show labels | checkbox | on | |
| Before label / After label | text | Before / After | Visual only (`aria-hidden`); the range input carries the accessible name. |
| Caption | richtext | empty | |
| Top / bottom padding | range | 40 px | 0 to 100 px. |

Set alt text on both images in the Shopify admin. `image_tag` uses the image's
alt text; without it the images are treated as decorative.

## How it works

**FAQ accordion.** Each block renders a `<details>` element. The optional
exclusive mode uses the
[`name` attribute on `<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details).
The open/close animation is CSS only: in browsers that support
[`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content)
and [`interpolate-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size),
the panel height transitions from `0` to `auto`. Other browsers open and close
instantly. The animation is inside `@media (prefers-reduced-motion: no-preference)`,
so users who ask for reduced motion never see it. The JSON-LD uses the Liquid
`json` filter for every value, so quotes and line breaks in answers are escaped.

**Comparison table.** The markup is a `<table>` with `<th scope="col">` for
plan headings and `<th scope="row">` for feature names, following the
[W3C tables tutorial](https://www.w3.org/WAI/tutorials/tables/two-headers/).
Check and cross icons are `aria-hidden` SVGs, each followed by visually hidden
text ("Included" / "Not included") from `locales/en.default.json`. The table
sits in a `role="region"` wrapper with a label and `tabindex="0"`, so keyboard
users can scroll it when it overflows. The feature column uses
`position: sticky` and stays visible while the other columns scroll.

**Before/after slider.** Both images are absolutely positioned in a frame with
a fixed `aspect-ratio`. The before image is on top and clipped with
`clip-path: inset(0 calc(100% - var(--before-after-x)) 0 0)`. A
transparent `<input type="range">` covers the frame, so pressing or dragging
anywhere moves the divider. Arrow keys, Home/End and Page Up/Down work because
they are native range behaviours. The input's thumb is as wide as the visible
knob (44px) and as tall as the frame, because some touch browsers, notably
iOS Safari, only move a range input when the thumb itself is dragged
([RangeTouch](https://github.com/sampotts/rangetouch),
[WebKit bug 266283](https://bugs.webkit.org/show_bug.cgi?id=266283)).
`--before-after-x` is the thumb's centre, so the divider stays under the
pointer. `assets/before-after-slider.js` defines
`<before-after-slider>`, a small custom element that copies the input value
into `--before-after-value` and updates `aria-valuetext` (for example
"40% before, 60% after") from a translated template. Before the element is
defined, or with JavaScript off, CSS hides the input and handle and shows a
static split at the starting position. Images use
[`image_url` and `image_tag`](https://shopify.dev/docs/api/liquid/filters/image_tag)
with `widths`, `sizes` and `loading: 'lazy'`, so Shopify generates the
`srcset` and the `width`/`height` attributes.

**Validation.** `shopify theme check` runs the
[Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check)
recommended rules, including schema translation keys and storefront `t` keys.
`scripts/validate-schemas.mjs` adds checks that Theme Check does not cover, based
on the [section schema](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema)
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

The tests in `test/` cover the validator rules and run the custom element in a
`node:vm` context with a minimal DOM stub.

## Limitations and roadmap

- Only English locales are included.
- The sections have not been tested in a live store theme editor, and nothing
  in this repository has been pushed to a store. Liquid rendering is covered by
  Theme Check only, not by end-to-end tests.
- In the theme editor, selecting an FAQ block does not open its `<details>`.
  Doing that needs a `shopify:block:select` listener, which would add JavaScript.
- The comparison table supports at most four columns, defined on the section
  rather than as blocks.
- Colors and spacing are section settings, not linked to a theme's color
  schemes, because color scheme settings depend on each theme's
  `settings_schema.json`.
- The slider frame forces `direction: ltr`, so the before image is always on
  the left, including in right-to-left themes.
- Because the divider follows the centre of a 44px thumb, half a thumb (22px)
  of the other image stays visible at 0% and 100%.
- Touch dragging has been checked in desktop Chromium with touch emulation
  only, not on physical iOS or Android devices.

Possible next steps: theme blocks (`blocks/` folder) versions of the FAQ item
and comparison row, a vertical slider orientation, and browser tests with
Playwright against a development store.

## License

[MIT](LICENSE) © 2026 Oleksii Shaposhnikov
