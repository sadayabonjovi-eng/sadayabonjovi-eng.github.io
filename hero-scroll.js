/* =============================================
   Bon's Portfolio — hero-scroll.js
   Hero Orbit — interactive 3D GLOBE showing all
   5 automation projects placed on the surface
   of a real sphere (longitude + latitude), with
   decorative latitude rings for depth.

   Self-contained, self-mounting script:
     - injects its own scoped CSS (prefixed
       hero-orbit-* so nothing collides with
       existing site styles)
     - looks for a mount point in the page:
         <div id="hero-orbit-mount"></div>
     - if that mount point isn't found, this
       logs a clear console warning and does
       NOT render anything.
     - on successful mount, hides the static SVG
       fallback that lives next to it in .hero-art
       (that SVG stays as the safety net if this
       script ever fails to find its mount).

   INTERACTION MODEL:
     - Auto-rotates by default (idle spin)
     - Drag / swipe (mouse OR touch, same pointer
       events) to orbit the view — works identically
       on desktop and mobile
     - Pinch (touch) or Ctrl+wheel (desktop
       trackpad/mouse) to zoom in/out
     - Tap OR click a node to focus it — handled via
       a single pointer-based hit-test (see notes by
       endDrag() below) so it behaves identically on
       mouse and touchscreen devices
     - Releasing resumes auto-rotate after a pause
     - prefers-reduced-motion disables the automatic
       idle spin only — manual drag/pinch/zoom still
       work either way

   GEOMETRY NOTE:
     Each node's position is a true point on a unit
     sphere (radius R), placed with:
       arm:      rotateY(theta) rotateX(-phi)
       satWrap:  translateZ(R)
     ...so the whole thing is a real sphere, not a
     flat ring — rotating it from any angle keeps
     every node on the surface, and latitude rings
     (flat discs laid at rotateX(90deg) translateZ)
     shrink toward the poles just like a globe.
   ============================================= */

