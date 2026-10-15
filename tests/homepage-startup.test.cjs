// Run: node tests/homepage-startup.test.cjs
// Regression checks against the production homepage runtime, with controlled
// page lifecycle events and scroll restoration. This is not a rendering test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../layout.js'), 'utf8');

function harness({ hash = '', height = 800, restoredScroll = 0, reduced = false } = {}) {
  const listeners = new Map();
  const frames = new Map();
  const observers = [];
  let frameId = 0;
  function element(id = '') {
    const classes = new Set(); const attrs = {};
    return {
      id, attrs, dataset: {}, offsetTop: 0, offsetHeight: 40,
      style: { values: {}, setProperty(k, v) { this.values[k] = v; } },
      classList: { add(k) { classes.add(k); }, remove(k) { classes.delete(k); },
        contains(k) { return classes.has(k); }, toggle(k, v) { v ? classes.add(k) : classes.delete(k); } },
      hasAttribute(k) { return Object.hasOwn(attrs, k); }, getAttribute(k) { return attrs[k] || null; },
      setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
      toggleAttribute(k, v) { v ? attrs[k] = '' : delete attrs[k]; },
      querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
    };
  }
  const root = element(); const stage = element();
  stage.clientHeight = height; stage.clientWidth = 1200;
  const main = element();
  const names = ['home', 'featured', 'research', 'design', 'news', 'experience', 'contact'];
  const headings = names.map(id => ({ id: id + '-heading', textContent: id, offsetTop: 0, offsetHeight: 40 }));
  const blocks = names.map((id, index) => {
    const block = element(id); block.attrs['aria-labelledby'] = headings[index].id;
    block.querySelector = selector => selector === ':scope > h1' ? headings[index] : null;
    block.querySelectorAll = selector => selector === '[id]' ? [headings[index]] : [];
    return block;
  });
  blocks.at(-1).attrs['data-home-contact'] = '';
  const context = {
    document: {
      documentElement: root,
      querySelector(selector) { return ({ main, '.block-stage': stage, '[data-home-contact]': blocks.at(-1) })[selector] || null; },
      querySelectorAll(selector) { return selector === '.layout-block' ? blocks : []; },
      getElementById(id) { return headings.find(h => h.id === id) || null; }
    },
    location: { href: 'https://ciel761.github.io/Portfolio2027/' + hash, hash },
    history: { scrollRestoration: 'auto', replaceState() {}, pushState() {} },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    innerHeight: height, innerWidth: 1200, scrollY: restoredScroll,
    getComputedStyle: () => ({ getPropertyValue: key => ({
      '--block-height': '250', '--transition-height': '50', '--block-entrance-height': '125'
    })[key] || '' }),
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout() { return 1; }, clearTimeout() {},
    ResizeObserver: class { constructor(callback) { observers.push(callback); } observe() {} }
  };
  main.getBoundingClientRect = () => ({ top: -context.scrollY });
  context.scrollTo = ({ top }) => { context.scrollY = top; };
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, `
    globalThis.testing = { measure, render, timelineState, blockStart };
  })();`), context);
  function fire(name, event = {}) { (listeners.get(name) || []).forEach(fn => fn(event)); }
  function flush() { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(1000)); }
  const active = () => blocks.find(block => block.attrs['aria-hidden'] === 'false')?.id;
  return { context, root, stage, blocks, api: context.testing, active, fire, flush, observers };
}

let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }

test('fresh URL starts on Home even with an old Contact scroll offset', () => {
  const h = harness({ restoredScroll: 9600 }); h.flush();
  assert.equal(h.context.scrollY, 0); assert.equal(h.active(), 'home');
});

test('late Safari scroll restoration is reconciled at pageshow', () => {
  const h = harness(); h.flush(); h.context.scrollY = 9600;
  h.fire('scroll'); h.flush(); assert.equal(h.active(), 'contact');
  h.fire('pageshow', { persisted: false }); h.flush();
  assert.equal(h.context.scrollY, 0); assert.equal(h.active(), 'home');
});

for (const hash of ['#contact', '#home', '#research']) {
  test(`explicit ${hash} link is respected`, () => {
    const h = harness({ hash }); h.flush();
    assert.equal(h.active(), hash.slice(1));
  });
}

test('late pageshow does not move a reader who already started scrolling', () => {
  const h = harness(); h.flush(); h.fire('wheel');
  h.context.scrollY = h.api.blockStart(2); h.fire('scroll'); h.flush();
  h.fire('pageshow', { persisted: false }); h.flush();
  assert.equal(h.active(), 'research');
});

test('back-forward cache restores the prior reading position', () => {
  const h = harness(); h.flush(); h.context.scrollY = h.api.blockStart(3);
  h.fire('scroll'); h.flush(); h.fire('pagehide'); h.context.scrollY = 0;
  h.fire('pageshow', { persisted: true });
  assert.equal(h.active(), 'design'); assert.equal(h.context.scrollY, h.api.blockStart(3));
});

test('zero initial viewport does not enable an invalid timeline or select Contact', () => {
  const h = harness({ height: 0 }); h.flush();
  assert.equal(h.root.classList.contains('block-layout'), false);
  assert.equal(h.api.timelineState(0).index, 0);
  h.stage.clientHeight = 800; h.context.innerHeight = 800; h.api.measure();
  assert.equal(h.active(), 'home');
});

test('nonfinite scroll measurements never select the terminal section', () => {
  const h = harness(); assert.equal(h.api.timelineState(NaN).index, 0);
});

test('scrolling and history navigation still reach other sections', () => {
  const h = harness(); h.flush();
  h.context.scrollY = h.api.blockStart(4); h.fire('scroll'); h.flush(); assert.equal(h.active(), 'news');
  h.context.location.hash = '#home'; h.fire('popstate'); assert.equal(h.active(), 'home');
});

test('reduced-motion startup still displays Home', () => {
  const h = harness({ reduced: true, restoredScroll: 9600 }); h.flush(); assert.equal(h.active(), 'home');
});

console.log(`${passed} homepage startup checks passed.`);
module.exports = { passed };
