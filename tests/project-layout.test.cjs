// Run with: node tests/project-layout.test.cjs
// Executes the production timeline with a controlled clock and DOM geometry.
// Browser rendering and real input-device behavior still require visual QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../project-page.js'), 'utf8');

function harness({ viewport = 1000, methodsHeight = 1600, reduced = false, gap = 10, withOverview = false, cinematic = true } = {}) {
  let now = 0;
  let id = 0;
  const timers = new Map();
  const frames = new Map();
  const listeners = new Map();
  const scrolls = [];
  function element(attrs = {}) {
    return {
      attrs: { ...attrs }, dataset: {}, children: [], offsetHeight: viewport, marginTop: 0,
      style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
      hasAttribute(key) { return Object.hasOwn(this.attrs, key); },
      toggleAttribute(key, value) { if (value) this.attrs[key] = ''; else delete this.attrs[key]; },
      setAttribute(key, value) { this.attrs[key] = value; },
      getBoundingClientRect() { return { top: 0, bottom: this.offsetHeight }; },
      querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
    };
  }
  const root = element(); root.classList = { toggle() {} };
  const stage = element(); stage.clientHeight = viewport;
  const title = element();
  const opening = element({ 'data-project-content-height': '' });
  opening.id = 'project-opening'; opening.offsetHeight = 300; opening.children = [title];
  title.offsetHeight = 240; opening.querySelector = () => title;
  const overview = element({ 'data-project-content-height': '' });
  overview.id = 'project-overview'; overview.dataset.projectPart = 'overview';
  overview.offsetHeight = viewport * 1.8; overview.marginTop = viewport * 0.1;
  const abstract = element(); abstract.offsetHeight = overview.offsetHeight - 50; overview.children = [abstract];
  const intro = element({ 'data-project-intro': '', 'data-project-dark': '' });
  intro.dataset = { projectPart: 'section-three', projectHold: '900' };
  const methods = element({ 'data-project-content-height': '' });
  methods.id = 'project-section-four';
  methods.dataset.projectPart = 'section-four';
  methods.offsetHeight = methodsHeight;
  methods.marginTop = viewport * 0.1;
  const heading = element(); heading.offsetHeight = 80;
  const content = element();
  content.getBoundingClientRect = () => ({ top: 100, bottom: methods.offsetHeight - 50 });
  methods.children = [heading, content];
  const next = element({ 'data-project-content-height': '' }); next.id = 'project-section-five';
  next.dataset.projectPart = 'section-five'; next.offsetHeight = viewport * 0.85;
  next.marginTop = viewport * 0.1; next.children = [heading];
  const regular = [...(withOverview ? [overview] : []), ...(cinematic ? [intro] : []), methods, next];
  const page = element();
  const context = {
    document: { documentElement: root, querySelector: () => page, querySelectorAll: () => [] },
    location: { href: 'http://localhost/research/example.html', hash: '' },
    history: { replaceState() {}, pushState() {} },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    performance: { now: () => now }, scrollY: 0, innerHeight: viewport,
    getComputedStyle(el) {
      return {
        display: 'block', position: 'static', marginTop: `${el.marginTop}px`,
        getPropertyValue(key) {
          return {
            '--project-opening-height': '140', '--project-block-transition-height': '50',
            '--project-block-scroll-padding': '50', '--project-section-gap': String(gap),
            '--project-section-snap-delay': '500'
          }[key] || '';
        }
      };
    },
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    ResizeObserver: class { observe() {} },
    setTimeout(callback, delay) { timers.set(++id, { callback, due: now + delay }); return id; },
    clearTimeout(key) { timers.delete(key); },
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(key) { frames.delete(key); }
  };
  function fire(name, event = {}) {
    for (const callback of listeners.get(name) || []) callback(event);
  }
  context.scrollTo = ({ top }) => { context.scrollY = top; scrolls.push(top); fire('scroll'); };
  page.querySelector = selector => ({
    '.project-page-stage': stage, '[data-project-opening]': opening, '[data-project-intro]': cinematic ? intro : null
  })[selector] || null;
  page.querySelectorAll = () => regular;
  page.getBoundingClientRect = () => ({ top: -context.scrollY });
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, `
    globalThis.testing = { measure, render, navigateTo, blockPosition, blockHold,
      get transitionTravel() { return transitionTravel; } };
  })();`), context);
  function advance(milliseconds) {
    const end = now + milliseconds;
    while (now < end) {
      now = Math.min(end, now + 10);
      for (const [key, timer] of [...timers]) {
        if (timer.due <= now && timers.delete(key)) timer.callback();
      }
      const batch = [...frames]; frames.clear();
      for (const [, callback] of batch) callback(now);
    }
  }
  function scroll(top) { context.scrollY = top; fire('scroll'); }
  return { api: context.testing, context, opening, overview, intro, methods, next, scrolls, fire, advance, scroll };
}

