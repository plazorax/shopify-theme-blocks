# Sections

Settings reference and implementation notes for each section. Back to the
[README](../README.md).

## FAQ accordion

File: `sections/faq-accordion.liquid`, styles in `assets/section-faq-accordion.css`.

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

### How it works

Each block renders a `<details>` element. The optional exclusive mode uses the
[`name` attribute on `<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details).
The open/close animation is CSS only: in browsers that support
[`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content)
and [`interpolate-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size),
the panel height transitions from `0` to `auto`. Other browsers open and close
instantly. The animation is inside `@media (prefers-reduced-motion: no-preference)`,
so users who ask for reduced motion never see it. The JSON-LD uses the Liquid
`json` filter for every value, so quotes and line breaks in answers are escaped.

### Search engines

Google shows FAQ rich results only for well-known government and health
websites
([Google Search Central, August 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes)).
The markup is still valid structured data, but most stores should not expect a
visible change in search results. Use it only once per page and only for
questions you wrote yourself
([FAQPage guidelines](https://developers.google.com/search/docs/appearance/structured-data/faqpage)).

## Comparison table

Files: `sections/comparison-table.liquid`, `snippets/comparison-table-value.liquid`,
styles in `assets/section-comparison-table.css`.

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

### How it works

The markup is a `<table>` with `<th scope="col">` for plan headings and
`<th scope="row">` for feature names, following the
[W3C tables tutorial](https://www.w3.org/WAI/tutorials/tables/two-headers/), so
screen readers can announce the row and column for each cell. Check and cross
icons are `aria-hidden` SVGs, each followed by visually hidden text
("Included" / "Not included") from `locales/en.default.json`. The table sits in
a `role="region"` wrapper with a label and `tabindex="0"`, so keyboard users
can scroll it when it overflows. The feature column uses `position: sticky` and
stays visible while the other columns scroll.

## Before/after slider

Files: `sections/before-after-slider.liquid`, `assets/section-before-after-slider.css`,
`assets/before-after-slider.js`.

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

### How it works

Both images are absolutely positioned in a frame with a fixed `aspect-ratio`.
The before image is on top and clipped with
`clip-path: inset(0 calc(100% - var(--before-after-x)) 0 0)`. A transparent
`<input type="range">` covers the frame, so pressing or dragging anywhere moves
the divider. Arrow keys, Home/End and Page Up/Down work because they are native
range behaviours.

The input's thumb is as wide as the visible knob (44px) and as tall as the
frame, because some touch browsers, notably iOS Safari, only move a range input
when the thumb itself is dragged
([RangeTouch](https://github.com/sampotts/rangetouch),
[WebKit bug 266283](https://bugs.webkit.org/show_bug.cgi?id=266283)).
`--before-after-x` is the thumb's centre, so the divider stays under the
pointer.

`assets/before-after-slider.js` defines `<before-after-slider>`, a small custom
element that copies the input value into `--before-after-value` and updates
`aria-valuetext` (for example "40% before, 60% after") from a translated
template. Before the element is defined, or with JavaScript off, CSS hides the
input and handle and shows a static split at the starting position.

Images use [`image_url` and `image_tag`](https://shopify.dev/docs/api/liquid/filters/image_tag)
with `widths`, `sizes` and `loading: 'lazy'`, so Shopify generates the `srcset`
and the `width`/`height` attributes.
