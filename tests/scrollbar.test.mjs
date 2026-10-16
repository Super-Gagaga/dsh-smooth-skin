import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/scrollbar.js', import.meta.url), 'utf8');
const property = '--smooth-scrollbar-inset';

function runtime({ reduced = false, animated = true } = {}) {
  const listeners = new Map();
  const timers = new Map();
  let now = 0;
  let nextTimer = 0;
  const document = {
    addEventListener: (name, fn, options) => { assert.equal(options.capture, true); assert.equal(options.passive, true); listeners.set(name, fn); },
    removeEventListener: (name, fn, capture) => { assert.equal(listeners.get(name), fn); assert.equal(capture, true); listeners.delete(name); },
  };
  const window = {
    matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    getComputedStyle: element => ({ overflowY: 'auto', overflowX: 'auto', direction: 'ltr', ...element.computed,
      getPropertyValue: () => element.animations.findLast(a => a.active)?.current || element.style.getPropertyValue(property) || '3px' }),
  };
  const sandbox = { window, document };
  runInNewContext(source + '\nglobalThis.install = installScrollbarMotion;', sandbox);
  const motion = sandbox.install();
  const element = (original = '', priority = '') => {
    const values = new Map(original ? [[property, original]] : []);
    const priorities = new Map(original ? [[property, priority]] : []);
    const node = {
      offsetWidth: 108, offsetHeight: 200, clientWidth: 100, clientHeight: 200,
      clientLeft: 0, clientTop: 0, scrollWidth: 100, scrollHeight: 1000,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 108, height: 200 }),
      animations: [],
      style: {
        getPropertyValue: key => values.get(key) || '',
        getPropertyPriority: key => priorities.get(key) || '',
        setProperty: (key, value, level = '') => { values.set(key, value); priorities.set(key, level); },
        removeProperty: key => { values.delete(key); priorities.delete(key); },
      },
    };
    if (animated) node.animate = (frames, options) => {
      const animation = {
        frames, options, current: frames[0][property], active: true,
        cancel() { this.active = false; this.cancelled = true; },
        finish() { this.active = false; this.onfinish?.(); },
      };
      node.animations.push(animation);
      return animation;
    };
    return node;
  };
  const advance = delay => {
    now += delay;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
  };
  motion.setEnabled(true);
  return { motion, element, advance, timers, listeners, document, scroll: target => listeners.get('scroll')({ target }),
    move: (path, clientX, clientY) => listeners.get('pointermove')({ composedPath: () => path, clientX, clientY, pointerType: 'mouse' }),
    leave: () => listeners.get('pointerout')({ relatedTarget: null }) };
}

test('hover uses the scrolling animation and remains thick until both hover and scrolling end', () => {
  const r = runtime();
  const node = r.element();
  r.move([node], 115, 30);
  const grow = node.animations[0];
  assert.equal(grow.frames[0][property], '3px');
  assert.equal(grow.frames[1][property], '1px');
  assert.equal(grow.options.duration, 160);
  grow.finish();
  r.move([node], 115, 40);
  r.scroll(node);
  r.advance(650);
  assert.equal(node.animations.length, 1, 'idle scrolling must not shrink a hovered scrollbar');
  r.move([node], 50, 40);
  const shrink = node.animations[1];
  assert.equal(shrink.options.duration, 280);
  shrink.current = '2.2px';
  r.move([node], 115, 40);
  assert.equal(node.animations[2].frames[0][property], '2.2px');
  assert.equal(shrink.cancelled, true);
  r.scroll(node);
  r.leave();
  assert.equal(node.animations.length, 3, 'leaving during scroll waits for the idle deadline');
  r.advance(650);
  node.animations[3].finish();
  assert.equal(node.style.getPropertyValue(property), '');
  r.motion.dispose();
  assert.equal(r.listeners.size, 0);
});