let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }
function transition(h, index, progress) {
  const start = h.api.blockPosition(index) + h.api.blockHold(index);
  const end = h.api.blockPosition(index + 1);
  return { start, end, position: start + (end - start) * progress };
}

for (const progress of [0.25, 0.5, 0.75]) {
  test(`500ms pause settles transition at ${progress} to nearest boundary`, () => {
    const h = harness(); const t = transition(h, 2, progress); h.scroll(t.position);
    h.advance(499); assert.equal(h.scrolls.length, 0);
    h.advance(1); assert.equal(h.scrolls.length, 1, 'Snap begins after exactly 500ms');
    h.advance(600); assert.equal(h.context.scrollY, progress < 0.5 ? t.start : t.end);
    const completed = h.scrolls.length; h.advance(1200);
    assert.equal(h.scrolls.length, completed, 'Snap must not loop after completing');
  });
}

test('new scrolling restarts the idle countdown', () => {
  const h = harness(); const t = transition(h, 2, 0.3); h.scroll(t.position); h.advance(400);
  h.scroll(t.position + 10); h.advance(499); assert.equal(h.scrolls.length, 0);
  h.advance(1); assert.equal(h.scrolls.length, 1);
});

for (const kind of ['reading', 'cinematic', 'opening', 'boundary']) {
  test(`no snap during ${kind}`, () => {
    const h = harness(); const positions = {
      reading: h.api.blockPosition(2) + 700,
      cinematic: h.api.blockPosition(1) + 3000,
      opening: 20, boundary: transition(h, 2, 0).start
    };
    h.scroll(positions[kind]); h.advance(2000); assert.equal(h.scrolls.length, 0);
  });
}

for (const input of ['wheel', 'keydown', 'pointerdown', 'touchstart']) {
  test(`${input} cancels an active snap`, () => {
    const h = harness(); h.scroll(transition(h, 2, 0.7).position); h.advance(600);
    assert.ok(h.scrolls.length > 1); h.fire(input); const stoppedAt = h.context.scrollY;
    h.advance(1000); assert.equal(h.context.scrollY, stoppedAt);
  });
}

test('finger contact delays snapping until release and momentum stops', () => {
  const h = harness(); h.fire('pointerdown'); h.fire('touchstart');
  const t = transition(h, 2, 0.6); h.scroll(t.position); h.advance(2000);
  assert.equal(h.scrolls.length, 0); h.fire('pointerup'); h.advance(600);
  assert.equal(h.scrolls.length, 0); h.fire('touchend', { touches: [] }); h.advance(200);
  h.scroll(t.position + 10); h.advance(499); assert.equal(h.scrolls.length, 0);
  h.advance(700); assert.equal(h.context.scrollY, t.end);
});

test('reduced motion settles immediately after the idle delay', () => {
  const h = harness({ reduced: true }); const t = transition(h, 2, 0.7);
  h.scroll(t.position); h.advance(499); assert.equal(h.scrolls.length, 0);
  h.advance(1); assert.equal(h.context.scrollY, t.end);
});

test('explicit navigation is not interrupted by the idle timer', () => {
  const h = harness(); h.api.navigateTo('section-five'); h.advance(4000);
  assert.equal(h.context.scrollY, h.api.blockPosition(3));
  const completed = h.scrolls.length; h.advance(1200); assert.equal(h.scrolls.length, completed);
});

