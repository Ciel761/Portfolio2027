(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const surfaceSettings = [
    {
      selector: '[data-galaxy-background]',
      layers: [
        { density: 50, parallax: 0.2, opacity: 0.8 },
        { density: 100, parallax: 0.35, opacity: 0.6 },
        { density: 500, parallax: 0.015, opacity: 0.3 }
      ]
    },
    {
      selector: '[data-galaxy-foreground]',
      layers: [
        { density: 10, parallax: 0.8, opacity: 1 }
      ]
    }
  ];

  const surfaces = surfaceSettings.flatMap(surfaceSetting => {
    const canvas = document.querySelector(surfaceSetting.selector);
    const context = canvas?.getContext('2d');
    return canvas && context ? [{ canvas, context, settings: surfaceSetting.layers, layers: [] }] : [];
  });
  if (!surfaces.length) return;

  let width = 0;
  let height = 0;
  let frame = 0;
  let lastScroll = scrollY;

  function randomLine() {
    return {
      x: Math.random(),
      y: Math.random(),
      length: 1 + Math.random() * 4,
      opacity: 0.55 + Math.random() * 0.45
    };
  }

  function createLayers() {
    const areaScale = Math.max(0.65, Math.min(2, width * height / 1_300_000));
    surfaces.forEach(surface => {
      surface.layers = surface.settings.map(settings => ({
        ...settings,
        stretch: 0,
        targetStretch: 0,
        lines: Array.from({ length: Math.round(settings.density * areaScale) }, randomLine)
      }));
    });
  }

  function resize() {
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    surfaces.forEach(({ canvas, context }) => {
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    });
    createLayers();
    requestDraw();
  }

  function wrappedY(value, range) {
    return ((value % range) + range) % range;
  }

  function draw() {
    frame = 0;
    const foreground = getComputedStyle(root).getPropertyValue('--overlay-foreground').trim() || '#000';
    let animationActive = false;

    surfaces.forEach(({ context, layers }) => {
      context.clearRect(0, 0, width, height);
      context.strokeStyle = foreground;
      context.lineWidth = 1;

      layers.forEach(layer => {
        layer.stretch += (layer.targetStretch - layer.stretch) * 0.18;
        layer.targetStretch *= 0.86;
        const parallaxOffset = reducedMotion.matches ? 0 : scrollY * layer.parallax;

        layer.lines.forEach(line => {
          const x = line.x * width;
          const y = wrappedY(line.y * height - parallaxOffset, height + 12) - 6;
          const directionalStretch = reducedMotion.matches ? 0 : layer.stretch;
          const lineTop = y - line.length / 2 + Math.min(0, directionalStretch);
          const lineBottom = y + line.length / 2 + Math.max(0, directionalStretch);
          context.globalAlpha = layer.opacity * line.opacity;
          context.beginPath();
          context.moveTo(x, lineTop);
          context.lineTo(x, lineBottom);
          context.stroke();
        });

        if (Math.abs(layer.targetStretch) > 0.05 || Math.abs(layer.targetStretch - layer.stretch) > 0.05) {
          animationActive = true;
        }
      });
      context.globalAlpha = 1;
    });

    if (animationActive) frame = requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function handleScroll() {
    const scrollDisplacement = scrollY - lastScroll;
    lastScroll = scrollY;

    surfaces.forEach(surface => {
      surface.layers.forEach(layer => {
        const lineDisplacement = scrollDisplacement * layer.parallax;
        const directionalStretch = Math.max(-220, Math.min(220, lineDisplacement * 16));
        if (Math.sign(directionalStretch) !== Math.sign(layer.targetStretch)
            || Math.abs(directionalStretch) > Math.abs(layer.targetStretch)) {
          layer.targetStretch = directionalStretch;
        }
      });
    });
    requestDraw();
  }

  addEventListener('scroll', handleScroll, { passive: true });
  addEventListener('resize', resize);
  reducedMotion.addEventListener('change', requestDraw);
  resize();
})();
