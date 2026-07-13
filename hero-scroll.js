(function () {
  'use strict';

  // ── Respect prefers-reduced-motion ──
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Mobile check — use CSS-only fallback on narrow viewports ──
  var isMobile = window.innerWidth < 700;

  // ── Inject hero canvas ──
  var heroArt = document.querySelector('.hero-art');
  if (!heroArt) return;

  // Hide the static SVG
  var staticSvg = heroArt.querySelector('svg');

  // ── Text crossfade setup ──
  // Wrap existing hero text stages inside the .hero-text element
  var heroText = document.querySelector('.hero-text');
  var lede1 = heroText.querySelectorAll('.lede')[0];
  var lede2 = heroText.querySelectorAll('.lede')[1];

  // Create crossfade headline spans
  var headlines = [
    heroText.querySelector('h1'),
  ];

  // Stage overlay text elements
  var stage2Text = document.createElement('p');
  stage2Text.className = 'lede hero-stage';
  stage2Text.setAttribute('aria-hidden', 'true');
  stage2Text.style.cssText = 'position:absolute;top:0;left:0;opacity:0;transition:opacity .5s ease;pointer-events:none;margin:0;color:var(--signal);font-weight:600;';
  stage2Text.textContent = 'Every system starts as separate pieces.';

  var stage3Text = document.createElement('p');
  stage3Text.className = 'lede hero-stage';
  stage3Text.setAttribute('aria-hidden', 'true');
  stage3Text.style.cssText = 'position:absolute;top:0;left:0;opacity:0;transition:opacity .5s ease;pointer-events:none;margin:0;color:var(--signal);font-weight:600;';
  stage3Text.textContent = 'Then it becomes a pipeline.';

  // Wrap lede1 for overlay positioning
  var ledeWrap = document.createElement('div');
  ledeWrap.style.cssText = 'position:relative;';
  lede1.parentNode.insertBefore(ledeWrap, lede1);
  ledeWrap.appendChild(lede1);
  ledeWrap.appendChild(stage2Text);
  ledeWrap.appendChild(stage3Text);

  // ── Canvas setup ──
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;border-radius:8px;';
  canvas.setAttribute('aria-hidden', 'true');

  // Replace static SVG with canvas
  if (staticSvg) staticSvg.style.display = 'none';
  heroArt.appendChild(canvas);

  // Size canvas to match hero-art
  function sizeCanvas() {
    var rect = heroArt.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }
  sizeCanvas();

  var ctx = canvas.getContext('2d');

  // ── Read CSS variables ──
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // ── Node definitions — 5 nodes forming a pipeline ──
  // Positions are in normalised 0–1 space, mapped to canvas at render time
  var NODE_DEFS = [
    { id: 0, label: 'INPUT',   nx: 0.12, ny: 0.25 },
    { id: 1, label: 'AI',      nx: 0.35, ny: 0.50 },
    { id: 2, label: 'ROUTE',   nx: 0.60, ny: 0.28 },
    { id: 3, label: 'LOG',     nx: 0.60, ny: 0.72 },
    { id: 4, label: 'ALERT',   nx: 0.88, ny: 0.50 },
  ];

  // Edges that form the pipeline
  var EDGES = [
    [0, 1],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 4],
  ];

  // ── Animation state ──
  var progress = 0;       // 0 → 1, driven by scroll
  var pulseT = 0;         // 0 → 1, loops — the travelling signal dot

  // ── Get scroll progress 0–1 based on hero section position ──
  function getScrollProgress() {
    var header = document.querySelector('header');
    if (!header) return 0;
    var rect = header.getBoundingClientRect();
    var heroH = header.offsetHeight;
    // Start animating when hero top hits top of viewport
    // Complete when hero bottom leaves viewport
    var scrolled = -rect.top;
    var total = heroH;
    return Math.max(0, Math.min(1, scrolled / (total * 0.8)));
  }

  // ── Easing ──
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Draw ──
  function draw() {
    var W = canvas.width;
    var H = canvas.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = W / dpr;
    var h = H / dpr;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.scale(dpr, dpr);

    var signal  = cssVar('--signal',      '#5eead4');
    var signalD = cssVar('--signal-dim',  '#2b5c54');
    var ink     = cssVar('--ink',         '#dde3ea');
    var muted   = cssVar('--muted',       '#7d8b99');
    var bg2     = cssVar('--bg-2',        '#131a22');
    var line    = cssVar('--line',        '#26313c');

    // Node world positions
    function nx(node) { return node.nx * w; }
    function ny(node) { return node.ny * h; }

    // ── Stage 0 → 1: nodes scatter inward from edges ──
    // Each node starts at a random off-canvas position and slides in
    var SCATTER = [
      { sx: -0.3, sy: -0.2 },
      { sx:  1.3, sy: -0.3 },
      { sx: -0.2, sy:  1.3 },
      { sx:  1.2, sy:  1.2 },
      { sx:  1.4, sy:  0.5 },
    ];

    // Node assembly: first half of progress assembles nodes
    var nodeProgress = Math.min(1, progress * 2.2);
    var ep = easeInOut(nodeProgress);

    // Per-node stagger
    for (var ni = 0; ni < NODE_DEFS.length; ni++) {
      var node = NODE_DEFS[ni];
      var stagger = ni / NODE_DEFS.length;
      var np = Math.max(0, Math.min(1, (nodeProgress - stagger * 0.3) / 0.7));
      var nep = easeInOut(np);

      var startX = SCATTER[ni].sx * w;
      var startY = SCATTER[ni].sy * h;
      var endX   = nx(node);
      var endY   = ny(node);

      var cx = lerp(startX, endX, nep);
      var cy = lerp(startY, endY, nep);

      node._cx = cx;
      node._cy = cy;
      node._alpha = nep;
    }

    // ── Draw edges — appear after node progress > 0.5 ──
    var edgeProgress = Math.max(0, Math.min(1, (progress - 0.3) * 3));

    for (var ei = 0; ei < EDGES.length; ei++) {
      var e = EDGES[ei];
      var a = NODE_DEFS[e[0]];
      var b = NODE_DEFS[e[1]];

      // Stagger each edge
      var estagger = ei / EDGES.length;
      var eAlpha = Math.max(0, Math.min(1, (edgeProgress - estagger * 0.2) / 0.5));
      var eep = easeInOut(eAlpha);

      if (eep <= 0) continue;

      // Draw line from a to b, partially revealed
      var ex1 = a._cx;
      var ey1 = a._cy;
      var ex2 = lerp(a._cx, b._cx, eep);
      var ey2 = lerp(a._cy, b._cy, eep);

      ctx.beginPath();
      ctx.moveTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.strokeStyle = signalD;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.55 * eep;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Store edge draw state for pulse
      e._drawn = eep >= 1;
      e._ax = a._cx; e._ay = a._cy;
      e._bx = b._cx; e._by = b._cy;
    }

    // ── Signal pulse — appears when pipeline is assembled (progress > 0.7) ──
    var pipelineReady = progress > 0.65;
    if (pipelineReady) {
      pulseT = (pulseT + 0.012) % 1;

      // Pulse travels along edge sequence 0→1→2→4 (main path)
      var pulsePath = [0, 1, 2, 4];
      var pathLen = pulsePath.length - 1;
      var globalT = pulseT * pathLen;
      var seg = Math.floor(globalT);
      var segT = globalT - seg;

      if (seg < pathLen) {
        var pA = NODE_DEFS[pulsePath[seg]];
        var pB = NODE_DEFS[pulsePath[seg + 1]];
        var px = lerp(pA._cx, pB._cx, easeInOut(segT));
        var py = lerp(pA._cy, pB._cy, easeInOut(segT));

        // Glow
        var grad = ctx.createRadialGradient(px, py, 0, px, py, 14);
        grad.addColorStop(0,   signal);
        grad.addColorStop(0.4, signal + '88');
        grad.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.6 * Math.min(1, (progress - 0.65) / 0.15);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = signal;
        ctx.globalAlpha = Math.min(1, (progress - 0.65) / 0.15);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Draw nodes ──
    var NODE_R = Math.min(w, h) * 0.065;

    for (var n = 0; n < NODE_DEFS.length; n++) {
      var nd = NODE_DEFS[n];
      if (!nd._alpha || nd._alpha <= 0) continue;

      ctx.globalAlpha = nd._alpha;

      // Box
      var bw = NODE_R * 2.4;
      var bh = NODE_R * 1.5;
      ctx.beginPath();
      ctx.roundRect(nd._cx - bw / 2, nd._cy - bh / 2, bw, bh, 5);
      ctx.fillStyle = bg2;
      ctx.fill();
      ctx.strokeStyle = signal;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.font = '500 ' + Math.round(NODE_R * 0.55) + 'px "JetBrains Mono", monospace';
      ctx.fillStyle = signal;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nd.label, nd._cx, nd._cy);

      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Text crossfade ──
  var lastStage = -1;
  function updateText(prog) {
    var stage = prog < 0.3 ? 0 : prog < 0.65 ? 1 : 2;
    if (stage === lastStage) return;
    lastStage = stage;

    lede1.style.transition = 'opacity .5s ease';
    stage2Text.style.transition = 'opacity .5s ease';
    stage3Text.style.transition = 'opacity .5s ease';

    if (stage === 0) {
      lede1.style.opacity = '1';
      stage2Text.style.opacity = '0';
      stage3Text.style.opacity = '0';
    } else if (stage === 1) {
      lede1.style.opacity = '0';
      stage2Text.style.opacity = '1';
      stage3Text.style.opacity = '0';
    } else {
      lede1.style.opacity = '0';
      stage2Text.style.opacity = '0';
      stage3Text.style.opacity = '1';
    }
  }

  // ── Reduced motion / mobile fallback ──
  if (reduceMotion || isMobile) {
    // Show end state statically — pipeline fully assembled
    progress = 1;
    pulseT = 0;
    sizeCanvas();
    draw();
    // Show original lede, no crossfade
    return;
  }

  // ── Scroll listener ──
  var rafId = null;
  function onScroll() {
    progress = getScrollProgress();
    updateText(progress);
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      draw();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Animation loop for pulse (only runs when pipeline assembled) ──
  var looping = false;
  function startLoop() {
    if (looping) return;
    looping = true;
    (function loop() {
      if (progress < 0.65) { looping = false; return; }
      draw();
      requestAnimationFrame(loop);
    })();
  }

  // Watch progress to start pulse loop
  var _origOnScroll = onScroll;
  window.addEventListener('scroll', function () {
    if (progress >= 0.65) startLoop();
  }, { passive: true });

  // ── Resize ──
  window.addEventListener('resize', function () {
    isMobile = window.innerWidth < 700;
    sizeCanvas();
    draw();
  });

  // ── Theme change (MutationObserver on body class) ──
  var mo = new MutationObserver(function () { draw(); });
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ── Initial draw ──
  sizeCanvas();
  draw();

})();
