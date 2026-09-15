(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const rootNumber = (name, fallback) => {
    const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };

  document.querySelectorAll('[data-related-carousel]').forEach(carousel => {
    const row = carousel.querySelector('.related-card-row');
    const track = carousel.querySelector('.related-card-track');
    const indicator = carousel.querySelector('.related-card-indicator');
    const cards = [...carousel.querySelectorAll('.related-card')];
    const items = cards.map(card => card.closest('.related-card-item'));
    if (!row || !track || !cards.length || items.some(item => !item)) return;

    const originalLabel = row.getAttribute('aria-label') || 'Related projects';
    const dots = cards.map((card, index) => {
      const dot = document.createElement('button');
      const title = card.querySelector('h3')?.textContent.trim() || `Project ${index + 1}`;
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show ${title}, card ${index + 1} of ${cards.length}`);
      indicator?.append(dot);
      return dot;
    });
    if (indicator) indicator.hidden = cards.length <= 1;

    let focused = -1;
    let renderFrame = 0;
    let seekFrame = 0;
    let syncReleaseTimer = 0;
    let syncingFromPage = false;
    const scrollRange = () => Math.max(0, items.at(-1).offsetLeft - items[0].offsetLeft);
    const scale = distance => distance <= 1
      ? 1.5 - distance * 0.6
      : Math.max(0.1, 0.9 - (distance - 1) * 0.1);
    const brightness = distance => distance <= 1
      ? 100 - distance * 20
      : Math.max(0, 80 - (distance - 1) * 10);
    const blur = distance => distance <= 1
      ? distance * 2
      : Math.min(50, 2 + (distance - 1) * 6);
    const verticalOffsets = [0, 2, 4, 8, 16, 24, 28, 30, 31];

    function verticalOffset(leftDistance) {
      if (leftDistance <= 0 || leftDistance >= verticalOffsets.length - 1) return 0;
      const lower = Math.floor(leftDistance);
      const upper = Math.ceil(leftDistance);
      const progress = leftDistance - lower;
      const value = verticalOffsets[lower]
        + (verticalOffsets[upper] - verticalOffsets[lower]) * progress;
      return value * innerHeight / 100;
    }

    function layoutForFocus(focusIndex) {
      const cardWidth = cards[0].offsetWidth;
      const baseGap = innerWidth * rootNumber('--related-card-base-gap-vw', -7) / 100;
      const gapStep = innerWidth * rootNumber('--related-card-gap-step-vw', 10) / 100;
      const positions = Array(cards.length).fill(0);
      for (let index = focusIndex + 1; index < cards.length; index += 1) {
        const distance = index - focusIndex;
        positions[index] = positions[index - 1]
          + cardWidth * scale(distance - 1)
          + baseGap
          + (distance - 1) * gapStep;
      }
      for (let index = focusIndex - 1; index >= 0; index -= 1) {
        const distance = focusIndex - index;
        positions[index] = positions[index + 1]
          - cardWidth * scale(distance)
          - baseGap
          + (distance - 1) * gapStep;
      }
      return positions;
    }

    function render() {
      renderFrame = 0;
      const firstOffset = items[0].offsetLeft;
      const stride = items.length > 1 ? items[1].offsetLeft - firstOffset : 1;
      const position = clamp(row.scrollLeft / stride, 0, cards.length - 1);
      const nearest = Math.round(position);
      const lowerFocus = Math.floor(position);
      const upperFocus = Math.min(cards.length - 1, lowerFocus + 1);
      const progress = position - lowerFocus;
      const lowerLayout = layoutForFocus(lowerFocus);
      const upperLayout = layoutForFocus(upperFocus);

      cards.forEach((card, index) => {
        const distance = Math.abs(index - position);
        const item = items[index];
        const desired = lowerLayout[index] + (upperLayout[index] - lowerLayout[index]) * progress;
        const nativePosition = item.offsetLeft - firstOffset - row.scrollLeft;
        item.style.setProperty('--related-card-x', `${desired - nativePosition}px`);
        item.style.setProperty('--related-card-y', `${verticalOffset(position - index)}px`);
        item.style.setProperty('--related-card-blur', `${blur(distance)}px`);
        item.style.setProperty('--related-card-layer', Math.round((cards.length + 1 - distance) * 100));
        item.style.setProperty('--related-card-year-top', `${row.clientHeight / 2 - card.offsetHeight * scale(distance) / 2 - innerHeight * 0.01}px`);
        card.style.setProperty('--related-card-scale', scale(distance));
        card.style.setProperty('--related-card-brightness', `${brightness(distance)}%`);
        card.toggleAttribute('data-focused', index === nearest);
        card.querySelectorAll('a').forEach(link => { link.tabIndex = index === nearest ? 0 : -1; });
      });

      dots.forEach((dot, index) => {
        const emphasis = Math.max(0, 1 - Math.abs(index - position));
        dot.style.setProperty('--related-dot-opacity', 0.25 + emphasis * 0.75);
        dot.style.setProperty('--related-dot-scale', 1 + emphasis * 0.5);
        dot.toggleAttribute('aria-current', index === nearest);
      });

      if (nearest !== focused) {
        focused = nearest;
        const title = cards[focused].querySelector('h3')?.textContent.trim() || `Project ${focused + 1}`;
        row.setAttribute('aria-label', `${originalLabel}. Focused: ${title}. Card ${focused + 1} of ${cards.length}`);
      }
    }

    function scrollToCard(index, returnFocus = false) {
      const next = clamp(index, 0, cards.length - 1);
      row.scrollTo({
        left: items[next].offsetLeft - items[0].offsetLeft,
        behavior: reduced.matches ? 'auto' : 'smooth'
      });
      if (returnFocus) row.focus({ preventScroll: true });
    }

    carousel.addEventListener('related-carousel-progress', event => {
      const range = scrollRange();
      const target = range * clamp(event.detail?.progress || 0, 0, 1);
      carousel.toggleAttribute('data-page-sync', true);
      clearTimeout(syncReleaseTimer);
      syncReleaseTimer = setTimeout(() => {
        carousel.removeAttribute('data-page-sync');
        const stride = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 1;
        scrollToCard(Math.round(row.scrollLeft / stride));
      }, 80);
      if (Math.abs(row.scrollLeft - target) < 0.5) return;
      syncingFromPage = true;
      row.scrollLeft = target;
      render();
      requestAnimationFrame(() => { syncingFromPage = false; });
    });

    row.addEventListener('scroll', () => {
      if (!renderFrame) renderFrame = requestAnimationFrame(render);
      if (syncingFromPage || seekFrame) return;
      seekFrame = requestAnimationFrame(() => {
        seekFrame = 0;
        const range = scrollRange();
        if (!range) return;
        carousel.dispatchEvent(new CustomEvent('related-carousel-seek', {
          bubbles: true,
          detail: { progress: clamp(row.scrollLeft / range, 0, 1) }
        }));
      });
    }, { passive: true });

    row.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') scrollToCard(0, true);
      else if (event.key === 'End') scrollToCard(cards.length - 1, true);
      else scrollToCard(focused + (event.key === 'ArrowRight' ? 1 : -1), true);
    });

    row.addEventListener('click', event => {
      const item = event.target.closest('.related-card-item');
      if (!item) return;
      const index = items.indexOf(item);
      if (index !== focused) {
        event.preventDefault();
        event.stopPropagation();
        scrollToCard(index, true);
      }
    }, true);

    dots.forEach((dot, index) => dot.addEventListener('click', () => scrollToCard(index)));
    new ResizeObserver(render).observe(row);
    reduced.addEventListener('change', render);
    render();
  });

  const standaloneRelated = document.querySelector('.project-related-projects-standalone');
  if (standaloneRelated) {
    root.classList.add('standalone-related-page');
    const updateDocumentTheme = () => {
      const bounds = standaloneRelated.getBoundingClientRect();
      const relatedIsActive = bounds.top <= innerHeight * 0.5 && bounds.bottom > 0;
      root.style.setProperty('--document-background', relatedIsActive ? '#000' : '#fff');
    };
    addEventListener('scroll', updateDocumentTheme, { passive: true });
    addEventListener('resize', updateDocumentTheme);
    updateDocumentTheme();
  }
})();
