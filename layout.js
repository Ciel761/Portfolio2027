(() => {
  'use strict';
  const root = document.documentElement;
  const main = document.querySelector('main');
  const stage = document.querySelector('.block-stage');
  const blocks = [...document.querySelectorAll('.layout-block')];
  if (!main || !stage || !blocks.length) return;
  const overlayLinks = [...document.querySelectorAll('.overlay-nav a[href^="#"]')];
  const overlayCurrent = document.querySelector('[data-overlay-current]');
  const overlayPosition = document.querySelector('[data-overlay-position]');
  const overlayProgress = document.querySelector('[data-overlay-progress]');
  const overlayCard = document.querySelector('[data-overlay-card]');
  const overlayYear = document.querySelector('[data-overlay-year]');
  const contactBlock = document.querySelector('[data-home-contact]');
  const featuredThemesBlock = document.querySelector('[data-featured-themes]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cardControllers = new Map();
  const initialUrl = location.href;
  const initialHash = location.hash;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (initialHash) history.replaceState(null, '', initialUrl.slice(0, -initialHash.length));
  let defaultHold = 0, transition = 0, entrance = 0;
  let viewport = 0, frame = 0, cardSnapTimer = 0, cardSnapFrame = 0, sectionNavFrame = 0, activeBlock = blocks[0];
  let layoutReady = false;
  let startupInteracted = false;
  let savedPageScroll = 0;
  let blockHolds = [];
  let blockStarts = [];
  const entranceBlocks = blocks.filter((block, index) => index > 0 && block !== contactBlock);
  const titleEntranceOffsets = new Map();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = value => {
    const progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
  };
  const rootNumber = (name, fallback) => {
    const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };

  const blockStart = index => blockStarts[index] || 0;
  const blockHold = index => blockHolds[index] || 0;

  function timelineState(distance) {
    // An unmeasured timeline must never fall through to the terminal section.
    if (!layoutReady || !Number.isFinite(distance)) return { index: 0, progress: 0 };
    for (let index = 0; index < blocks.length - 1; index += 1) {
      const transitionStart = blockStart(index) + blockHold(index);
      const transitionEnd = transitionStart + transition;
      if (distance < transitionStart) return { index, progress: 0 };
      if (distance < transitionEnd) {
        return {
          index,
          progress: transition > 0 ? clamp((distance - transitionStart) / transition, 0, 1) : 1
        };
      }
    }
    return { index: blocks.length - 1, progress: 0 };
  }

  function cancelCardSnap() {
    clearTimeout(cardSnapTimer);
    cardSnapTimer = 0;
    if (cardSnapFrame) cancelAnimationFrame(cardSnapFrame);
    cardSnapFrame = 0;
  }

  function animateCardSnap(target) {
    cancelCardSnap();
    const start = scrollY;
    const distance = target - start;
    const duration = Math.max(0, rootNumber('--card-snap-duration', 120));
    if (reduced.matches || duration === 0 || Math.abs(distance) < 0.5) {
      scrollTo({ top: target, behavior: 'auto' });
      return;
    }
    const startTime = performance.now();
    const tick = now => {
      const progress = clamp((now - startTime) / duration, 0, 1);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      scrollTo({ top: start + distance * eased, behavior: 'auto' });
      if (progress < 1) cardSnapFrame = requestAnimationFrame(tick);
      else cardSnapFrame = 0;
    };
    cardSnapFrame = requestAnimationFrame(tick);
  }

  function cancelSectionNavigation() {
    if (sectionNavFrame) cancelAnimationFrame(sectionNavFrame);
    sectionNavFrame = 0;
  }

  function animateSectionNavigation(target) {
    cancelSectionNavigation();
    cancelCardSnap();
    const start = scrollY;
    const distance = target - start;
    const baseDuration = Math.max(0, rootNumber('--section-nav-duration', 550));
    const maxDuration = Math.max(baseDuration, rootNumber('--section-nav-max-duration', 3500));
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
      const eased = smoothstep(progress);
      scrollTo({ top: start + distance * eased, behavior: 'auto' });
      render();
      if (progress < 1) sectionNavFrame = requestAnimationFrame(tick);
      else sectionNavFrame = 0;
    };
    sectionNavFrame = requestAnimationFrame(tick);
  }

  function updateOverlayCardInfo(block = activeBlock) {
    const card = block?.querySelector('.card[data-focused]') || block?.querySelector('.card');
    const title = card?.querySelector('h3')?.textContent.trim();
    const year = card?.closest('.card-item')?.querySelector('.card-year')?.textContent.trim();
    if (overlayCard) overlayCard.value = title || 'None';
    if (overlayYear) overlayYear.value = year || '—';
  }

  function measure() {
    const style = getComputedStyle(root);
    const number = (name, fallback) => {
      const value = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const measuredViewport = stage.clientHeight || innerHeight;
    if (!Number.isFinite(measuredViewport) || measuredViewport <= 0) return;
    viewport = measuredViewport;
    defaultHold = Math.max(0, number('--block-height', 150) - 100) * viewport / 100;
    transition = Math.max(0, number('--transition-height', 10)) * viewport / 100;
    entrance = Math.max(0, number('--block-entrance-height', 20)) * viewport / 100;
    blockHolds = blocks.map(block => {
      const customHold = parseFloat(block.dataset.blockHold);
      return Number.isFinite(customHold) ? Math.max(0, customHold) * viewport / 100 : defaultHold;
    });
    blockStarts = [];
    blocks.forEach((block, index) => {
      blockStarts[index] = index === 0
        ? 0
        : blockStarts[index - 1] + blockHolds[index - 1] + transition;
    });
    // A zero-length sequence has no meaningful scroll positions; retain normal flow.
    if (!blockHolds.some(Boolean) && !transition) {
      layoutReady = false;
      root.classList.remove('block-layout');
      blocks.forEach(block => { block.inert = false; block.removeAttribute('aria-hidden'); });
      return;
    }
    root.classList.add('block-layout');
    const layoutScrollHeight = blockHolds.reduce((total, value) => total + value, 0)
      + (blocks.length - 1) * transition;
    main.style.setProperty('--layout-height', `${viewport + layoutScrollHeight}px`);
    layoutReady = true;
    entranceBlocks.forEach(block => {
      block.toggleAttribute('data-home-entrance', true);
      const title = block.querySelector(':scope > h1');
      if (!title) return;
      const titleCenter = title.offsetTop + title.offsetHeight / 2;
      titleEntranceOffsets.set(block, viewport / 2 - titleCenter);
    });
    render();
  }
  function render() {
    frame = 0;
    if (!layoutReady || !root.classList.contains('block-layout')) return;
    const distance = Math.max(0, -main.getBoundingClientRect().top);
    const { index, progress } = timelineState(distance);
    const active = progress >= .5 ? index + 1 : index;
    const isDark = block => Number(block?.hasAttribute('data-dark-block'));
    const currentDarkness = isDark(blocks[index]);
    const nextDarkness = index < blocks.length - 1 ? isDark(blocks[index + 1]) : currentDarkness;
    const darkness = reduced.matches
      ? isDark(blocks[active])
      : currentDarkness + (nextDarkness - currentDarkness) * smoothstep(progress);
    const backgroundChannel = Math.round(255 * (1 - darkness));
    const foregroundChannel = Math.round(255 * darkness);
    root.style.setProperty('--document-background', `rgb(${backgroundChannel} ${backgroundChannel} ${backgroundChannel})`);
    root.style.setProperty('--overlay-foreground', `rgb(${foregroundChannel} ${foregroundChannel} ${foregroundChannel})`);
    const contactVisible = blocks[index] === contactBlock
      || (progress > 0 && blocks[index + 1] === contactBlock);
    root.toggleAttribute('data-home-contact-active', contactVisible);
    root.classList.toggle('overlay-always-clear', contactVisible);
    blocks.forEach((block, i) => {
      let offset = i < index ? -100 : i > index ? 100 : 0;
      if (i === index) offset = -progress * 100;
      if (i === index + 1) offset = (1 - progress) * 100;
      if (reduced.matches) offset = i === active ? 0 : 100;
      const visible = reduced.matches ? i === active : Math.abs(offset) < 100;
      block.style.setProperty('--block-offset', `${offset}%`);
      block.toggleAttribute('data-visible', visible);
      block.inert = i !== active;
      block.setAttribute('aria-hidden', String(i !== active));

      if (block.hasAttribute('data-home-entrance')) {
        const localDistance = distance - blockStart(i);
        const blockEntrance = Math.min(blockHold(i), entrance);
        const rawEntranceProgress = i < index
          ? 1
          : i > index
            ? 0
            : blockEntrance > 0
              ? clamp(localDistance / blockEntrance, 0, 1)
              : 1;
        const entranceProgress = reduced.matches ? 1 : smoothstep(rawEntranceProgress);
        const titleOffset = titleEntranceOffsets.get(block) || 0;
        block.style.setProperty('--block-title-y', `${titleOffset * (1 - entranceProgress)}px`);
        const carouselEntranceDistance = stage.clientWidth || innerWidth;
        block.style.setProperty(
          '--carousel-entry-x',
          `${carouselEntranceDistance * (1 - entranceProgress)}px`
        );
        if (i === index && rawEntranceProgress < 1) {
          cardControllers.get(block)?.syncEntrance(entranceProgress);
        }
      }
    });

    const cardController = cardControllers.get(blocks[index]);
    const currentEntrance = Math.min(blockHold(index), entrance);
    const carouselDistance = Math.max(0, blockHold(index) - currentEntrance);
    const cardProgress = carouselDistance > 0
      ? clamp((distance - blockStart(index) - currentEntrance) / carouselDistance, 0, 1)
      : 1;
    if (distance - blockStart(index) >= currentEntrance) cardController?.syncFromPage(cardProgress);

    if (featuredThemesBlock) {
      const featuredIndex = blocks.indexOf(featuredThemesBlock);
      const featuredEntrance = Math.min(blockHold(featuredIndex), entrance);
      const featuredCarouselDistance = Math.max(0, blockHold(featuredIndex) - featuredEntrance);
      const localDistance = distance - blockStart(featuredIndex);
      const rawFeaturedEntrance = featuredEntrance > 0
        ? clamp(localDistance / featuredEntrance, 0, 1)
        : 1;
      const entranceProgress = reduced.matches
        ? 1
        : smoothstep(rawFeaturedEntrance);
      const themeProgress = featuredCarouselDistance > 0
        ? clamp((localDistance - featuredEntrance) / featuredCarouselDistance, 0, 1)
        : 1;
      featuredThemesBlock.dispatchEvent(new CustomEvent('featured-theme-progress', {
        detail: {
          entranceProgress: reduced.matches ? 1 : entranceProgress,
          progress: themeProgress,
          active: blocks[active] === featuredThemesBlock
        }
      }));
    }

    activeBlock = blocks[active];
    const labelledBy = activeBlock.getAttribute('aria-labelledby');
    const activeLabel = activeBlock.getAttribute('aria-label')
      || (labelledBy && document.getElementById(labelledBy)?.textContent.trim())
      || `Section ${active + 1}`;
    if (overlayCurrent) overlayCurrent.value = activeLabel;
    if (overlayPosition) overlayPosition.value = `${active + 1} / ${blocks.length}`;
    if (overlayProgress) {
      overlayProgress.max = Math.max(1, blocks.length - 1);
      overlayProgress.value = index + progress;
    }
    overlayLinks.forEach(link => {
      let target;
      try { target = document.querySelector(link.hash); } catch { target = null; }
      const linkBlock = target?.closest('.layout-block');
      const linkIndex = blocks.indexOf(linkBlock);
      const emphasis = reduced.matches
        ? Number(linkBlock === activeBlock)
        : linkIndex === index
          ? 1 - progress
          : linkIndex === index + 1
            ? progress
            : 0;
      link.style.setProperty('--nav-growth', `${emphasis * 0.5}rem`);
      link.style.setProperty('--nav-weight', Math.round(400 + emphasis * 300));
      link.toggleAttribute('aria-current', linkBlock === activeBlock);
      if (link.hasAttribute('aria-current')) link.setAttribute('aria-current', 'location');
    });
    updateOverlayCardInfo();
  }
  function restoreHash(hash = location.hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const index = blocks.findIndex(block => block.id === id || [...block.querySelectorAll('[id]')].some(el => el.id === id));
    if (index < 0 || !root.classList.contains('block-layout')) return;
    cancelSectionNavigation();
    scrollTo({ top: scrollY + main.getBoundingClientRect().top + blockStart(index), behavior: 'auto' });
    render();
  }

  featuredThemesBlock?.addEventListener('featured-theme-carousel-request', event => {
    if (!root.classList.contains('block-layout')) return;
    const index = blocks.indexOf(featuredThemesBlock);
    if (index < 0) return;
    const featuredEntrance = Math.min(blockHold(index), entrance);
    const carouselDistance = Math.max(0, blockHold(index) - featuredEntrance);
    const progress = clamp(Number(event.detail?.progress) || 0, 0, 1);
    const mainTop = scrollY + main.getBoundingClientRect().top;
    const target = mainTop + blockStart(index) + featuredEntrance + progress * carouselDistance;
    if (event.detail?.smooth) animateCardSnap(target);
    else {
      cancelCardSnap();
      scrollTo({ top: target, behavior: 'auto' });
      render();
    }
  });

  function scheduleCardSnap() {
    clearTimeout(cardSnapTimer);
    if (!layoutReady) return;
    cardSnapTimer = setTimeout(() => {
      if (!root.classList.contains('block-layout') || !blockHolds.length) return;
      const distance = Math.max(0, -main.getBoundingClientRect().top);
      const { index, progress } = timelineState(distance);
      if (progress > 0) return;
      const localDistance = distance - blockStart(index);
      const blockEntrance = Math.min(blockHold(index), entrance);
      if (localDistance < 0 || localDistance > blockHold(index)) return;
      if (localDistance < blockEntrance && blocks[index].hasAttribute('data-home-entrance')) {
        const snapPoints = [0, blockEntrance];
        const nearestPoint = snapPoints.reduce((nearest, point) => (
          Math.abs(point - localDistance) < Math.abs(nearest - localDistance) ? point : nearest
        ), snapPoints[0]);
        const mainTop = scrollY + main.getBoundingClientRect().top;
        animateCardSnap(mainTop + blockStart(index) + nearestPoint);
        return;
      }
      if (localDistance < blockEntrance) return;
      const carouselDistance = Math.max(0, blockHold(index) - blockEntrance);
      const carouselProgress = carouselDistance > 0
        ? clamp((localDistance - blockEntrance) / carouselDistance, 0, 1)
        : 1;
      if (blocks[index] === featuredThemesBlock) {
        const themeCount = featuredThemesBlock.querySelectorAll('[data-theme-group]').length;
        const snappedProgress = themeCount > 1
          ? Math.round(carouselProgress * (themeCount - 1)) / (themeCount - 1)
          : 0;
        featuredThemesBlock.dispatchEvent(new CustomEvent('featured-theme-carousel-request', {
          detail: { progress: snappedProgress, smooth: true }
        }));
        return;
      }
      cardControllers.get(blocks[index])?.snapToNearest(carouselProgress);
    }, Math.max(0, rootNumber('--card-snap-delay', 60)));
  }

  function initializeCardRows() {
    document.querySelectorAll('.card-row').forEach(row => {
      const track = row.querySelector('.card-track');
      if (!track) return;
      const cards = [...track.querySelectorAll('.card')];
      if (!cards.length) return;
      const items = cards.map(card => card.closest('.card-item'));
      const originalLabel = row.getAttribute('aria-label') || 'Cards';
      const effectScope = row.closest('.layout-block') || row;
      const indicator = row.closest('.card-system')?.querySelector('.card-indicator');
      const dots = cards.map((card, index) => {
        const dot = document.createElement('button');
        const title = card.querySelector('h3')?.textContent.trim() || `Card ${index + 1}`;
        dot.type = 'button';
        dot.setAttribute('aria-label', `Show ${title}, card ${index + 1} of ${cards.length}`);
        indicator?.append(dot);
        return dot;
      });
      if (indicator) indicator.hidden = cards.length <= 1;
      let focused = -1;
      let virtualFocus = null;
      let cardFrame = 0;
      let pageSyncFrame = 0;
      let syncingFromPage = false;
      let syncingPageFromRow = false;
      const effectsEnabled = () => effectScope.classList.contains('card-scroll-effects');
      const verticalEnabled = () => effectScope.classList.contains('card-vertical-scroll');
      const scrollRange = () => Math.max(0, items[items.length - 1].offsetLeft - items[0].offsetLeft);

      const resetCards = () => {
        focused = -1;
        row.setAttribute('aria-label', originalLabel);
        cards.forEach((card, index) => {
          const item = items[index];
          ['--card-x', '--card-y', '--card-blur', '--card-layer', '--card-year-top']
            .forEach(property => item.style.removeProperty(property));
          card.style.removeProperty('--card-scale');
          card.style.removeProperty('--card-brightness');
          card.removeAttribute('data-focused');
          card.querySelectorAll('a').forEach(link => link.removeAttribute('tabindex'));
        });
      };

      const cardScale = distance => distance <= 1
        ? 1.5 - distance * 0.6
        : Math.max(0.1, 0.9 - (distance - 1) * 0.1);
      const brightness = distance => distance <= 1
        ? 100 - distance * 20
        : Math.max(0, 80 - (distance - 1) * 10);
      const blur = distance => distance <= 1
        ? distance * 2
        : Math.min(50, 2 + (distance - 1) * 6);
      const leftVerticalOffsets = [0, 2, 4, 8, 16, 24, 28, 30, 31];
      const verticalOffset = leftDistance => {
        if (leftDistance <= 0 || leftDistance >= leftVerticalOffsets.length - 1) return 0;
        const lower = Math.floor(leftDistance);
        const upper = Math.ceil(leftDistance);
        const progress = leftDistance - lower;
        const offsetVh = leftVerticalOffsets[lower]
          + (leftVerticalOffsets[upper] - leftVerticalOffsets[lower]) * progress;
        return offsetVh * innerHeight / 100;
      };

      const layoutForFocus = focusIndex => {
        const cardWidth = cards[0].offsetWidth;
        const rootStyle = getComputedStyle(root);
        const baseGapValue = parseFloat(rootStyle.getPropertyValue('--card-gap-vw'));
        const gapStepValue = parseFloat(rootStyle.getPropertyValue('--card-gap-step-vw'));
        const baseGap = innerWidth * (Number.isFinite(baseGapValue) ? baseGapValue : 10) / 100;
        const gapStep = innerWidth * (Number.isFinite(gapStepValue) ? gapStepValue : 5) / 100;
        const positions = Array(cards.length).fill(0);

        if (focusIndex < 0) {
          for (let i = 1; i < cards.length; i++) {
            const previousDistance = i - 1 - focusIndex;
            const gap = baseGap + previousDistance * gapStep;
            positions[i] = positions[i - 1] + cardWidth * cardScale(previousDistance) + gap;
          }
          return positions;
        }

        for (let i = focusIndex + 1; i < cards.length; i++) {
          const distance = i - focusIndex;
          const gap = baseGap + (distance - 1) * gapStep;
          positions[i] = positions[i - 1] + cardWidth * cardScale(distance - 1) + gap;
        }
        for (let i = focusIndex - 1; i >= 0; i--) {
          const distance = focusIndex - i;
          const gap = baseGap - (distance - 1) * gapStep;
          positions[i] = positions[i + 1] - cardWidth * cardScale(distance) - gap;
        }
        return positions;
      };

      const renderCards = () => {
        cardFrame = 0;
        const firstOffset = items[0].offsetLeft;
        const stride = items.length > 1 ? items[1].offsetLeft - firstOffset : 1;
        const scrollPosition = virtualFocus === null
          ? clamp(row.scrollLeft / stride, 0, cards.length - 1)
          : clamp(virtualFocus, -1, 0);
        const nearest = Math.round(scrollPosition);
        const focusedIndex = scrollPosition < 0 ? -1 : nearest;
        dots.forEach((dot, index) => {
          const emphasis = Math.max(0, 1 - Math.abs(index - scrollPosition));
          dot.style.setProperty('--dot-opacity', 0.25 + emphasis * 0.75);
          dot.style.setProperty('--dot-scale', 1 + emphasis * 0.5);
          dot.toggleAttribute('aria-current', index === focusedIndex);
        });
        if (!effectsEnabled()) {
          resetCards();
          focused = nearest;
          return;
        }
        const lowerFocus = Math.floor(scrollPosition);
        const upperFocus = Math.min(cards.length - 1, lowerFocus + 1);
        const progress = scrollPosition - lowerFocus;
        const lowerLayout = layoutForFocus(lowerFocus);
        const upperLayout = layoutForFocus(upperFocus);

        cards.forEach((card, index) => {
          const distance = Math.abs(index - scrollPosition);
          const link = card.querySelector('a');
          const item = items[index];
          const scale = cardScale(distance);
          const desiredPosition = lowerLayout[index] + (upperLayout[index] - lowerLayout[index]) * progress;
          const nativePosition = item.offsetLeft - firstOffset - row.scrollLeft;
          item.style.setProperty('--card-x', `${desiredPosition - nativePosition}px`);
          item.style.setProperty('--card-y', `${verticalOffset(scrollPosition - index)}px`);
          item.style.setProperty('--card-blur', `${blur(distance)}px`);
          item.style.setProperty('--card-layer', Math.round((cards.length + 1 - distance) * 100));
          item.style.setProperty('--card-year-top', `${row.clientHeight / 2 - card.offsetHeight * scale / 2 - innerHeight * 0.01}px`);
          card.style.setProperty('--card-scale', scale);
          card.style.setProperty('--card-brightness', `${brightness(distance)}%`);
          card.toggleAttribute('data-focused', index === focusedIndex);
          if (link) link.tabIndex = index === focusedIndex ? 0 : -1;
        });

        if (focusedIndex !== focused) {
          focused = focusedIndex;
          if (focused < 0) {
            row.setAttribute('aria-label', `${originalLabel}. Section title focused.`);
          } else {
            const title = cards[focused].querySelector('h3')?.textContent.trim() || `Card ${focused + 1}`;
            row.setAttribute('aria-label', `${originalLabel}. Focused: ${title}. Card ${focused + 1} of ${cards.length}`);
          }
        }
        if (effectScope === activeBlock) updateOverlayCardInfo(effectScope);
      };

      const syncFromPage = progress => {
        if (!verticalEnabled() || syncingPageFromRow) return;
        const wasVirtual = virtualFocus !== null;
        virtualFocus = null;
        const target = scrollRange() * progress;
        if (Math.abs(row.scrollLeft - target) < 0.5) {
          if (wasVirtual) renderCards();
          return;
        }
        syncingFromPage = true;
        row.scrollLeft = target;
        renderCards();
        requestAnimationFrame(() => { syncingFromPage = false; });
      };

      const syncEntrance = progress => {
        if (!verticalEnabled()) return;
        virtualFocus = -1 + clamp(progress, 0, 1);
        if (row.scrollLeft !== 0) {
          syncingFromPage = true;
          row.scrollLeft = 0;
          requestAnimationFrame(() => { syncingFromPage = false; });
        }
        renderCards();
      };

      const syncPageFromRow = () => {
        pageSyncFrame = 0;
        if (!verticalEnabled() || virtualFocus !== null || syncingFromPage || effectScope !== activeBlock) return;
        const range = scrollRange();
        if (!range) return;
        const blockIndex = blocks.indexOf(effectScope);
        if (blockIndex < 0) return;
        const controllerEntrance = Math.min(blockHold(blockIndex), entrance);
        const progress = clamp(row.scrollLeft / range, 0, 1);
        const mainTop = scrollY + main.getBoundingClientRect().top;
        syncingPageFromRow = true;
        const carouselDistance = Math.max(0, blockHold(blockIndex) - controllerEntrance);
        scrollTo({ top: mainTop + blockStart(blockIndex) + controllerEntrance + progress * carouselDistance, behavior: 'auto' });
        requestAnimationFrame(() => { syncingPageFromRow = false; });
      };

      const snapToNearest = progress => {
        if (!verticalEnabled() || cards.length <= 1) return;
        const blockIndex = blocks.indexOf(effectScope);
        if (blockIndex < 0) return;
        const controllerEntrance = Math.min(blockHold(blockIndex), entrance);
        const snappedCard = Math.round(clamp(progress, 0, 1) * (cards.length - 1));
        const snappedProgress = snappedCard / (cards.length - 1);
        const mainTop = scrollY + main.getBoundingClientRect().top;
        const carouselDistance = Math.max(0, blockHold(blockIndex) - controllerEntrance);
        const target = mainTop + blockStart(blockIndex) + controllerEntrance + snappedProgress * carouselDistance;
        if (Math.abs(scrollY - target) < 0.5) return;
        animateCardSnap(target);
      };

      cardControllers.set(effectScope, { syncEntrance, syncFromPage, snapToNearest });

      const scrollToFocus = (index, returnFocus = false) => {
        const next = clamp(index, 0, cards.length - 1);
        const firstOffset = items[0].offsetLeft;
        row.scrollTo({
          left: items[next].offsetLeft - firstOffset,
          behavior: reduced.matches || !effectsEnabled() ? 'auto' : 'smooth'
        });
        if (returnFocus) row.focus({ preventScroll: true });
      };

      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => scrollToFocus(index));
      });

      row.addEventListener('scroll', () => {
        if (!cardFrame) cardFrame = requestAnimationFrame(renderCards);
        if (!pageSyncFrame) pageSyncFrame = requestAnimationFrame(syncPageFromRow);
      }, { passive: true });

      row.addEventListener('keydown', event => {
        if (!effectsEnabled()) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        if (event.key === 'Home') scrollToFocus(0, true);
        else if (event.key === 'End') scrollToFocus(cards.length - 1, true);
        else scrollToFocus(focused + (event.key === 'ArrowRight' ? 1 : -1), true);
      });

      row.addEventListener('click', event => {
        if (!effectsEnabled()) return;
        const item = event.target.closest('.card-item');
        if (!item) return;
        const index = items.indexOf(item);
        if (index !== focused) {
          event.preventDefault();
          event.stopPropagation();
          scrollToFocus(index, true);
        }
      }, true);

      new ResizeObserver(() => {
        if (verticalEnabled()) {
          render();
          return;
        }
        if (!effectsEnabled()) {
          renderCards();
          return;
        }
        const currentFocus = Math.max(0, focused);
        row.scrollLeft = items[currentFocus].offsetLeft - items[0].offsetLeft;
        renderCards();
      }).observe(row);
      new MutationObserver(renderCards).observe(effectScope, {
        attributes: true,
        attributeFilter: ['class']
      });
      renderCards();
    });
  }
  measure();
  initializeCardRows();
  render();
  overlayLinks.forEach(link => {
    link.addEventListener('click', event => {
      let target;
      try { target = document.querySelector(link.hash); } catch { target = null; }
      const blockIndex = blocks.indexOf(target?.closest('.layout-block'));
      if (blockIndex < 0) return;
      event.preventDefault();
      history.pushState(null, '', link.hash);
      const mainTop = scrollY + main.getBoundingClientRect().top;
      animateSectionNavigation(mainTop + blockStart(blockIndex));
    });
  });
  addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(render);
    scheduleCardSnap();
  }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('wheel', cancelCardSnap, { passive: true });
  addEventListener('wheel', cancelSectionNavigation, { passive: true });
  addEventListener('touchstart', cancelCardSnap, { passive: true });
  addEventListener('touchstart', cancelSectionNavigation, { passive: true });
  addEventListener('pointerdown', cancelCardSnap, { passive: true });
  addEventListener('pointerdown', cancelSectionNavigation, { passive: true });
  addEventListener('keydown', cancelCardSnap);
  addEventListener('keydown', cancelSectionNavigation);
  const markStartupInteraction = () => { startupInteracted = true; };
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type => {
    addEventListener(type, markStartupInteraction, { passive: true });
  });
  new ResizeObserver(measure).observe(stage);
  document.fonts?.ready.then(measure);
  reduced.addEventListener('change', render);
  addEventListener('hashchange', () => restoreHash());
  addEventListener('popstate', () => restoreHash());
  function restoreInitialPosition() {
    if (startupInteracted) return;
    requestAnimationFrame(() => {
      if (startupInteracted) return;
      measure();
      if (!layoutReady) return;
      if (initialHash) {
        history.replaceState(null, '', initialUrl);
        restoreHash(initialHash);
        return;
      }
      scrollTo({ top: scrollY + main.getBoundingClientRect().top, behavior: 'auto' });
      render();
    });
  }
  // Safari can restore a previous document offset after the first frame.
  // Reconcile a fresh load at pageshow, but never reset after user input.
  addEventListener('pagehide', () => {
    savedPageScroll = scrollY;
    cancelCardSnap();
    cancelSectionNavigation();
  });
  addEventListener('pageshow', event => {
    if (event.persisted) {
      measure();
      scrollTo({ top: savedPageScroll, behavior: 'auto' });
      render();
    } else restoreInitialPosition();
  });
  restoreInitialPosition();
})();
