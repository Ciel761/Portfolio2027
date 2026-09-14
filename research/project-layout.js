(() => {
  'use strict';

  const root = document.documentElement;
  const page = document.querySelector('[data-project-page]');
  const stage = page?.querySelector('.project-page-stage');
  const openingBlock = page?.querySelector('[data-project-opening]');
  const title = openingBlock?.querySelector('.project-title-section');
  const regularBlocks = [...(page?.querySelectorAll('.project-regular-block') || [])];
  const blocks = openingBlock ? [openingBlock, ...regularBlocks] : [];
  const navLinks = [...document.querySelectorAll('[data-project-nav]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!page || !stage || !openingBlock || !title || !regularBlocks.length) return;

  let frame = 0;
  let viewport = 0;
  let revealDistance = 0;
  let openingHold = 0;
  let blockTransition = 0;
  let regularHold = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function rootNumber(name, fallback) {
    const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function pageTop() {
    return scrollY + page.getBoundingClientRect().top;
  }

  function maximumScroll() {
    return openingHold
      + regularBlocks.length * blockTransition
      + regularBlocks.length * regularHold;
  }

  function measure() {
    viewport = stage.clientHeight || innerHeight;
    revealDistance = Math.max(0, rootNumber('--project-reveal-distance', 10)) * viewport / 100;
    openingHold = Math.max(0, rootNumber('--project-opening-height', 140) - 100) * viewport / 100;
    blockTransition = Math.max(0, rootNumber('--project-block-transition-height', 20)) * viewport / 100;
    regularHold = Math.max(0, rootNumber('--project-regular-hold-height', 100)) * viewport / 100;
    page.style.setProperty('--project-page-height', `${viewport + maximumScroll()}px`);
    render();
  }

  function blockPosition(index) {
    if (index <= 0) return 0;
    return openingHold + blockTransition
      + (index - 1) * (regularHold + blockTransition);
  }

  function timelineState(pageScroll) {
    let cursor = 0;
    for (let index = 0; index < blocks.length - 1; index += 1) {
      const hold = index === 0 ? openingHold : regularHold;
      const transitionStart = cursor + hold;
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

  function render() {
    frame = 0;
    const pageScroll = clamp(-page.getBoundingClientRect().top, 0, maximumScroll());
    const revealProgress = revealDistance > 0
      ? clamp(pageScroll / revealDistance, 0, 1)
      : 1;
    const { index, progress: transitionProgress } = timelineState(pageScroll);
    const activeIndex = transitionProgress >= 0.5 ? index + 1 : index;
    const titleHeight = viewport * (1 - revealProgress * 0.4);
    const bottomPadding = viewport * (0.3 - revealProgress * 0.25);

    title.style.setProperty('--project-title-height', `${titleHeight}px`);
    title.style.setProperty('--project-title-bottom-padding', `${bottomPadding}px`);

    blocks.forEach((block, blockIndex) => {
      let offset = blockIndex < index ? -100 : blockIndex > index ? 100 : 0;
      if (blockIndex === index) offset = -transitionProgress * 100;
      if (blockIndex === index + 1) offset = (1 - transitionProgress) * 100;
      if (reduced.matches) offset = blockIndex === activeIndex ? 0 : 100;
      const visible = reduced.matches ? blockIndex === activeIndex : Math.abs(offset) < 100;
      const active = blockIndex === activeIndex;
      block.style.setProperty('--project-block-offset', `${offset}%`);
      block.toggleAttribute('data-visible', visible);
      block.inert = !active;
      block.setAttribute('aria-hidden', String(!active));
    });

    const activeBlock = blocks[activeIndex];
    const currentPart = activeIndex === 0
      ? revealProgress >= 0.5 ? 'overview' : 'opening'
      : activeBlock.dataset.projectPart;
    navLinks.forEach(link => {
      const part = link.dataset.projectNav;
      const regularIndex = regularBlocks.findIndex(block => block.dataset.projectPart === part) + 1;
      const openingEmphasis = index === 0 ? 1 - transitionProgress : 0;
      const emphasis = part === 'opening'
        ? (1 - revealProgress) * openingEmphasis
        : part === 'overview'
          ? revealProgress * openingEmphasis
          : regularIndex === index
            ? 1 - transitionProgress
            : regularIndex === index + 1
              ? transitionProgress
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
    scrollTo({ top: pageTop() + localTarget, behavior });
  }

  function partFromHash() {
    if (location.hash === '#project-overview') return 'overview';
    const block = regularBlocks.find(item => `#${item.id}` === location.hash);
    if (block) return block.dataset.projectPart;
    return 'opening';
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
  addEventListener('resize', measure);
  addEventListener('popstate', () => {
    navigateTo(partFromHash(), 'auto');
    render();
  });
  reduced.addEventListener('change', render);
  new ResizeObserver(measure).observe(stage);
  measure();
  if (location.hash) {
    requestAnimationFrame(() => {
      navigateTo(partFromHash(), 'auto');
      render();
    });
  }
})();
