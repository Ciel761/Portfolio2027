(() => {
  'use strict';

  const root = document.documentElement;
  const overlay = document.querySelector('.site-overlay');
  if (!overlay) return;

  const rapidScrollThreshold = 12;
  const rapidScrollHold = 600;
  const focusTargets = [...overlay.querySelectorAll([
    '.overlay-nav',
    '.overlay-nav a',
    '.overlay-name',
    '.overlay-info > *',
    '.overlay-footer > *',
    '.project-overlay-home'
  ].join(','))];
  const hoveredTargets = new Set();
  const focusedTargets = new Set();
  let lastScrollPosition = scrollY;
  let lastScrollTime = performance.now();
  let rapidScrollTimer = 0;
  let rapidlyScrolling = false;

  function currentNavItemIsHovered() {
    const currentNavItem = overlay.querySelector('.overlay-nav a[aria-current]');
    return Boolean(currentNavItem && currentNavItem.matches(':hover'));
  }

  function updateFocusState() {
    const currentNavHover = currentNavItemIsHovered();
    const focusOverlay = !currentNavHover && (
      rapidlyScrolling
      || hoveredTargets.size > 0
      || focusedTargets.size > 0
    );
    root.classList.toggle('focus-on-overlay', focusOverlay);
    root.classList.toggle('focus-on-content', !focusOverlay);
  }

  function finishRapidScroll() {
    rapidScrollTimer = 0;
    rapidlyScrolling = false;
    updateFocusState();
  }

  function handleScroll() {
    const now = performance.now();
    const elapsed = Math.max(1, now - lastScrollTime);
    const distance = Math.abs(scrollY - lastScrollPosition);
    const velocity = distance / elapsed;
    lastScrollPosition = scrollY;
    lastScrollTime = now;

    if (velocity < rapidScrollThreshold) return;
    rapidlyScrolling = true;
    updateFocusState();
    clearTimeout(rapidScrollTimer);
    rapidScrollTimer = setTimeout(finishRapidScroll, rapidScrollHold);
  }

  focusTargets.forEach(target => {
    target.addEventListener('pointerenter', () => {
      hoveredTargets.add(target);
      updateFocusState();
    });
    target.addEventListener('pointerleave', () => {
      hoveredTargets.delete(target);
      updateFocusState();
    });
    target.addEventListener('focusin', () => {
      focusedTargets.add(target);
      updateFocusState();
    });
    target.addEventListener('focusout', () => {
      focusedTargets.delete(target);
      updateFocusState();
    });
  });

  overlay.addEventListener('click', event => {
    if (event.detail === 0) return;

    const interactiveTarget = event.target.closest(
      'a, button, input, select, textarea, [tabindex]'
    );
    if (interactiveTarget && overlay.contains(interactiveTarget)) {
      interactiveTarget.blur();
    }
  });

  const nav = overlay.querySelector('.overlay-nav');
  if (nav) {
    new MutationObserver(updateFocusState).observe(nav, {
      attributes: true,
      attributeFilter: ['aria-current'],
      subtree: true
    });
  }

  addEventListener('scroll', handleScroll, { passive: true });
  updateFocusState();
})();
