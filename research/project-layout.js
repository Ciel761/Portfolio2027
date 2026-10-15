(() => {
  'use strict';

  const root = document.documentElement;
  const page = document.querySelector('[data-project-page]');
  const stage = page?.querySelector('.project-page-stage');
  const openingBlock = page?.querySelector('[data-project-opening]');
  const title = openingBlock?.querySelector('.project-title-section');
  const regularBlocks = [...(page?.querySelectorAll('.project-regular-block') || [])];
  const blocks = openingBlock ? [openingBlock, ...regularBlocks] : [];
  const contentHeightBlocks = regularBlocks.filter(block => block.hasAttribute('data-project-content-height'));
  const contentTravel = new Map();
  const introBlock = page?.querySelector('[data-project-intro]');
  const introScenes = [...(introBlock?.querySelectorAll('[data-intro-scene]') || [])];
  const introMedia = [...(introBlock?.querySelectorAll('[data-intro-media]') || [])];
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
  let sectionSnapTimer = 0;
  let pointerActive = false;
  let touchActive = false;
  let viewport = 0;
  let revealDistance = 0;
  let openingHold = 0;
  let blockTransition = 0;
  let blockScrollPadding = 0;
  let regularHolds = [];
  let sectionGap = 0;
  let transitionTravel = [];
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
    cancelNavigation();
    viewport = stage.clientHeight || innerHeight;
    revealDistance = Math.max(0, rootNumber('--project-reveal-distance', 10)) * viewport / 100;
    openingHold = Math.max(0, rootNumber('--project-opening-height', 140) - 100) * viewport / 100;
    blockTransition = Math.max(0, rootNumber('--project-block-transition-height', 20)) * viewport / 100;
    blockScrollPadding = Math.max(0, rootNumber('--project-block-scroll-padding', 50)) * viewport / 100;
    sectionGap = Math.max(0, rootNumber('--project-section-gap', 10)) * viewport / 100;
    regularHolds = regularBlocks.map(block => contentHeight(block) + blockScrollPadding * 2);
    contentHeightBlocks.forEach(block => {
      const style = getComputedStyle(block);
      const topSpace = parseFloat(style.marginTop) || 0;
      contentTravel.set(block, Math.max(0, block.offsetHeight + topSpace - viewport));
    });
    transitionTravel = blocks.slice(0, -1).map((block, index) => {
      const outgoingTop = parseFloat(getComputedStyle(block).marginTop) || 0;
      const incomingTop = parseFloat(getComputedStyle(blocks[index + 1]).marginTop) || 0;
      const outgoingBottom = outgoingTop + block.offsetHeight - (contentTravel.get(block) || 0);
      // Hidden endpoints stay outside the viewport. Shared travel adds at
      // least the configured gap, including for content-height sections.
      return Math.max(
        viewport - incomingTop,
        outgoingBottom,
        outgoingBottom - incomingTop + sectionGap
      );
    });
    page.style.setProperty('--project-page-height', `${viewport + maximumScroll()}px`);
    render();
  }

  function blockPosition(index) {
    if (index <= 0) return 0;
    let position = 0;
    for (let previous = 0; previous < index; previous += 1) {
      position += blockHold(previous) + blockTransition;
    }
    return position;
  }

  function timelineState(pageScroll) {
    let cursor = 0;
    for (let index = 0; index < blocks.length - 1; index += 1) {
      const hold = blockHold(index);
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

  function smoothstep(value) {
    const progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function cancelSectionSnap() {
    clearTimeout(sectionSnapTimer);
    sectionSnapTimer = 0;
  }

  function cancelNavigation() {
    cancelSectionSnap();
    if (navigationFrame) cancelAnimationFrame(navigationFrame);
    navigationFrame = 0;
  }

  function scheduleSectionSnap() {
    cancelSectionSnap();
    if (navigationFrame || pointerActive || touchActive) return;
    sectionSnapTimer = setTimeout(() => {
      sectionSnapTimer = 0;
      if (navigationFrame || pointerActive || touchActive) return;
      const pageScroll = clamp(scrollY - pageTop(), 0, maximumScroll());
      const { index, progress } = timelineState(pageScroll);
      // Leave reading, content scrolling, opening reveals, and cinematic
      // scene progress at the user's position. Only settle transitions.
      if (progress <= 0 || progress >= 1) return;
      const boundary = progress < 0.5
        ? blockPosition(index) + blockHold(index)
        : blockPosition(index + 1);
      animateNavigation(pageTop() + boundary);
    }, Math.max(0, rootNumber('--project-section-snap-delay', 500)));
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

  function rangeOpacity(progress, start, end) {
    const duration = Math.max(0.001, end - start);
    const fade = Math.min(0.04, duration / 3);
    const fadeIn = smoothstep((progress - start) / fade);
    const fadeOut = smoothstep((end - progress) / fade);
    return Math.min(fadeIn, fadeOut);
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

  function renderIntroduction(pageScroll) {
    if (!introBlock || !introScenes.length) return;
    const introIndex = blocks.indexOf(introBlock);
    const hold = blockHold(introIndex);
    const progress = hold > 0
      ? clamp((pageScroll - blockPosition(introIndex)) / hold, 0, 1)
      : 1;
    const activeScene = reduced.matches
      ? introScenes.reduce((closest, scene) => {
          const middle = (parseFloat(scene.dataset.start) + parseFloat(scene.dataset.end)) / 2;
          const distance = Math.abs(progress - middle);
          return !closest || distance < closest.distance ? { scene, distance } : closest;
        }, null)?.scene
      : null;

    introScenes.forEach(scene => {
      const start = parseFloat(scene.dataset.start) || 0;
      const end = parseFloat(scene.dataset.end) || 1;
      const opacity = reduced.matches
        ? Number(scene === activeScene)
        : rangeOpacity(progress, start, end);
      const localProgress = clamp((progress - start) / Math.max(0.001, end - start), 0, 1);
      scene.style.setProperty('--intro-scene-opacity', opacity.toFixed(3));
      scene.style.setProperty('--intro-scene-shift', `${((0.5 - localProgress) * 20).toFixed(2)}vh`);
      scene.style.setProperty('--intro-scene-blur', `${((1 - opacity) * 14).toFixed(2)}px`);
      scene.style.pointerEvents = opacity >= 0.5 ? 'auto' : 'none';
    });

    introMedia.forEach(media => {
      const start = parseFloat(media.dataset.start) || 0;
      const end = parseFloat(media.dataset.end) || 1;
      const opacity = reduced.matches
        ? Number(progress >= start && progress <= end)
        : rangeOpacity(progress, start, end) * 0.82;
      const localProgress = clamp((progress - start) / Math.max(0.001, end - start), 0, 1);
      media.style.setProperty('--intro-media-opacity', opacity.toFixed(3));
      media.style.setProperty('--intro-media-shift', `${((0.5 - localProgress) * 18).toFixed(2)}vh`);
      const blurRange = media.hasAttribute('data-intro-quote') ? 7 : 18;
      media.style.setProperty('--intro-media-blur', `${((1 - opacity) * blurRange).toFixed(2)}px`);
      if (media.hasAttribute('data-intro-quote')) {
        const drift = parseFloat(media.dataset.drift) || 0;
        media.style.setProperty('--intro-quote-drift', `${((0.5 - localProgress) * drift).toFixed(2)}vw`);
      }
    });
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
    cancelNavigation();
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
    const { index, progress: transitionProgress } = timelineState(pageScroll);
    const activeIndex = transitionProgress >= 0.5 ? index + 1 : index;
    renderDocumentTheme(index, transitionProgress, activeIndex);
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
      if (contentTravel.has(block)) {
        const travel = contentTravel.get(block);
        const contentOffset = clamp(pageScroll - blockPosition(blockIndex) - blockScrollPadding, 0, travel);
        block.style.setProperty('--project-content-offset', `${contentOffset}px`);
      }
      const offsetValue = sectionGap > 0
        ? `${offset * (transitionTravel[index] || viewport + sectionGap) / 100}px`
        : contentTravel.has(block) ? `${offset * viewport / 100}px` : `${offset}%`;
      block.style.setProperty('--project-block-offset', offsetValue);
      block.toggleAttribute('data-visible', visible);
      block.inert = !active;
      block.setAttribute('aria-hidden', String(!active));
    });
    renderIntroduction(pageScroll);
    renderRelated(pageScroll);

    const activeBlock = blocks[activeIndex];
    root.toggleAttribute('data-project-intro-active', activeBlock === introBlock);
    const relatedVisible = blocks[index] === relatedBlock
      || (transitionProgress > 0 && blocks[index + 1] === relatedBlock);
    root.toggleAttribute('data-project-related-active', relatedVisible);
    root.classList.toggle('overlay-always-clear', relatedVisible);
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
    scheduleSectionSnap();
  }, { passive: true });
  addEventListener('wheel', cancelNavigation, { passive: true });
  addEventListener('touchstart', () => {
    touchActive = true;
    cancelNavigation();
  }, { passive: true });
  const finishTouch = event => {
    touchActive = event.touches.length > 0;
    scheduleSectionSnap();
  };
  addEventListener('touchend', finishTouch, { passive: true });
  addEventListener('touchcancel', finishTouch, { passive: true });
  addEventListener('pointerdown', () => {
    pointerActive = true;
    cancelNavigation();
  }, { passive: true });
  const finishPointer = () => {
    pointerActive = false;
    scheduleSectionSnap();
  };
  addEventListener('pointerup', finishPointer, { passive: true });
  addEventListener('pointercancel', finishPointer, { passive: true });
  addEventListener('keydown', cancelNavigation);
  addEventListener('resize', measure);
  addEventListener('popstate', () => {
    navigateTo(partFromHash(), 'auto');
    render();
  });
  reduced.addEventListener('change', () => {
    cancelNavigation();
    render();
  });
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
