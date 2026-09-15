(() => {
  'use strict';

  const root = document.documentElement;
  const page = document.querySelector('[data-project-page]');
  const stage = page?.querySelector('.project-page-stage');
  const openingBlock = page?.querySelector('[data-project-opening]');
  const title = openingBlock?.querySelector('.project-title-section');
  const regularBlocks = [...(page?.querySelectorAll('.project-regular-block') || [])];
  const blocks = openingBlock ? [openingBlock, ...regularBlocks] : [];
  const relatedBlock = page?.querySelector('[data-project-related]');
  const relatedScenes = [...(relatedBlock?.querySelectorAll('[data-related-scene]') || [])];
  const navLinks = [...document.querySelectorAll('[data-project-nav]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!page || !stage || !openingBlock || !title || !regularBlocks.length) return;

  const initialUrl = location.href;
  const initialHash = location.hash;
  if (initialHash) history.replaceState(null, '', initialUrl.slice(0, -initialHash.length));

  let frame = 0;
  let navigationFrame = 0;
  let viewport = 0;
  let revealDistance = 0;
  let openingHold = 0;
  let blockTransition = 0;
  let blockScrollPadding = 0;
  let regularHolds = [];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function rootNumber(name, fallback) {
    const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function pageTop() {
    return scrollY + page.getBoundingClientRect().top;
  }

  function blockHold(index) {
    if (index === 0) return openingHold;
    const customHold = parseFloat(blocks[index]?.dataset.projectHold);
    return Number.isFinite(customHold)
      ? Math.max(0, customHold) * viewport / 100
      : regularHolds[index - 1] || blockScrollPadding * 2;
  }

  function contentHeight(block) {
    const content = [...block.children].filter(element => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.position !== 'absolute';
    });
    if (!content.length) return 0;
    const rects = content.map(element => element.getBoundingClientRect());
    const top = Math.min(...rects.map(rect => rect.top));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    return Math.max(0, bottom - top);
  }

  function maximumScroll() {
    return blocks.reduce((total, block, index) => total + blockHold(index), 0)
      + (blocks.length - 1) * blockTransition;
  }

  function measure() {
    viewport = stage.clientHeight || innerHeight;
    revealDistance = Math.max(0, rootNumber('--project-reveal-distance', 10)) * viewport / 100;
    openingHold = Math.max(0, rootNumber('--project-opening-height', 140) - 100) * viewport / 100;
    blockTransition = Math.max(0, rootNumber('--project-block-transition-height', 20)) * viewport / 100;
    blockScrollPadding = Math.max(0, rootNumber('--project-block-scroll-padding', 50)) * viewport / 100;
    regularHolds = regularBlocks.map(block => contentHeight(block) + blockScrollPadding * 2);
    page.style.setProperty('--project-page-height', `${viewport + maximumScroll()}px`);
    render();
  }

  function blockPosition(index) {
    let position = 0;
    for (let previous = 0; previous < index; previous += 1) {
      position += blockHold(previous) + blockTransition;
    }
    return position;
  }

  function timelineState(pageScroll) {
    let cursor = 0;
    for (let index = 0; index < blocks.length - 1; index += 1) {
      const transitionStart = cursor + blockHold(index);
      const transitionEnd = transitionStart + blockTransition;
      if (pageScroll < transitionStart) return { index, progress: 0 };
      if (pageScroll < transitionEnd) {
        const progress = blockTransition > 0
          ? clamp((pageScroll - transitionStart) / blockTransition, 0, 1)
          : 1;
        return { index, progress };
      }
      cursor = transitionEnd;
    }
    return { index: blocks.length - 1, progress: 0 };
  }

  function smoothstep(value) {
    const progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function cancelNavigation() {
    if (navigationFrame) cancelAnimationFrame(navigationFrame);
    navigationFrame = 0;
  }

  function animateNavigation(target) {
    cancelNavigation();
    const start = scrollY;
    const distance = target - start;
    const baseDuration = Math.max(0, rootNumber('--project-nav-duration', 550));
    const maxDuration = Math.max(baseDuration, rootNumber('--project-nav-max-duration', 3500));
    const viewportDistance = Math.abs(distance) / Math.max(1, viewport);
    const duration = clamp(baseDuration * Math.sqrt(Math.max(1, viewportDistance)), baseDuration, maxDuration);
    if (reduced.matches || duration === 0 || Math.abs(distance) < 0.5) {
      scrollTo({ top: target, behavior: 'auto' });
      render();
      return;
    }
    const startTime = performance.now();
    const tick = now => {
      const progress = clamp((now - startTime) / duration, 0, 1);
      scrollTo({ top: start + distance * smoothstep(progress), behavior: 'auto' });
      render();
      if (progress < 1) navigationFrame = requestAnimationFrame(tick);
      else navigationFrame = 0;
    };
    navigationFrame = requestAnimationFrame(tick);
  }

  function renderDocumentTheme(index, transitionProgress, activeIndex) {
    const isDark = block => Number(block?.hasAttribute('data-project-dark'));
    const currentDarkness = isDark(blocks[index]);
    const nextDarkness = index < blocks.length - 1 ? isDark(blocks[index + 1]) : currentDarkness;
    const darkness = reduced.matches
      ? isDark(blocks[activeIndex])
      : currentDarkness + (nextDarkness - currentDarkness) * smoothstep(transitionProgress);
    const backgroundChannel = Math.round(255 * (1 - darkness));
    const foregroundChannel = Math.round(255 * darkness);
    root.style.setProperty('--document-background', `rgb(${backgroundChannel} ${backgroundChannel} ${backgroundChannel})`);
    root.style.setProperty('--overlay-foreground', `rgb(${foregroundChannel} ${foregroundChannel} ${foregroundChannel})`);
  }

  function renderRelated(pageScroll) {
    if (!relatedBlock || !relatedScenes.length) return;
    const relatedIndex = blocks.indexOf(relatedBlock);
    const hold = blockHold(relatedIndex);
    const progress = hold > 0
      ? clamp((pageScroll - blockPosition(relatedIndex)) / hold, 0, 1)
      : 1;

    relatedBlock.querySelector('[data-related-carousel]')?.dispatchEvent(
      new CustomEvent('related-carousel-progress', { detail: { progress } })
    );

    relatedScenes.forEach(scene => {
      const start = parseFloat(scene.dataset.start) || 0;
      const end = parseFloat(scene.dataset.end) || 1;
      const persist = scene.hasAttribute('data-persist');
      let opacity;
      if (reduced.matches) {
        opacity = persist ? Number(progress >= start) : Number(progress >= start && progress < end);
      } else {
        const fadeIn = smoothstep((progress - start) / 0.12);
        const fadeOut = persist ? 1 : smoothstep((end - progress) / 0.12);
        opacity = Math.min(fadeIn, fadeOut);
      }
      scene.style.setProperty('--related-scene-opacity', opacity.toFixed(3));
      scene.style.setProperty('--related-scene-shift', `${((1 - opacity) * 8).toFixed(2)}vh`);
      scene.style.pointerEvents = opacity >= 0.5 ? 'auto' : 'none';
    });
  }

  relatedBlock?.addEventListener('related-carousel-seek', event => {
    const relatedIndex = blocks.indexOf(relatedBlock);
    if (relatedIndex < 0) return;
    const progress = clamp(event.detail?.progress || 0, 0, 1);
    const target = pageTop() + blockPosition(relatedIndex) + progress * blockHold(relatedIndex);
    scrollTo({ top: target, behavior: 'auto' });
    render();
  });

  function render() {
    frame = 0;
    const pageScroll = clamp(-page.getBoundingClientRect().top, 0, maximumScroll());
    const revealProgress = revealDistance > 0
      ? clamp(pageScroll / revealDistance, 0, 1)
      : 1;
    const { index, progress } = timelineState(pageScroll);
    const activeIndex = progress >= 0.5 ? index + 1 : index;
    renderDocumentTheme(index, progress, activeIndex);
    title.style.setProperty('--project-title-height', `${viewport * (1 - revealProgress * 0.4)}px`);
    title.style.setProperty('--project-title-bottom-padding', `${viewport * (0.3 - revealProgress * 0.25)}px`);

    blocks.forEach((block, blockIndex) => {
      let offset = blockIndex < index ? -100 : blockIndex > index ? 100 : 0;
      if (blockIndex === index) offset = -progress * 100;
      if (blockIndex === index + 1) offset = (1 - progress) * 100;
      if (reduced.matches) offset = blockIndex === activeIndex ? 0 : 100;
      const active = blockIndex === activeIndex;
      const visible = reduced.matches ? active : Math.abs(offset) < 100;
      block.style.setProperty('--project-block-offset', `${offset}%`);
      block.toggleAttribute('data-visible', visible);
      block.inert = !active;
      block.setAttribute('aria-hidden', String(!active));
    });
    renderRelated(pageScroll);

    const activeBlock = blocks[activeIndex];
    const relatedVisible = blocks[index] === relatedBlock
      || (progress > 0 && blocks[index + 1] === relatedBlock);
    root.toggleAttribute('data-project-related-active', relatedVisible);
    root.classList.toggle('overlay-always-clear', relatedVisible);
    const currentPart = activeIndex === 0
      ? revealProgress >= 0.5 ? 'overview' : 'opening'
      : activeBlock.dataset.projectPart;
    navLinks.forEach(link => {
      const part = link.dataset.projectNav;
      const regularIndex = regularBlocks.findIndex(block => block.dataset.projectPart === part) + 1;
      const openingEmphasis = index === 0 ? 1 - progress : 0;
      const emphasis = part === 'opening'
        ? (1 - revealProgress) * openingEmphasis
        : part === 'overview'
          ? revealProgress * openingEmphasis
          : regularIndex === index
            ? 1 - progress
            : regularIndex === index + 1
              ? progress
              : 0;
      const current = part === currentPart;
      link.style.setProperty('--nav-growth', `${emphasis * 0.5}rem`);
      link.style.setProperty('--nav-weight', Math.round(400 + emphasis * 300));
      link.toggleAttribute('aria-current', current);
      if (current) link.setAttribute('aria-current', 'location');
    });
  }

  function navigateTo(part, behavior = 'smooth') {
    const regularIndex = regularBlocks.findIndex(block => block.dataset.projectPart === part) + 1;
    const localTarget = part === 'overview'
      ? revealDistance
      : regularIndex > 0
        ? blockPosition(regularIndex)
        : 0;
    const target = pageTop() + localTarget;
    if (behavior === 'auto' || reduced.matches) {
      cancelNavigation();
      scrollTo({ top: target, behavior: 'auto' });
      render();
      return;
    }
    animateNavigation(target);
  }

  function partFromHash(hash = location.hash) {
    if (hash === '#project-overview') return 'overview';
    const block = regularBlocks.find(item => `#${item.id}` === hash);
    return block?.dataset.projectPart || 'opening';
  }

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      history.pushState(null, '', link.hash);
      navigateTo(link.dataset.projectNav);
    });
  });

  addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(render);
  }, { passive: true });
  addEventListener('wheel', cancelNavigation, { passive: true });
  addEventListener('touchstart', cancelNavigation, { passive: true });
  addEventListener('pointerdown', cancelNavigation, { passive: true });
  addEventListener('keydown', cancelNavigation);
  addEventListener('resize', measure);
  addEventListener('popstate', () => {
    navigateTo(partFromHash(), 'auto');
    render();
  });
  reduced.addEventListener('change', render);
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  regularBlocks.forEach(block => {
    [...block.children].forEach(element => resizeObserver.observe(element));
  });
  document.fonts?.ready.then(measure);
  measure();
  if (initialHash) {
    history.replaceState(null, '', initialUrl);
    navigateTo(partFromHash(initialHash), 'auto');
    render();
  }
})();
