/** Animate only the scroller that moved. The native gutter stays 8px wide,
 * so changing thumb thickness cannot reflow the page or move the drag target. */
function installScrollbarMotion() {
  const property = '--smooth-scrollbar-inset';
  const scrollers = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let enabled = false;
  let hovered;

  function stateFor(element) {
    let state = scrollers.get(element);
    if (!state) {
      state = { element, original: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property), scrolling: false };
      scrollers.set(element, state);
    }
    return state;
  }

  function restore(state) {
    window.clearTimeout(state.timer);
    state.animation?.cancel();
    if (state.original) state.element.style.setProperty(property, state.original, state.priority);
    else state.element.style.removeProperty(property);
    scrollers.delete(state.element);
    if (hovered === state) hovered = undefined;
  }

  function transition(state, value, duration, complete) {
    // Read the current animated value before cancelling, allowing an immediate
    // reversal if scrolling resumes while the thumb is becoming thin.
    const current = window.getComputedStyle(state.element).getPropertyValue(property).trim() || '3px';
    state.animation?.cancel();
    state.animation = undefined;
    state.element.style.setProperty(property, value);
    if (reducedMotion?.matches || !state.element.animate || current === value) { complete?.(); return; }
    try {
      const animation = state.element.animate([{ [property]: current }, { [property]: value }], {
        duration, easing: 'cubic-bezier(.2,0,0,1)',
      });
      state.animation = animation;
      animation.onfinish = () => {
        if (state.animation !== animation) return;
        state.animation = undefined;
        complete?.();
      };
    } catch {
      // Keep usable native scrollbars on engines without custom-property animation.
      complete?.();
    }
  }

  function shrink(state) {
    transition(state, '3px', 280, () => restore(state));
  }

  function hover(element) {
    if (hovered?.element === element) return;
    const previous = hovered;
    hovered = element ? stateFor(element) : undefined;
    if (previous && !previous.scrolling) shrink(previous);
    if (hovered && !hovered.scrolling) transition(hovered, '1px', 160);
  }

  function onPointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    // Native scrollbar parts are not DOM nodes. Locate their fixed gutter in
    // the event path; never activate merely because the content is hovered.
    for (const element of event.composedPath()) {
      if (!element?.style || !element.getBoundingClientRect || !element.offsetWidth || !element.offsetHeight) continue;
      const vertical = element.scrollHeight > element.clientHeight;
      const horizontal = element.scrollWidth > element.clientWidth;
      if (!vertical && !horizontal) continue;
      const style = window.getComputedStyle(element);
      if (style.scrollbarWidth === 'none') continue;
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) * element.offsetWidth / rect.width;
      const y = (event.clientY - rect.top) * element.offsetHeight / rect.height;
      const left = element.clientLeft;
      const top = element.clientTop;
      const right = left + element.clientWidth;
      const bottom = top + element.clientHeight;
      const verticalGutter = vertical && /^(auto|scroll)$/.test(style.overflowY) && y >= top && y < bottom &&
        (style.direction === 'rtl' ? x >= left - 8 && x < left : x >= right && x < right + 8);
      const horizontalGutter = horizontal && /^(auto|scroll)$/.test(style.overflowX) && x >= left && x < right && y >= bottom && y < bottom + 8;
      if (verticalGutter || horizontalGutter) { hover(element); return; }
    }
    hover(undefined);
  }

  function onPointerOut(event) {
    if (!event.relatedTarget) hover(undefined);
  }

  function onScroll(event) {
    const element = event.target === document || event.target === window ? document.scrollingElement : event.target;
    if (!element?.style) return;
    const state = stateFor(element);
    window.clearTimeout(state.timer);
    if (!state.scrolling) {
      state.scrolling = true;
      if (hovered !== state) transition(state, '1px', 160);
    }
    state.timer = window.setTimeout(() => {
      state.scrolling = false;
      if (hovered !== state) shrink(state);
    }, 650);
  }

  function setEnabled(value) {
    if (enabled === value) return;
    enabled = value;
    if (enabled) {
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
      document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
      document.addEventListener('pointerout', onPointerOut, { capture: true, passive: true });
    }
    else {
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      for (const state of scrollers.values()) restore(state);
    }
  }
  return { setEnabled, dispose: () => setEnabled(false) };
}