(function () {

  const MOUNT_ID = "hero-orbit-mount";
  const mount = document.getElementById(MOUNT_ID);

  if (!mount) {
    console.warn(
      '[hero-scroll.js] No element with id="' + MOUNT_ID + '" found on this page — ' +
      "the Hero Orbit globe was not rendered. Add <div id=\"" + MOUNT_ID + "\"></div> " +
      "wherever the hero visual should appear, then reload."
    );
    return;
  }

  /* Hide the static SVG fallback that lives alongside the mount —
     it stays in the DOM as a no-JS / failure safety net only. */
  const heroArt = mount.closest(".hero-art");
  if (heroArt) {
    const fallbackSvg = heroArt.querySelector("svg");
    if (fallbackSvg) fallbackSvg.style.display = "none";
  }

  /* ─────────────────────────────────────────
     SCOPED STYLES
  ───────────────────────────────────────── */
  const styles = document.createElement("style");
  styles.textContent = `
    #${MOUNT_ID} {
      --ho-radius: 210px;
    }
    .hero-orbit-panel {
      max-width: 620px;
      width: 100%;
      text-align: center;
      margin: 0 auto;
    }
    .hero-orbit-eyebrow {
      font-family: var(--mono, monospace);
      font-size: .7rem;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: var(--muted, #7d8b99);
      margin-bottom: 8px;
    }
    .hero-orbit-eyebrow span { color: var(--signal, #5eead4); }

    .hero-orbit-scene {
      position: relative;
      width: 100%;
      max-width: 520px;
      aspect-ratio: 1/1;
      margin: 20px auto 10px;
      perspective: 1000px;
      cursor: grab;
      touch-action: none;
    }
    .hero-orbit-scene.hero-orbit-dragging { cursor: grabbing; }
    .hero-orbit-halo {
      position: absolute;
      inset: -8%;
      background: radial-gradient(circle, rgba(94,234,212,.16) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-orbit-world {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      transform: rotateX(-14deg) rotateY(0deg) scale(1);
    }

    /* ---- latitude rings (decorative, give the "globe" read) ---- */
    .hero-orbit-ring {
      position: absolute;
      left: 50%; top: 50%;
      border-radius: 50%;
      border: 1px solid rgba(94,234,212,.22);
      transform-style: preserve-3d;
      pointer-events: none;
    }
    .hero-orbit-ring.hero-orbit-equator {
      border-color: rgba(94,234,212,.34);
    }

    /* ---- faint background dots scattered on the sphere for texture ---- */
    .hero-orbit-dot {
      position: absolute;
      left: 0; top: 0;
      width: 4px; height: 4px;
      margin: -2px 0 0 -2px;
      border-radius: 50%;
      background: var(--muted, #7d8b99);
      opacity: .35;
      pointer-events: none;
    }

    .hero-orbit-hub {
      position: absolute;
      left: 50%; top: 50%;
      width: 110px; height: 110px;
      margin: -55px 0 0 -55px;
      transform-style: preserve-3d;
    }
    .hero-orbit-hub-glow {
      position: absolute;
      inset: -38px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(94,234,212,.5) 0%, transparent 70%);
      animation: heroOrbitPulse 3.2s ease-in-out infinite;
    }
    @keyframes heroOrbitPulse { 0%,100% { opacity:.35; } 50% { opacity:.7; } }
    .hero-orbit-hub-box {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      background: var(--bg-2, #131a22);
      border: 1.75px solid var(--signal, #5eead4);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: heroOrbitHubScale 3.2s ease-in-out infinite;
    }
    @keyframes heroOrbitHubScale { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
    .hero-orbit-hub-box span {
      font-family: var(--mono, monospace);
      font-size: .78rem;
      color: var(--signal, #5eead4);
      letter-spacing: .05em;
    }

    .hero-orbit-arm { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
    .hero-orbit-spoke {
      position: absolute; left: 0; top: 0;
      height: 2px; width: var(--ho-radius);
      background: linear-gradient(90deg, var(--signal, #5eead4), rgba(94,234,212,0));
      transform-origin: 0 50%;
      opacity: .55;
    }
    .hero-orbit-sat-wrap { position: absolute; left: 0; top: 0; transform-style: preserve-3d; }
    .hero-orbit-sat-billboard { position: absolute; left: 0; top: 0; width: 138px; height: 80px; margin: -40px 0 0 -69px; }

    .hero-orbit-sat-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    .hero-orbit-sat-node .hero-orbit-pill {
      width: 70px; height: 70px;
      border-radius: 18px;
      background: var(--bg-2, #131a22);
      border: 1.5px solid var(--signal, #5eead4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s ease, box-shadow .2s ease;
      font-size: 26px;
    }
    .hero-orbit-sat-node .hero-orbit-pill svg { display: block; }
    .hero-orbit-sat-node.hero-orbit-warn .hero-orbit-pill { border-color: var(--warn, #f0b86e); }
    .hero-orbit-sat-node:hover .hero-orbit-pill { transform: scale(1.08); }
    .hero-orbit-sat-node.hero-orbit-active .hero-orbit-pill { box-shadow: 0 0 0 4px var(--signal-dim, #2b5c54); }
    .hero-orbit-sat-label {
      font-family: var(--mono, monospace);
      font-size: .6rem;
      letter-spacing: .06em;
      color: var(--muted, #7d8b99);
      white-space: nowrap;
      text-align: center;
    }

    .hero-orbit-stage-info {
      min-height: 40px;
      max-width: 340px;
      margin: 6px auto 0;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hero-orbit-hint {
      font-family: var(--mono, monospace);
      font-size: .66rem;
      letter-spacing: .08em;
      color: var(--muted, #7d8b99);
      opacity: .8;
      transition: opacity .25s ease;
    }
    .hero-orbit-caption {
      font-size: .82rem;
      line-height: 1.5;
      color: var(--ink, #dde3ea);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity .25s ease, transform .25s ease;
    }
    .hero-orbit-caption .hero-orbit-tag {
      font-family: var(--mono, monospace);
      font-size: .68rem;
      letter-spacing: .1em;
      color: var(--signal, #5eead4);
      display: block;
      margin-bottom: 3px;
    }
    .hero-orbit-caption .hero-orbit-view {
      display: inline-block;
      margin-top: 6px;
      font-family: var(--mono, monospace);
      font-size: .68rem;
      letter-spacing: .05em;
      color: var(--signal, #5eead4);
      text-decoration: none;
      border-bottom: 1px solid var(--signal-dim, #2b5c54);
    }
    .hero-orbit-caption .hero-orbit-view:hover { border-color: currentColor; }
    .hero-orbit-stage-info.hero-orbit-focused .hero-orbit-hint { opacity: 0; }
    .hero-orbit-stage-info.hero-orbit-focused .hero-orbit-caption { opacity: 1; transform: translateY(0); }

    @media (prefers-reduced-motion: reduce) {
      .hero-orbit-hub-glow, .hero-orbit-hub-box { animation: none !important; }
    }
  `;
  document.head.appendChild(styles);

  /* ─────────────────────────────────────────
     BUILD MARKUP INTO THE MOUNT POINT
  ───────────────────────────────────────── */
  mount.innerHTML = `
    <div class="hero-orbit-panel">
      <div class="hero-orbit-scene" id="heroOrbitScene">
        <div class="hero-orbit-halo"></div>
        <div class="hero-orbit-world" id="heroOrbitWorld">
          <!-- latitude rings + hub + satellites injected below -->
        </div>
      </div>

      <div class="hero-orbit-stage-info" id="heroOrbitStageInfo">
        <p class="hero-orbit-hint" id="heroOrbitHint">Drag to look around · Pinch/Ctrl+scroll to zoom · Tap a node</p>
        <p class="hero-orbit-caption" id="heroOrbitCaption">
          <span class="hero-orbit-tag" id="heroOrbitCaptionTag">TAG</span>
          <span id="heroOrbitCaptionText">Text</span>
          <a href="#" class="hero-orbit-view" id="heroOrbitCaptionLink">→ view_project</a>
        </p>
      </div>
    </div>
  `;

  const world = mount.querySelector("#heroOrbitWorld");
  const scene = mount.querySelector("#heroOrbitScene");
  const stageInfo = mount.querySelector("#heroOrbitStageInfo");
  const captionTag = mount.querySelector("#heroOrbitCaptionTag");
  const captionText = mount.querySelector("#heroOrbitCaptionText");
  const captionLink = mount.querySelector("#heroOrbitCaptionLink");

  /* ---- hub (dead center of the sphere) ---- */
  const hub = document.createElement("div");
  hub.className = "hero-orbit-hub";
  hub.innerHTML = `
    <div class="hero-orbit-hub-glow"></div>
    <div class="hero-orbit-hub-box"><span>BS</span></div>
  `;
  world.appendChild(hub);

  /* ─────────────────────────────────────────
     LATITUDE RINGS (decorative globe lines)
     Each ring is a flat disc laid in the XZ
     plane at a given latitude, radius shrinks
     toward the poles like real lines of latitude.
  ───────────────────────────────────────── */
  const RING_LATITUDES = [-55, -28, 0, 28, 55]; // degrees
  const ringEls = [];
  RING_LATITUDES.forEach((lat) => {
    const ring = document.createElement("div");
    ring.className = "hero-orbit-ring" + (lat === 0 ? " hero-orbit-equator" : "");
    world.appendChild(ring);
    ringEls.push({ el: ring, lat });
  });

  function layoutRings() {
    const R = parseFloat(getComputedStyle(mount).getPropertyValue("--ho-radius")) || 150;
    ringEls.forEach(({ el, lat }) => {
      const rad = (lat * Math.PI) / 180;
      const ringRadius = R * Math.cos(rad) * 1.05; // slightly outside node radius
      const yOffset = R * Math.sin(rad);
      el.style.width = ringRadius * 2 + "px";
      el.style.height = ringRadius * 2 + "px";
      el.style.marginLeft = -ringRadius + "px";
      el.style.marginTop = -ringRadius + "px";
      el.style.transform = `rotateX(90deg) translateZ(${yOffset}px)`;
    });
  }

  /* ─────────────────────────────────────────
     BACKGROUND TEXTURE DOTS (scattered, non-interactive)
  ───────────────────────────────────────── */
  const DOT_COUNT = 22;
  const dotEls = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    // spread pseudo-randomly across the sphere surface
    const theta = (i * 137.5) % 360; // golden-angle spread for even distribution
    const phi = -70 + (i * 53) % 140; // between -70 and 70
    const dot = document.createElement("div");
    dot.className = "hero-orbit-dot";

    const arm = document.createElement("div");
    arm.className = "hero-orbit-arm";
    const wrap = document.createElement("div");
    wrap.className = "hero-orbit-sat-wrap";
    wrap.appendChild(dot);
    arm.appendChild(wrap);
    world.appendChild(arm);

    dotEls.push({ arm, wrap, theta, phi });
  }

  function layoutDots() {
    const R = parseFloat(getComputedStyle(mount).getPropertyValue("--ho-radius")) || 150;
    const dotR = R * 1.18; // just outside the node sphere, background texture
    dotEls.forEach(({ arm, wrap, theta, phi }) => {
      arm.style.transform = `rotateY(${theta}deg) rotateX(${-phi}deg)`;
      wrap.style.transform = `translateZ(${dotR}px)`;
    });
  }

  /* ─────────────────────────────────────────
     SATELLITE DATA — all 5 automation projects,
     placed at real longitude (theta) + latitude
     (phi) points on the sphere.

     NOTE on icons: GoHighLevel was previously using
     the same calendar emoji (📅) as the Booking node
     (🗓️) — the two read as duplicates at a glance.
     It now uses an inline funnel SVG instead, since
     GoHighLevel is fundamentally a lead-funnel/CRM
     platform, and it also reads more crisply than an
     emoji at this pill size.
  ───────────────────────────────────────── */
  // All five node icons share one visual language: a thin outlined SVG
  // in the site's signal-teal, same stroke weight and cap style, so they
  // read as one coherent icon set rather than a mix of emoji + one SVG.
  const FUNNEL_ICON    = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--signal, #5eead4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18l-7 8v6l-4 2v-8L3 4z"/></svg>`;
  const CHAT_ICON       = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--signal, #5eead4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-3.8 7.1 8.5 8.5 0 0 1-9.4 0L3 21l1.4-4.7A8.38 8.38 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/></svg>`;
  const BOX_ICON        = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--signal, #5eead4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>`;
  const CALENDAR_ICON   = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--signal, #5eead4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
  const PIPELINE_ICON   = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--signal, #5eead4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;

  const SAT = [
    { key: "messenger", theta: 0, phi: 8, label: "MESSENGER AI\nLEAD AGENT", icon: CHAT_ICON, warn: false,
      href: "messenger-ai-agent.html",
      caption: "Live on Facebook Messenger — qualifies leads 24/7 and logs them automatically." },
    { key: "order", theta: 72, phi: -18, label: "ORDER\nAUTOMATION", icon: BOX_ICON, warn: false,
      href: "order-automation.html",
      caption: "Extracts order details by AI, calculates totals, then runs the full retention loop." },
    { key: "reservation", theta: 144, phi: 18, label: "RESERVATION\n(GOHIGHLEVEL)", icon: FUNNEL_ICON, warn: true,
      href: "chief-sizzling-grill.html",
      caption: "Booking automation built in GoHighLevel — checks and confirms every reservation." },
    { key: "booking", theta: 216, phi: -8, label: "BOOKING\nAI AGENT", icon: CALENDAR_ICON, warn: false,
      href: "booking-agent.html",
      caption: "Tally form to Google Calendar check, AI-proposed alternatives, and auto-confirmation." },
    { key: "trello", theta: 288, phi: 4, label: "TRELLO\nONBOARDING", icon: PIPELINE_ICON, warn: false,
      href: "trello-onboarding.html",
      caption: "A 7-stage client pipeline in Trello — checklists, due dates, and alerts, all automatic." }
  ];

  const satNodes = [];
  SAT.forEach((s, i) => {
    const arm = document.createElement("div");
    arm.className = "hero-orbit-arm";

    const spoke = document.createElement("div");
    spoke.className = "hero-orbit-spoke";
    arm.appendChild(spoke);

    const satWrap = document.createElement("div");
    satWrap.className = "hero-orbit-sat-wrap";

    const billboard = document.createElement("div");
    billboard.className = "hero-orbit-sat-billboard";

    const node = document.createElement("div");
    node.className = "hero-orbit-sat-node" + (s.warn ? " hero-orbit-warn" : "");
    node.innerHTML = `<div class="hero-orbit-pill">${s.icon}</div><div class="hero-orbit-sat-label">${s.label.replace("\n", "<br>")}</div>`;
    // NOTE: node-level click handling was removed on purpose — see the
    // comment above endDrag() for why a per-node "click" listener silently
    // fails for mouse users once the scene captures the pointer. Tap/click
    // is now detected centrally in endDrag() via elementFromPoint, which
    // behaves identically for mouse, touch, and pen.

    billboard.appendChild(node);
    satWrap.appendChild(billboard);
    arm.appendChild(satWrap);
    world.appendChild(arm);

    satNodes.push({ node, satWrap, billboard, spoke, arm, theta: s.theta, phi: s.phi });
  });

  function layoutSatellites() {
    const R = parseFloat(getComputedStyle(mount).getPropertyValue("--ho-radius")) || 150;
    satNodes.forEach(s => {
      s.arm.style.transform = `rotateY(${s.theta}deg) rotateX(${-s.phi}deg)`;
      s.spoke.style.width = R + "px";
      s.spoke.style.transform = "translateZ(0)"; // spoke stays in the arm's local XZ plane
      s.satWrap.style.transform = `translateZ(${R}px)`;
    });
  }

  function layoutAll() {
    layoutRings();
    layoutDots();
    layoutSatellites();
  }
  layoutAll();
  window.addEventListener("resize", layoutAll);

  /* ─────────────────────────────────────────
     ROTATION (both axes) + ZOOM STATE
  ───────────────────────────────────────── */
  let currentYaw = 0, targetYaw = 0;
  let currentPitch = -14, targetPitch = -14;
  let autoYaw = 0;
  let currentZoom = 1, targetZoom = 1;
  let dragging = false, lastX = 0, lastY = 0;
  let pointerDownX = 0, pointerDownY = 0, pointerMoved = false;
  let focusedIndex = -1;
  let resumeTimer = null;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function shortestTarget(current, desiredMod) {
    desiredMod = ((desiredMod % 360) + 360) % 360;
    const curMod = ((current % 360) + 360) % 360;
    let diff = desiredMod - curMod;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return current + diff;
  }

  function toggleFocus(i) {
    if (focusedIndex === i) { clearFocus(); return; }
    focusedIndex = i;
    clearTimeout(resumeTimer);
    targetYaw = shortestTarget(currentYaw, -SAT[i].theta);
    targetZoom = 1.28;
    satNodes.forEach((s, idx) => s.node.classList.toggle("hero-orbit-active", idx === i));
    stageInfo.classList.add("hero-orbit-focused");
    captionTag.textContent = SAT[i].label.replace("\n", " ");
    captionText.textContent = SAT[i].caption;
    captionLink.href = SAT[i].href;
  }
  function clearFocus() {
    focusedIndex = -1;
    targetZoom = 1;
    satNodes.forEach(s => s.node.classList.remove("hero-orbit-active"));
    stageInfo.classList.remove("hero-orbit-focused");
    autoYaw = currentYaw;
    scheduleResume(300);
  }

  function scheduleResume(delay) {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!dragging && focusedIndex === -1) autoYaw = currentYaw;
    }, delay);
  }

  /* ---- drag / swipe to look around (both axes, mouse + touch unified via pointer events) ---- */
  scene.addEventListener("pointerdown", (e) => {
    dragging = true;
    scene.classList.add("hero-orbit-dragging");
    lastX = e.clientX; lastY = e.clientY;
    pointerDownX = e.clientX; pointerDownY = e.clientY;
    pointerMoved = false;
    scene.setPointerCapture(e.pointerId);
    clearTimeout(resumeTimer);
  });
  scene.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    targetYaw += dx * 0.4;
    currentYaw += dx * 0.4;
    targetPitch = clamp(targetPitch - dy * 0.3, -60, 60);
    currentPitch = clamp(currentPitch - dy * 0.3, -60, 60);

    if (Math.abs(e.clientX - pointerDownX) > 6 || Math.abs(e.clientY - pointerDownY) > 6) {
      pointerMoved = true;
    }
  });

  /* ---- endDrag also doubles as unified tap/click handling ----
     Why not just use "click" on each node? Because scene.setPointerCapture()
     above (needed so drag-to-look-around keeps working even if the pointer
     leaves the scene) retargets ALL subsequent pointer/mouse events —
     including the synthetic "click" — to the capturing element (the scene),
     not whatever DOM node is visually under the pointer. That silently broke
     mouse clicks on nodes (touch sometimes still worked because some
     browsers hit-test touch-driven clicks differently).
     The fix: do our own hit-test here with elementFromPoint, which is
     unaffected by pointer capture and works identically for mouse, touch,
     and pen. If the pointer barely moved since pointerdown, treat it as a
     tap/click rather than a drag. */
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    scene.classList.remove("hero-orbit-dragging");
    autoYaw = currentYaw;
    targetYaw = currentYaw;

    if (!pointerMoved && e && typeof e.clientX === "number") {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = hit && hit.closest(".hero-orbit-sat-node");
      if (nodeEl) {
        const idx = satNodes.findIndex(s => s.node === nodeEl);
        if (idx !== -1) { toggleFocus(idx); return; }
      } else if (focusedIndex !== -1) {
        clearFocus();
        return;
      }
    }

    if (focusedIndex === -1) scheduleResume(1200);
  }
  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);
  scene.addEventListener("pointerleave", () => { if (dragging) endDrag(); });

  /* ---- wheel to zoom (ctrl/pinch-trackpad only, so page scroll still works) ---- */
  scene.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return; // avoid hijacking normal page scroll
    e.preventDefault();
    targetZoom = clamp(targetZoom - e.deltaY * 0.0016, 0.6, 1.8);
  }, { passive: false });

  /* ---- pinch to zoom (touch) — same on mobile as desktop, no separate fallback ---- */
  let pinchStartDist = null, pinchStartZoom = 1;
  scene.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartZoom = targetZoom;
      clearTimeout(resumeTimer);
    }
  }, { passive: true });
  scene.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      targetZoom = clamp(pinchStartZoom * (d / pinchStartDist), 0.6, 1.8);
    }
  }, { passive: false });
  scene.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinchStartDist = null; });
  function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }

  /* ─────────────────────────────────────────
     ANIMATION LOOP
  ───────────────────────────────────────── */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame() {
    if (!dragging && focusedIndex === -1 && !reduceMotion) {
      autoYaw += 0.045;
      targetYaw = autoYaw;
    }
    currentYaw += (targetYaw - currentYaw) * 0.09;
    currentPitch += (targetPitch - currentPitch) * 0.09;
    currentZoom += (targetZoom - currentZoom) * 0.12;

    world.style.transform = `rotateX(${currentPitch}deg) rotateY(${currentYaw}deg) scale(${currentZoom})`;

    satNodes.forEach(s => {
      // counter-rotate the billboard so the pill/label keep facing the camera
      // (counters this node's own latitude tilt + its longitude + the world's current yaw)
      const counterYaw = -(s.theta + currentYaw);
      s.billboard.style.transform = `rotateX(${s.phi}deg) rotateY(${counterYaw}deg)`;
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

})();
