# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-13

### Added

- `faq-accordion` section: native `<details>`/`<summary>` items, optional
  one-open-at-a-time mode, CSS-only open/close animation that respects
  `prefers-reduced-motion`, optional FAQPage JSON-LD.
- `comparison-table` section: up to four columns, one block per row,
  check/cross icons with text alternatives, horizontal scroll with a sticky
  feature column on narrow screens.
- `before-after-slider` section: two images compared with a native range input,
  `<before-after-slider>` custom element, responsive `image_tag` output with
  lazy loading.
- English storefront and schema locale entries for all three sections.
- `scripts/validate-schemas.mjs`: checks schemas, presets, setting references
  and translation keys against the locale files.
- Unit tests (Node test runner) and a GitHub Actions workflow running the
  validator, the tests and `shopify theme check`.