for (const [viewport, methodsHeight] of [[1000, 600], [1000, 1600], [640, 2100]]) {
  test(`gap and content reachability at viewport ${viewport}, content ${methodsHeight}`, () => {
    const h = harness({ viewport, methodsHeight });
    h.api.navigateTo('section-four', 'auto');
    const end = transition(h, 2, 0).start; h.context.scrollY = end; h.api.render();
    const contentShift = parseFloat(h.methods.style.values['--project-content-offset']);
    const bottom = h.methods.marginTop + h.methods.offsetHeight - contentShift;
    assert.ok(bottom <= viewport, 'Content bottom is reachable before the transition');
    h.context.scrollY = transition(h, 2, 0.5).position; h.api.render();
    const outgoingBottom = bottom + parseFloat(h.methods.style.values['--project-block-offset']);
    const incomingTop = h.next.marginTop + parseFloat(h.next.style.values['--project-block-offset']);
    assert.ok(incomingTop - outgoingBottom >= viewport * 0.1 - 0.01);
    h.methods.offsetHeight += 400; h.api.measure();
    assert.ok(h.api.transitionTravel[2] >= viewport - h.next.marginTop);
    h.context.scrollY = transition(h, 2, 0).start; h.api.render();
    assert.ok(h.methods.marginTop + h.methods.offsetHeight
      - parseFloat(h.methods.style.values['--project-content-offset']) <= viewport);
    assert.equal(h.intro.dataset.projectHold, '900', 'Cinematic hold remains unchanged');
  });
}

test('zero gap still positions content-sized sections correctly', () => {
  const h = harness({ gap: 0 }); h.api.navigateTo('section-five', 'auto');
  assert.equal(h.next.style.values['--project-block-offset'], '0px');
});

for (const cinematic of [false, true]) {
  test(`title and overview are independent content-sized sections, cinematic=${cinematic}`, () => {
    const h = harness({ withOverview: true, cinematic });
    h.api.navigateTo('opening', 'auto'); assert.equal(h.context.scrollY, 0);
    assert.equal(h.opening.attrs['aria-hidden'], 'false');
    h.api.navigateTo('overview', 'auto');
    assert.equal(h.context.scrollY, h.api.blockPosition(1));
    assert.equal(h.overview.attrs['aria-hidden'], 'false');
    h.context.scrollY = transition(h, 1, 0).start; h.api.render();
    assert.ok(h.overview.offsetHeight + h.overview.marginTop
      - parseFloat(h.overview.style.values['--project-content-offset']) <= 1000);
    const t = transition(h, 0, 0.75); h.scroll(t.position); h.advance(1200);
    assert.equal(h.context.scrollY, t.end, 'Title-to-overview transition snaps');
    h.opening.offsetHeight = 1600; h.api.measure();
    h.context.scrollY = transition(h, 0, 0).start; h.api.render();
    assert.ok(h.opening.offsetHeight
      - parseFloat(h.opening.style.values['--project-content-offset']) <= 1000);
  });
}

test('late image or font growth above the reader preserves their section and place', () => {
  const h = harness({ withOverview: true, cinematic: false });
  h.api.navigateTo('section-four', 'auto');
  h.context.scrollY += 200; h.api.render();
  const previousPosition = h.context.scrollY;
  h.opening.children[0].offsetHeight += 500; h.opening.offsetHeight += 500;
  h.api.measure();
  assert.equal(h.context.scrollY, previousPosition + 500);
  assert.equal(h.methods.attrs['aria-hidden'], 'false');
});

test('image growth during a transition preserves its progress', () => {
  const h = harness({ withOverview: true, cinematic: false });
  h.context.scrollY = transition(h, 2, 0.3).position; h.api.render();
  h.opening.children[0].offsetHeight += 500; h.opening.offsetHeight += 500;
  h.api.measure();
  assert.equal(h.context.scrollY, transition(h, 2, 0.3).position);
});

console.log(`${passed} timeline checks passed.`);
module.exports = { passed };
