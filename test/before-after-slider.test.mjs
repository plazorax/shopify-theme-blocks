// Runs assets/before-after-slider.js in a VM context with a minimal DOM stub,
// so the custom element's behaviour is tested without a browser dependency.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/before-after-slider.js', import.meta.url), 'utf8');

class FakeInput {
  constructor(value) {
    this.value = String(value);
    this.attributes = new Map();
    this.listeners = new Map();
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  dispatch(type) {
    this.listeners.get(type)?.();
  }
}

function loadElement() {
  const registry = new Map();
  class HTMLElement {
    constructor() {
      this.dataset = {};
      this.properties = new Map();
      this.style = { setProperty: (name, value) => this.properties.set(name, value) };
      this.child = null;
    }
    querySelector(selector) {
      return selector === 'input[type="range"]' ? this.child : null;
    }
  }
  const customElements = {
    get: (name) => registry.get(name),
    define: (name, constructor) => {
      if (registry.has(name)) throw new Error(`${name} already defined`);
      registry.set(name, constructor);
    },
  };
  const context = vm.createContext({ HTMLElement, customElements });
  vm.runInContext(source, context);
  // Loading the script twice (e.g. two sections on a page) must not throw.
  vm.runInContext(source, context);
  return registry.get('before-after-slider');
}

function mount(value, template = '[before]% before, [after]% after') {
  const Slider = loadElement();
  const element = new Slider();
  element.dataset.valueText = template;
  element.child = new FakeInput(value);
  element.connectedCallback();
  return element;
}

describe('<before-after-slider>', () => {
  it('registers the custom element once', () => {
    assert.equal(typeof loadElement(), 'function');
  });

  it('applies the initial value on connect', () => {
    const element = mount(30);
    assert.equal(element.properties.get('--before-after-value'), '30');
    assert.equal(element.child.attributes.get('aria-valuetext'), '30% before, 70% after');
  });

  it('updates position and aria-valuetext on input', () => {
    const element = mount(50);
    element.child.value = '85';
    element.child.dispatch('input');
    assert.equal(element.properties.get('--before-after-value'), '85');
    assert.equal(element.child.attributes.get('aria-valuetext'), '85% before, 15% after');
  });

  it('clamps and rounds out-of-range or non-numeric values', () => {
    const element = mount(140);
    assert.equal(element.properties.get('--before-after-value'), '100');
    element.child.value = '-3';
    element.child.dispatch('input');
    assert.equal(element.properties.get('--before-after-value'), '0');
    element.child.value = '33.6';
    element.child.dispatch('input');
    assert.equal(element.properties.get('--before-after-value'), '34');
    element.child.value = 'abc';
    element.child.dispatch('input');
    assert.equal(element.properties.get('--before-after-value'), '50');
  });

  it('leaves aria-valuetext alone when no template is provided', () => {
    const element = mount(40, '');
    assert.equal(element.child.attributes.has('aria-valuetext'), false);
    assert.equal(element.properties.get('--before-after-value'), '40');
  });

  it('removes its listener when disconnected', () => {
    const element = mount(20);
    element.disconnectedCallback();
    assert.equal(element.child.listeners.size, 0);
  });

  it('does nothing when the range input is missing', () => {
    const Slider = loadElement();
    const element = new Slider();
    assert.doesNotThrow(() => element.connectedCallback());
    assert.equal(element.properties.size, 0);
  });
});
