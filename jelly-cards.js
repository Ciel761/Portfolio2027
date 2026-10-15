(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const selectors = [
    '.layout-block[aria-labelledby="research"] .card',
    '.layout-block[aria-labelledby="design"] .card',
    '.theme-project-card',
    '.related-card'
  ];
  const cards = [...document.querySelectorAll(selectors.join(','))]
    .filter(card => card.querySelector('a'));
  if (!cards.length) return;

  const restingTransform = () => ({
    x: 0,
    y: 0,
    rotate: 0,
    skew: 0,
    scaleX: 1,
    scaleY: 1
  });
  const zeroVelocity = () => ({
    x: 0,
    y: 0,
    rotate: 0,
    skew: 0,
    scaleX: 0,
    scaleY: 0
  });
  const states = new Map();
  let frame = 0;

  function render(card, value) {
    card.style.setProperty(
      '--jelly-transform',
      `translate3d(${value.x.toFixed(3)}px, ${value.y.toFixed(3)}px, 0) `
        + `rotate(${value.rotate.toFixed(3)}deg) skew(${value.skew.toFixed(3)}deg) `
        + `scale(${value.scaleX.toFixed(4)}, ${value.scaleY.toFixed(4)})`
    );
  }

  function atRest(state) {
    return Object.keys(state.value).every(key => (
      Math.abs(state.value[key] - state.target[key]) < 0.001
      && Math.abs(state.velocity[key]) < 0.001
    ));
  }

  function tick() {
    frame = 0;
    let moving = false;
    states.forEach((state, card) => {
      Object.keys(state.value).forEach(key => {
        const displacement = state.target[key] - state.value[key];
        state.velocity[key] = (state.velocity[key] + displacement * 0.16) * 0.72;
        state.value[key] += state.velocity[key];
      });
      render(card, state.value);
      moving ||= !atRest(state);
    });
    if (moving) frame = requestAnimationFrame(tick);
  }

  function animate() {
    if (!frame && !reduced.matches) frame = requestAnimationFrame(tick);
  }

  function reset(card, immediate = false) {
    const state = states.get(card);
    if (!state) return;
    state.hovering = false;
    state.target = restingTransform();
    if (immediate || reduced.matches) {
      state.value = restingTransform();
      state.velocity = zeroVelocity();
      render(card, state.value);
      return;
    }
    animate();
  }

  function aimAtPointer(card, event) {
    if (reduced.matches) return;
    const state = states.get(card);
    const bounds = card.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const ny = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.hovering = true;
    state.target.x = nx * 3.5;
    state.target.y = ny * 3.5;
    state.target.rotate = nx * 1.8;
    state.target.skew = -ny * 2.5;
    state.target.scaleX = 1 + Math.abs(nx) * 0.018 - Math.abs(ny) * 0.008;
    state.target.scaleY = 1 + Math.abs(ny) * 0.018 - Math.abs(nx) * 0.008;
    state.velocity.x += Math.max(-2.5, Math.min(2.5, dx * 0.08));
    state.velocity.y += Math.max(-2.5, Math.min(2.5, dy * 0.08));
    state.velocity.rotate += Math.max(-1.2, Math.min(1.2, dx * 0.025));
    animate();
  }

  function press(card, event) {
    if (reduced.matches) return;
    const state = states.get(card);
    aimAtPointer(card, event);
    state.target.scaleX += 0.075;
    state.target.scaleY -= 0.085;
    state.velocity.x += state.target.x * 0.32;
    state.velocity.y += state.target.y * 0.32;
    state.velocity.rotate += state.target.rotate * 0.45;
    state.velocity.skew += state.target.skew * 0.35;
    animate();
  }

  function release(card) {
    if (reduced.matches) return;
    const state = states.get(card);
    state.target.scaleX = state.hovering ? 1.015 : 1;
    state.target.scaleY = state.hovering ? 1.015 : 1;
    state.velocity.scaleX -= 0.065;
    state.velocity.scaleY += 0.09;
    state.velocity.rotate *= -0.8;
    state.velocity.skew *= -0.7;
    animate();
  }

  cards.forEach(card => {
    const state = {
      value: restingTransform(),
      target: restingTransform(),
      velocity: zeroVelocity(),
      hovering: false,
      lastX: 0,
      lastY: 0
    };
    states.set(card, state);
    render(card, state.value);
    card.addEventListener('pointerenter', event => {
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      aimAtPointer(card, event);
      state.velocity.scaleX += 0.025;
      state.velocity.scaleY -= 0.02;
      animate();
    });
    card.addEventListener('pointermove', event => aimAtPointer(card, event));
    card.addEventListener('pointerleave', () => reset(card));
    card.addEventListener('pointerdown', event => press(card, event));
    card.addEventListener('pointerup', () => release(card));
    card.addEventListener('pointercancel', () => reset(card));
    card.addEventListener('click', event => {
      if (reduced.matches) return;
      state.velocity.x += state.target.x >= 0 ? -2.4 : 2.4;
      state.velocity.rotate += state.target.rotate >= 0 ? -1.6 : 1.6;
      state.velocity.skew += state.target.skew >= 0 ? -1.8 : 1.8;
      state.velocity.scaleX += 0.055;
      state.velocity.scaleY -= 0.055;
      animate();
      const link = event.target.closest('a[href]');
      const modified = event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (!link || modified || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      event.preventDefault();
      clearTimeout(state.navigationTimer);
      state.navigationTimer = setTimeout(() => { location.href = link.href; }, 160);
    });
  });

  reduced.addEventListener('change', () => {
    if (reduced.matches && frame) cancelAnimationFrame(frame);
    frame = 0;
    cards.forEach(card => reset(card, true));
  });
})();
