/**
 * <before-after-slider>
 *
 * Keeps the CSS custom property --before-after-value (0-100) and the range input's
 * aria-valuetext in sync with the input value. All interaction (pointer,
 * touch, keyboard) is handled natively by <input type="range">.
 *
 * Expected markup (see sections/before-after-slider.liquid):
 *   <before-after-slider data-value-text="[before]% before, [after]% after">
 *     ...
 *     <input type="range" min="0" max="100" value="50">
 *   </before-after-slider>
 */
(() => {
  'use strict';

  const TAG_NAME = 'before-after-slider';

  /**
   * Clamp a raw input value to a whole number between 0 and 100.
   * Non-numeric input falls back to 50 (the visual midpoint).
   * @param {unknown} raw
   * @returns {number}
   */
  const toPercent = (raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return 50;
    return Math.min(100, Math.max(0, Math.round(value)));
  };

  /**
   * Fill the "[before]" and "[after]" placeholders of a translated template.
   * @param {string} template
   * @param {number} before
   * @returns {string}
   */
  const formatValueText = (template, before) =>
    template.replaceAll('[before]', String(before)).replaceAll('[after]', String(100 - before));

  class BeforeAfterSlider extends HTMLElement {
    constructor() {
      super();
      this.update = this.update.bind(this);
    }

    connectedCallback() {
      this.input = this.querySelector('input[type="range"]');
      if (!this.input) return;
      this.input.addEventListener('input', this.update);
      this.update();
    }

    disconnectedCallback() {
      if (this.input) this.input.removeEventListener('input', this.update);
    }

    update() {
      const before = toPercent(this.input.value);
      this.style.setProperty('--before-after-value', String(before));

      const template = this.dataset.valueText;
      if (template) this.input.setAttribute('aria-valuetext', formatValueText(template, before));
    }
  }

  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, BeforeAfterSlider);
  }
})();
