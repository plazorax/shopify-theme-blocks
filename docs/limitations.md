# Limitations and roadmap

Back to the [README](../README.md).

## Limitations

- Only English locales are included.
- The sections have not been tested in a live store theme editor, and nothing
  in this repository has been pushed to a store. Liquid rendering is covered by
  Theme Check only, not by end-to-end tests.
- In the theme editor, selecting an FAQ block does not open its `<details>`.
  Doing that needs a `shopify:block:select` listener, which would add
  JavaScript.
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

## Possible next steps

- Theme blocks (`blocks/` folder) versions of the FAQ item and comparison row.
- A vertical slider orientation.
- Browser tests with Playwright against a development store.
