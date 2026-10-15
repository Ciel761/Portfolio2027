(() => {
  'use strict';
  const block = document.querySelector('[data-featured-themes]');
  const system = block?.querySelector('.featured-theme-system');
  const stage = system?.querySelector('.featured-theme-stage');
  const indicator = system?.querySelector('.featured-theme-indicator');
  const blockTitle = block?.querySelector(':scope > h1');
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = p => { p = clamp(p); return p * p * (3 - 2 * p); };
  const groups = [...stage.querySelectorAll('[data-theme-group]')].map((group, index) => {
    const parent = group.querySelector('.theme-parent-card');
    const seed = [...parent.textContent.trim()].reduce(
      (value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0,
      index + 1
    );
    return {
      group,
      parent,
      seed,
      projects: [...group.querySelectorAll('.theme-project-item')]
    };
  });
  if (!groups.length) return;

  // One SVG surface owns every cell; HTML above it contains only text and hit areas.
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('theme-mitosis-layer');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><filter id="theme-mitosis-goo" x="-10%" y="-20%" width="120%" height="140%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="soft"/>
    <feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/>
    </filter></defs><g data-theme-mitosis-surfaces fill="black" filter="url(#theme-mitosis-goo)"></g>`;
  stage.prepend(svg);
  const membrane = svg.querySelector('[data-theme-mitosis-surfaces]');
  system.tabIndex = 0;
  system.setAttribute('role', 'region');

  const newState = () => ({ split: groups.map(() => 0) });
  let current = newState(), target = newState();
  let animation = null, frame = 0, focusSplitTimer = 0;
  let source = 'carousel', entrance = 0, lastProgress = null, live = false;
  let carouselFocus = 0;
  let width = 0, height = 0, anchor = 0, size = 0, radius = 0, splitInactiveBlur = 24;
  let titleObstacle = null;
  const copy = state => ({ split: [...state.split] });
  const same = (a, b) => a.split.every((v, i) => Math.abs(v - b.split[i]) < 0.0001);

  function tick(now) {
    frame = 0;
    if (animation) {
      const p = ease((now - animation.start) / animation.duration);
      current.split = target.split.map((v, i) => mix(animation.from.split[i], v, p));
      if (p >= 1) { current = copy(target); animation = null; }
    }
    draw();
    if (animation) frame = requestAnimationFrame(tick);
  }
  function moveTo(state, milliseconds = 450) {
    if (same(target, state)) { draw(); return; }
    target = copy(state);
    if (reduced.matches || milliseconds === 0) { animation = null; current = copy(target); draw(); return; }
    animation = { from: copy(current), start: performance.now(), duration: milliseconds };
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function openFocusedTheme(index) {
    if (!live || entrance < 0.99) return;
    clearTimeout(focusSplitTimer);
    source = 'focus';
    updateTitleObstacle();
    const next = newState();
    next.split[index] = 1;
    moveTo(next);
  }
  function closeTheme(milliseconds = 450) {
    clearTimeout(focusSplitTimer);
    source = 'carousel';
    moveTo(newState(), milliseconds);
  }
  function syncFocusedSplit() {
    clearTimeout(focusSplitTimer);
    const focusedIndex = Math.round(carouselFocus);
    const atFocusedAnchor = Math.abs(carouselFocus - focusedIndex) <= 0.001;
    if (!live || entrance < 0.99 || !atFocusedAnchor) {
      if (Math.max(...target.split) > 0.001) closeTheme();
      return;
    }
    if (target.split[focusedIndex] > 0.999) return;
    focusSplitTimer = setTimeout(() => {
      const stillFocused = Math.abs(carouselFocus - focusedIndex) <= 0.001;
      if (live && entrance >= 0.99 && stillFocused) openFocusedTheme(focusedIndex);
    }, 50);
  }

  const dots = groups.map((item, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = item.parent.textContent.trim();
    button.setAttribute('aria-label', `Show ${button.textContent} projects`);
    button.addEventListener('click', () => {
      closeTheme();
      requestCarouselFocus(i, true);
    });
    indicator?.append(button);
    item.parent.addEventListener('click', () => requestCarouselFocus(i, true));
    item.projects.forEach((project, j) => {
      project.querySelector('a').addEventListener('click', event => {
        if (current.split[i] > 0.95) return;
        event.preventDefault();
        requestCarouselFocus(i, true);
      });
    });
    return button;
  });
  system.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeTheme();
      system.focus({ preventScroll: true });
    } else if (Math.max(...current.split) < 0.1 && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1
        : Math.round(carouselFocus) + (event.key === 'ArrowRight' ? 1 : -1);
      requestCarouselFocus(next, true);
    }
  });
  function requestCarouselFocus(value, smooth = false) {
    const nextFocus = clamp(value, 0, groups.length - 1);
    if (Math.abs(nextFocus - carouselFocus) > 0.001 && Math.max(...target.split) > 0.001) {
      closeTheme();
    }
    if (!smooth) {
      carouselFocus = nextFocus;
      draw();
    }
    block.dispatchEvent(new CustomEvent('featured-theme-carousel-request', {
      detail: {
        progress: groups.length > 1 ? nextFocus / (groups.length - 1) : 0,
        smooth
      }
    }));
  }
  system.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const amount = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width : 1);
    event.preventDefault();
    requestCarouselFocus(carouselFocus + amount / Math.max(1, size + width * 0.1));
  }, { passive: false });
  let touchStart = null;
  system.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      touchStart = { x: event.clientX, y: event.clientY };
    }
  });
  system.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = touchStart.x - event.clientX;
    const dy = touchStart.y - event.clientY;
    touchStart = null;
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy)) return;
    requestCarouselFocus(Math.round(carouselFocus) + Math.sign(dx), true);
  });
  system.addEventListener('pointercancel', () => { touchStart = null; });

  function measure() {
    width = system.clientWidth; height = system.clientHeight;
    size = groups[0].projects[0].querySelector('.theme-project-card').offsetWidth;
    // Resolve percentage and calc() values through the parent's real layout position.
    anchor = groups[0].parent.offsetLeft;
    radius = parseFloat(getComputedStyle(groups[0].parent).borderTopLeftRadius) || 32;
    splitInactiveBlur = parseFloat(
      getComputedStyle(system).getPropertyValue('--theme-split-inactive-blur')
    ) || 24;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.querySelector('feGaussianBlur').setAttribute('stdDeviation', Math.max(24, Math.min(48, size * 0.045)));
    updateTitleObstacle();
    draw();
  }
  function rect(x, y, w, h = w) { return { x, y, w, h }; }
  function interpolate(a, b, p) { return rect(mix(a.x,b.x,p), mix(a.y,b.y,p), mix(a.w,b.w,p), mix(a.h,b.h,p)); }
  function shape(box, rounding, opacity = 1) {
    return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${rounding}" opacity="${opacity}"/>`;
  }
  function updateTitleObstacle() {
    if (!blockTitle || !system) {
      titleObstacle = null;
      return;
    }
    const systemBounds = system.getBoundingClientRect();
    const titleBounds = blockTitle.getBoundingClientRect();
    titleObstacle = rect(
      titleBounds.left - systemBounds.left,
      titleBounds.top - systemBounds.top,
      titleBounds.width,
      titleBounds.height
    );
  }
  function place(element, box, opacity, enabled) {
    element.style.transform = `translate3d(${box.x - anchor}px, ${box.y - height / 2}px, 0) scale(${box.w / size}, ${box.h / size}) var(--jelly-transform, translate3d(0, 0, 0))`;
    element.style.opacity = opacity;
    element.style.pointerEvents = enabled ? 'auto' : 'none';
    element.tabIndex = enabled ? 0 : -1;
  }
  const carouselScale = distance => distance <= 1
    ? 1.5 - distance * 0.6
    : Math.max(0.1, 0.9 - (distance - 1) * 0.1);
  const carouselBrightness = distance => distance <= 1
    ? 1 - distance * 0.2
    : Math.max(0, 0.8 - (distance - 1) * 0.1);
  const carouselBlur = distance => distance <= 1
    ? distance * 2
    : Math.min(50, 2 + (distance - 1) * 6);
  function layoutForCarouselFocus(focusIndex) {
    const systemStyle = getComputedStyle(system);
    const baseGapValue = parseFloat(systemStyle.getPropertyValue('--theme-card-gap-vw'));
    const gapStepValue = parseFloat(systemStyle.getPropertyValue('--theme-card-gap-step-vw'));
    const baseGap = width * (Number.isFinite(baseGapValue) ? baseGapValue : 10) / 100;
    const gapStep = width * (Number.isFinite(gapStepValue) ? gapStepValue : 5) / 100;
    const positions = Array(groups.length).fill(anchor);
    if (focusIndex < 0) {
      for (let i = 1; i < groups.length; i += 1) {
        const previousDistance = i - 1 - focusIndex;
        const gap = baseGap + previousDistance * gapStep;
        positions[i] = positions[i - 1] + size * carouselScale(previousDistance) + gap;
      }
      return positions;
    }
    for (let i = focusIndex + 1; i < groups.length; i += 1) {
      const distance = i - focusIndex;
      const gap = baseGap + (distance - 1) * gapStep;
      positions[i] = positions[i - 1] + size * carouselScale(distance - 1) + gap;
    }
    for (let i = focusIndex - 1; i >= 0; i -= 1) {
      const distance = focusIndex - i;
      const gap = baseGap - (distance - 1) * gapStep;
      positions[i] = positions[i + 1] - size * carouselScale(distance) - gap;
    }
    return positions;
  }
  function carouselBox(index, centerY) {
    const displayFocus = entrance < 0.999 ? -1 + entrance : carouselFocus;
    const lowerFocus = Math.floor(displayFocus);
    const upperFocus = Math.min(groups.length - 1, lowerFocus + 1);
    const progress = displayFocus - lowerFocus;
    const lowerLayout = layoutForCarouselFocus(lowerFocus);
    const upperLayout = layoutForCarouselFocus(upperFocus);
    const scale = carouselScale(Math.abs(index - displayFocus));
    return rect(
      mix(lowerLayout[index], upperLayout[index], progress),
      centerY - size * scale / 2,
      size * scale
    );
  }
  function orbitPosition(index, count, themeIndex, centerX, centerY, projectSize, labelSize) {
    const seed = groups[themeIndex].seed + index * 1013 + count * 97;
    const random = salt => {
      const value = Math.sin((seed + salt) * 12.9898) * 43758.5453;
      return value - Math.floor(value);
    };
    const edge = 12;
    const minimumGap = Math.max(16, Math.min(width * 0.018, height * 0.03));
    const horizontalClearance = (labelSize + projectSize) / 2 + minimumGap;
    const verticalClearance = (labelSize + projectSize) / 2 + minimumGap;
    const capacities = {
      left: centerX - edge - projectSize / 2,
      right: width - edge - projectSize / 2 - centerX,
      top: centerY - edge - projectSize / 2,
      bottom: height - edge - projectSize / 2 - centerY
    };
    const separatedDistance = (clearance, capacity, salt) => clearance
      + random(salt) * Math.max(0, Math.min(size * 0.02, capacity - clearance));
    const horizontalPosition = (direction, salt) => direction * separatedDistance(
      horizontalClearance,
      direction < 0 ? capacities.left : capacities.right,
      salt
    );
    const verticalPosition = (direction, salt) => direction * separatedDistance(
      verticalClearance,
      direction < 0 ? capacities.top : capacities.bottom,
      salt
    );
    let x = 0, y = 0;
    if (count === 1) {
      const direction = random(1) > 0.5 ? 1 : -1;
      x = horizontalPosition(direction, 5);
      y = (random(9) - 0.5) * Math.min(size * 0.3, height * 0.15);
    } else if (count === 2) {
      const direction = index === 0 ? 1 : -1;
      x = horizontalPosition(direction, 5);
      y = (random(9) - 0.5) * Math.min(size * 0.42, height * 0.18);
    } else if (count === 3) {
      const slots = [[1, -1], [1, 1], [-1, random(13) > 0.5 ? 1 : -1]];
      x = horizontalPosition(slots[index][0], 5);
      y = index === 2
        ? (random(9) - 0.5) * Math.min(size * 0.28, height * 0.12)
        : verticalPosition(slots[index][1], 9);
    } else {
      const slots = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
      const slot = slots[index % slots.length];
      x = horizontalPosition(slot[0], 5);
      y = verticalPosition(slot[1], 9);
    }
    return rect(
      clamp(centerX + x - projectSize / 2, edge, width - projectSize - edge),
      clamp(centerY + y - projectSize / 2, edge, height - projectSize - edge),
      projectSize
    );
  }
  function avoidObstacles(preferred, obstacles, centerX, centerY, projectSize, labelSize, seed) {
    const edge = 12;
    const gap = Math.max(16, Math.min(width * 0.018, height * 0.03));
    const random = salt => {
      const value = Math.sin((seed + salt) * 12.9898) * 43758.5453;
      return value - Math.floor(value);
    };
    const clampCandidate = candidate => rect(
      clamp(candidate.x, edge, width - projectSize - edge),
      clamp(candidate.y, edge, height - projectSize - edge),
      projectSize
    );
    const candidates = [clampCandidate(preferred)];
    const baseHorizontal = (labelSize + projectSize) / 2 + gap;
    const baseVertical = (labelSize + projectSize) / 2 + gap;
    const phase = random(3) * Math.PI * 2;
    for (let ring = 0; ring < 4; ring += 1) {
      for (let step = 0; step < 24; step += 1) {
        const angle = phase + step * Math.PI * 2 / 24;
        const horizontalDistance = baseHorizontal + ring * projectSize * 0.28;
        const verticalDistance = baseVertical + ring * projectSize * 0.1;
        candidates.push(clampCandidate(rect(
          centerX + Math.cos(angle) * horizontalDistance - projectSize / 2,
          centerY + Math.sin(angle) * verticalDistance - projectSize / 2,
          projectSize
        )));
      }
    }
    const collisionArea = (candidate, obstacle) => {
      const overlapX = Math.max(0, Math.min(candidate.x + candidate.w, obstacle.x + obstacle.w + gap)
        - Math.max(candidate.x, obstacle.x - gap));
      const overlapY = Math.max(0, Math.min(candidate.y + candidate.h, obstacle.y + obstacle.h + gap)
        - Math.max(candidate.y, obstacle.y - gap));
      return overlapX * overlapY;
    };
    return candidates.reduce((best, candidate) => {
      const collisions = obstacles.reduce((total, obstacle) => total + collisionArea(candidate, obstacle), 0);
      const displacement = Math.hypot(candidate.x - preferred.x, candidate.y - preferred.y);
      const score = collisions * 10000 + displacement;
      return !best || score < best.score ? { candidate, score } : best;
    }, null).candidate;
  }
  function draw() {
    if (!width || !height || !size) return;
    const opened = Math.max(...current.split);
    const activeIndex = current.split.indexOf(opened);
    const gap = width * 0.025;
    const themeSize = Math.min(size, (width - anchor - gap * 4) / 3);
    const small = themeSize * 0.58;
    const centerY = height / 2;
    const carouselBoxes = groups.map((item, i) => carouselBox(i, centerY));
    const displayFocus = entrance < 0.999 ? -1 + entrance : carouselFocus;
    const activeNormal = carouselBoxes[activeIndex];
    const activeCenterX = activeNormal.x + activeNormal.w / 2;
    const activeCenterY = activeNormal.y + activeNormal.h / 2;
    const activeLabel = rect(activeCenterX - small / 2, activeCenterY - small / 2, small);
    const pushDistance = size * 0.55 + width * 0.08;
    const displayedThemeBoxes = carouselBoxes.map((box, i) => {
      if (i === activeIndex) return interpolate(box, activeLabel, opened);
      const boxCenterX = box.x + box.w / 2;
      const direction = boxCenterX < activeCenterX || (boxCenterX === activeCenterX && i < activeIndex) ? -1 : 1;
      return rect(box.x + direction * pushDistance * ease(opened), box.y, box.w, box.h);
    });
    const mitosisSurfaces = [];
    groups.forEach((item, i) => {
      const split = current.split[i];
      const normal = carouselBoxes[i];
      const isActive = i === activeIndex;
      const splitCenterX = normal.x + normal.w / 2;
      const splitCenterY = normal.y + normal.h / 2;
      const parentBox = displayedThemeBoxes[i];
      const inactiveOpacity = 1;
      const distance = Math.abs(i - displayFocus);
      const brightness = mix(carouselBrightness(distance), 1, isActive ? opened : 0);
      const baseBlur = carouselBlur(distance);
      const splitBlur = isActive
        ? mix(baseBlur, 0, ease(opened))
        : baseBlur + splitInactiveBlur * ease(opened);
      const parentSurfaceOpacity = inactiveOpacity * (1 - ease(clamp((split - 0.08) / 0.82)));
      if (isActive && opened > 0.001 && parentSurfaceOpacity > 0.001) {
        mitosisSurfaces.push({
          layer: 200 - distance * 10,
          markup: shape(parentBox, Math.min(radius, parentBox.w / 3), parentSurfaceOpacity)
        });
      }
      place(item.parent, parentBox, inactiveOpacity, live);
      item.parent.style.backgroundColor = isActive && opened > 0.001 ? 'transparent' : '#000';
      item.parent.style.filter = `brightness(${brightness}) blur(${reduced.matches ? 0 : splitBlur}px)`;
      item.parent.style.zIndex = String(Math.round(200 - distance * 10));
      const labelChannel = Math.round(255 * (1 - ease(split)));
      item.parent.style.color = `rgb(${labelChannel} ${labelChannel} ${labelChannel})`;
      item.parent.setAttribute('aria-expanded', String(split > 0.5));
      item.group.setAttribute('data-theme-visible', '');
      const occupied = [
        titleObstacle,
        activeLabel,
        ...displayedThemeBoxes.filter((box, index) => index !== i)
      ].filter(Boolean);
      item.projects.forEach((project, j) => {
        const projectSize = Math.min(size * 0.8, height * 0.32, (width - anchor) * 0.34);
        const preferredDestination = orbitPosition(
          j,
          item.projects.length,
          i,
          splitCenterX,
          splitCenterY,
          projectSize,
          small
        );
        const avoidCurrentObstacles = isActive && opened > 0.001;
        const destination = avoidCurrentObstacles
          ? avoidObstacles(
            preferredDestination,
            occupied,
            splitCenterX,
            splitCenterY,
            projectSize,
            small,
            item.seed + j * 1013
          )
          : preferredDestination;
        if (avoidCurrentObstacles) occupied.push(destination);
        const box = interpolate(normal, destination, split);
        const labelOpacity = ease(clamp((split - 0.45) / 0.5));
        const enabled = live && split > 0.95;
        const card = project.querySelector('.theme-project-card');
        project.style.opacity = labelOpacity;
        project.style.zIndex = String(400 + j);
        project.style.pointerEvents = 'none';
        project.style.filter = 'none';
        place(card, box, 1, false);
        card.removeAttribute('tabindex');
        card.style.pointerEvents = enabled ? 'auto' : 'none';
        card.style.zIndex = String(400 + j);
        card.style.backgroundColor = enabled ? '#000' : 'transparent';
        const year = project.querySelector('.theme-project-year');
        year.style.left = `${box.x - anchor + Math.min(radius, box.w / 3)}px`;
        year.style.top = `${box.y - 10}px`;
        const link = card.querySelector('a');
        link.tabIndex = enabled ? 0 : -1;
        project.inert = !enabled;
        project.toggleAttribute('data-theme-project-focused', enabled);
        if (split > 0.001 && !enabled) {
          // Opaque cells join before their labels appear; thresholding makes the neck pinch off.
          mitosisSurfaces.push({
            layer: 300 + j,
            markup: shape(box, mix(box.w / 2, Math.min(radius * 0.78, box.w / 2), ease(split)), 1)
          });
        }
      });
      const dotEmphasis = Math.max(0, 1 - Math.abs(i - displayFocus));
      dots[i].style.setProperty('--dot-opacity', 0.25 + dotEmphasis * 0.75);
      dots[i].style.setProperty('--dot-scale', 1 + dotEmphasis * 0.5);
      dots[i].setAttribute('aria-pressed', String(split > 0.5));
      dots[i].toggleAttribute('aria-current', entrance >= 0.999 && Math.round(carouselFocus) === i);
    });
    membrane.innerHTML = mitosisSurfaces
      .sort((a, b) => a.layer - b.layer)
      .map(surface => surface.markup)
      .join('');
    // Filters process only the membrane. Text and interactive hit areas are unfiltered HTML.
    membrane.setAttribute('filter', reduced.matches ? '' : 'url(#theme-mitosis-goo)');
    system.dataset.themeInput = source;
  }

  block.addEventListener('featured-theme-progress', event => {
    const p = clamp(event.detail.progress);
    entrance = event.detail.entranceProgress;
    live = event.detail.active !== false;
    const changed = lastProgress !== null && Math.abs(p - lastProgress) > 0.00001;
    lastProgress = p;
    carouselFocus = p * Math.max(0, groups.length - 1);
    if (changed) {
      if (Math.abs(carouselFocus - Math.round(carouselFocus)) > 0.001
        && Math.max(...target.split) > 0.001) closeTheme();
    }
    syncFocusedSplit();
    draw();
  });
  new ResizeObserver(measure).observe(system);
  reduced.addEventListener('change', () => { animation = null; current = copy(target); draw(); });
  document.fonts?.ready.then(measure);
  measure();
})();