test('content and hidden scrollbars do not trigger hover; nested, horizontal and RTL gutters do', () => {
  const r = runtime();
  const outer = r.element();
  const inner = r.element();
  r.move([inner, outer], 50, 30);
  assert.equal(inner.animations.length, 0);
  inner.computed = { scrollbarWidth: 'none' };
  r.move([inner, outer], 115, 30);
  assert.equal(inner.animations.length, 0);
  assert.equal(outer.animations.length, 1);
  outer.animations[0].finish();
  r.leave();
  outer.animations[1].finish();
  inner.computed = { direction: 'rtl' };
  inner.clientLeft = 8;
  r.move([inner], 14, 30);
  assert.equal(inner.animations.length, 1);
  inner.animations[0].finish();
  r.leave();
  inner.animations[1].finish();
  inner.computed = {};
  inner.clientLeft = 0;
  inner.scrollHeight = inner.clientHeight;
  inner.clientHeight = 192;
  inner.scrollHeight = 192;
  inner.scrollWidth = 500;
  r.move([inner], 40, 216);
  assert.equal(inner.animations.length, 3);
  r.motion.dispose();
});

test('actual scrolling grows the thumb once; idle scrolling shrinks and releases its styles', () => {
  const r = runtime();
  const node = r.element();
  r.scroll(node);
  const grow = node.animations[0];
  assert.equal(grow.frames[0][property], '3px');
  assert.equal(grow.frames[1][property], '1px');
  assert.equal(grow.options.duration, 160);
  grow.finish();
  r.advance(400);
  r.scroll(node);
  assert.equal(node.animations.length, 1, 'continuous scroll must not restart growth');
  r.advance(649);
  assert.equal(node.animations.length, 1, 'each scroll postpones shrinking');
  r.advance(1);
  const shrink = node.animations[1];
  assert.equal(shrink.frames[0][property], '1px');
  assert.equal(shrink.frames[1][property], '3px');
  assert.equal(shrink.options.duration, 280);
  shrink.finish();
  assert.equal(node.style.getPropertyValue(property), '');
  assert.equal(r.timers.size, 0);
  r.motion.dispose();
});

test('scrolling during shrink reverses smoothly from the current visible thickness', () => {
  const r = runtime();
  const node = r.element();
  r.scroll(node);
  node.animations[0].finish();
  r.advance(650);
  const shrink = node.animations[1];
  shrink.current = '2.2px';
  r.scroll(node);
  const grow = node.animations[2];
  assert.equal(shrink.cancelled, true);
  assert.equal(grow.frames[0][property], '2.2px');
  assert.equal(grow.frames[1][property], '1px');
  shrink.finish();
  assert.equal(node.style.getPropertyValue(property), '1px', 'a stale finish must not clear the resumed animation');
  r.motion.dispose();
  assert.equal(grow.cancelled, true);
  assert.equal(node.style.getPropertyValue(property), '');
  assert.equal(r.timers.size, 0);
});

test('nested and document scrollers are independent and disabling restores original styles', () => {
  const r = runtime();
  const first = r.element('2.5px', 'important');
  const second = r.element();
  r.document.scrollingElement = second;
  r.scroll(first);
  r.advance(300);
  r.scroll(r.document);
  r.advance(350);
  assert.equal(first.animations.length, 2);
  assert.equal(second.animations.length, 1, 'another container keeps its own idle deadline');
  r.motion.setEnabled(false);
  r.motion.dispose();
  assert.equal(r.listeners.size, 0);
  assert.equal(r.timers.size, 0);
  assert.equal(first.style.getPropertyValue(property), '2.5px');
  assert.equal(first.style.getPropertyPriority(property), 'important');
  assert.equal(second.style.getPropertyValue(property), '');
  assert.ok([...first.animations, ...second.animations].every(a => a.cancelled));
});

test('reduced motion and engines without animate keep functional native scrollbars', () => {
  for (const options of [{ reduced: true }, { animated: false }]) {
    const r = runtime(options);
    const node = r.element();
    r.scroll(node);
    assert.equal(node.style.getPropertyValue(property), '1px');
    assert.equal(node.animations.length, 0);
    r.advance(650);
    assert.equal(node.style.getPropertyValue(property), '');
    r.move([node], 115, 30);
    assert.equal(node.style.getPropertyValue(property), '1px');
    r.leave();
    assert.equal(node.style.getPropertyValue(property), '');
    r.motion.dispose();
    assert.equal(r.timers.size, 0);
  }
});
