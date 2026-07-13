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
  canvas.style.cssText = 'display:block;border-radius:8px;';
  canvas.setAttribute('aria-hidden', 'true');

  // Replace static SVG with canvas
  if (staticSvg) staticSvg.style.display = 'none';
  heroArt.appendChild(canvas);

  // Size canvas to match hero-art
  function sizeCanvas() {
    var rect = heroArt.getBoundingClientRect();
    var w = rect.width || heroArt.offsetWidth || 280;
    var h = rect.height || heroArt.offsetHeight || 280;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Set explicit pixel CSS size — do not rely on height:100% against a
    // flex/min-height parent, which can resolve to 0 depending on load order.
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  sizeCanvas();

  var ctx = canvas.getContext('2d');

  // ── Read CSS variables ──
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // Convert '#rrggbb' + 0-1 alpha into 'rgba(...)' — avoids concatenating an
  // 8-digit hex alpha suffix onto a color string, which throws an invalid
  // color exception in some browsers/webviews and silently kills the rest
  // of that draw() call.
  function rgba(hex, alpha) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0, 2), 16);
    var g = parseInt(h.substr(2, 2), 16);
    var b = parseInt(h.substr(4, 2), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(94,234,212,' + alpha + ')';
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ── Node definitions — 5 nodes forming a pipeline ──
  // Positions are in normalised 0–1 space, mapped to canvas at render time
  var NODE_DEFS = [
    { id: 0, label: 'INPUT',   nx: 0.12, ny: 0.25, icon: 'input', role: 'signal' },
    { id: 1, label: 'AI',      nx: 0.35, ny: 0.50, icon: 'ai',    role: 'signal' },
    { id: 2, label: 'ROUTE',   nx: 0.60, ny: 0.28, icon: 'route', role: 'signal' },
    { id: 3, label: 'LOG',     nx: 0.60, ny: 0.72, icon: 'log',   role: 'signal' },
    { id: 4, label: 'ALERT',   nx: 0.88, ny: 0.50, icon: 'alert', role: 'warn'   },
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
  // Floor of 0.4 means the pipeline is always at least partially visible on
  // first paint (never blank) — scrolling still drives it the rest of the
  // way to fully assembled, edges drawn, pulse running.
  var PROGRESS_FLOOR = 0.4;
  var progress = PROGRESS_FLOOR;
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
    try {
      drawFrame();
    } catch (err) {
      console.error('hero-scroll draw() failed:', err);
    }
  }

  function drawFrame() {
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
    var warn    = cssVar('--warn',        '#f0b86e');
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
        grad.addColorStop(0.4, rgba(signal, 0.53));
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

    // ── Draw nodes — circular, glowing, with a simple line icon ──
    var NODE_R = Math.min(w, h) * 0.075;

    for (var n = 0; n < NODE_DEFS.length; n++) {
      var nd = NODE_DEFS[n];
      if (!nd._alpha || nd._alpha <= 0) continue;

      var col = nd.role === 'warn' ? warn : signal;
      ctx.globalAlpha = nd._alpha;

      // Soft outer glow
      var glowR = NODE_R * 2.1;
      var glow = ctx.createRadialGradient(nd._cx, nd._cy, 0, nd._cx, nd._cy, glowR);
      glow.addColorStop(0, rgba(col, 0.33));
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(nd._cx, nd._cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Circle body
      ctx.beginPath();
      ctx.arc(nd._cx, nd._cy, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = bg2;
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.75;
      ctx.stroke();

      // Icon
      drawIcon(nd.icon, nd._cx, nd._cy, NODE_R * 0.5, col);

      // Label — small caps, sits below the circle
      ctx.font = '500 ' + Math.round(NODE_R * 0.4) + 'px "JetBrains Mono", monospace';
      ctx.fillStyle = muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(nd.label, nd._cx, nd._cy + NODE_R + 6);

      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Minimal line icons, drawn centered at (cx, cy) with radius r ──
  function drawIcon(type, cx, cy, r, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.3, r * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'input') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, 0);
      ctx.lineTo(r * 0.3, 0);
      ctx.moveTo(r * 0.05, -r * 0.35);
      ctx.lineTo(r * 0.5, 0);
      ctx.lineTo(r * 0.05, r * 0.35);
      ctx.stroke();
    } else if (type === 'ai') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r * 0.6, 0);
      ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r * 0.6);
      ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r * 0.6, 0);
      ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'route') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.45);
      ctx.lineTo(-r * 0.1, 0);
      ctx.lineTo(-r * 0.5, r * 0.45);
      ctx.moveTo(-r * 0.1, 0);
      ctx.lineTo(r * 0.55, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.5, -r * 0.45, r * 0.1, 0, Math.PI * 2);
      ctx.arc(-r * 0.5, r * 0.45, r * 0.1, 0, Math.PI * 2);
      ctx.arc(r * 0.55, 0, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'log') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.35); ctx.lineTo(r * 0.5, -r * 0.35);
      ctx.moveTo(-r * 0.5, 0);         ctx.lineTo(r * 0.5, 0);
      ctx.moveTo(-r * 0.5, r * 0.35);  ctx.lineTo(r * 0.2, r * 0.35);
      ctx.stroke();
    } else if (type === 'alert') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(r * 0.58, r * 0.45);
      ctx.lineTo(-r * 0.58, r * 0.45);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.15);
      ctx.lineTo(0, r * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
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
  // Node/pipeline artwork sits at PROGRESS_FLOOR by default and assembles
  // further as the hero scrolls, but never drops back to fully blank.
  var rafId = null;
  function onScroll() {
    progress = PROGRESS_FLOOR + (1 - PROGRESS_FLOOR) * getScrollProgress();
    updateText(getScrollProgress());
    if (progress >= 0.65) startLoop();
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      draw();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Animation loop for the travelling signal pulse ──
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
  if (progress >= 0.65) startLoop();

})();
