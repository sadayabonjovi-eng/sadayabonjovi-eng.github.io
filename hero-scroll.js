/* =============================================
   Bon's Portfolio — hero-scroll.js
   Hero Orbit — interactive 3D satellite scene
   showing the 3 flagship automation projects
   orbiting a central hub.

   Ported from the standalone "Hero Orbit —
   Prototype" demo into a self-contained,
   self-mounting script:
     - injects its own scoped CSS (prefixed
       hero-orbit-* so nothing collides with
       existing site styles)
     - looks for a mount point in the page:
         <div id="hero-orbit-mount"></div>
     - if that mount point isn't found, this
       logs a clear console warning and does
       NOT render anything — no silent failure,
       no guessing at where to inject itself
       into your layout.

   TO USE: add this one line wherever the hero
   visual should live (likely the second column
   of index.html's header, since other pages
   override that header to a single column):

     <div id="hero-orbit-mount"></div>

   ...then include this file before </body>:

     <script src="hero-scroll.js"></script>
   ============================================= */

(function () {

  const MOUNT_ID = "hero-orbit-mount";
  const mount = document.getElementById(MOUNT_ID);

  if (!mount) {
    console.warn(
      '[hero-scroll.js] No element with id="' + MOUNT_ID + '" found on this page — ' +
      "the Hero Orbit scene was not rendered. Add <div id=\"" + MOUNT_ID + "\"></div> " +
      "wherever the hero visual should appear, then reload."
    );
    return;
  }

  /* ─────────────────────────────────────────
     SCOPED STYLES
     All selectors prefixed hero-orbit-* to
     avoid collisions with existing site CSS.
     Uses the site's own CSS variable tokens
     (--signal, --bg-2, etc.) where available,
     with fallbacks in case a page hasn't
     defined them.
  ───────────────────────────────────────── */
  const styles = document.createElement("style");
  styles.textContent = `
    #${MOUNT_ID} {
      --ho-radius: 145px;
    }
    .hero-orbit-panel {
      max-width: 460px;
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
      max-width: 380px;
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
    .hero-orbit-floor {
      position: absolute;
      left: 50%; top: 50%;
      width: 230px; height: 230px;
      margin: -115px 0 0 -115px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(94,234,212,.12) 0%, transparent 70%);
      transform: rotateX(90deg) translateZ(-40px);
    }

    .hero-orbit-hub {
      position: absolute;
      left: 50%; top: 50%;
      width: 82px; height: 82px;
      margin: -41px 0 0 -41px;
      transform-style: preserve-3d;
    }
    .hero-orbit-hub-glow {
      position: absolute;
      inset: -28px;
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
      font-size: .65rem;
      color: var(--signal, #5eead4);
      letter-spacing: .05em;
    }

    .hero-orbit-arm { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
    .hero-orbit-spoke {
      position: absolute; left: 0; top: 0;
      height: 2px; width: var(--ho-radius);
      background: linear-gradient(90deg, var(--signal, #5eead4), rgba(94,234,212,0));
      transform-origin: 0 50%;
      opacity: .6;
    }
    .hero-orbit-sat-wrap { position: absolute; left: 0; top: 0; transform-style: preserve-3d; }
    .hero-orbit-sat-billboard { position: absolute; left: 0; top: 0; width: 104px; height: 60px; margin: -30px 0 0 -52px; }

    .hero-orbit-sat-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    .hero-orbit-sat-node .hero-orbit-pill {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: var(--bg-2, #131a22);
      border: 1.5px solid var(--signal, #5eead4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s ease, box-shadow .2s ease;
      font-size: 20px;
    }
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
          <div class="hero-orbit-floor"></div>
          <div class="hero-orbit-hub">
            <div class="hero-orbit-hub-glow"></div>
            <div class="hero-orbit-hub-box"><span>BS</span></div>
          </div>
          <!-- satellites injected below -->
        </div>
      </div>

      <div class="hero-orbit-stage-info" id="heroOrbitStageInfo">
        <p class="hero-orbit-hint" id="heroOrbitHint">Drag to look around · Scroll/pinch to zoom · Tap a node</p>
        <p class="hero-orbit-caption" id="heroOrbitCaption">
          <span class="hero-orbit-tag" id="heroOrbitCaptionTag">TAG</span>
          <span id="heroOrbitCaptionText">Text</span>
        </p>
      </div>
    </div>
  `;

  /* ─────────────────────────────────────────
     SATELLITE DATA — the 3 flagship projects
  ───────────────────────────────────────── */
  const SAT = [
    { key: "messenger", angle: 0, label: "MESSENGER AI\nLEAD AGENT", icon: "💬", warn: false,
      caption: "Live on Facebook Messenger — qualifies leads 24/7 and logs them automatically." },
    { key: "order", angle: 120, label: "ORDER\nAUTOMATION", icon: "📦", warn: false,
      caption: "Extracts order details by AI, calculates totals, then runs the full retention loop." },
    { key: "reservation", angle: 240, label: "RESERVATION\n(GOHIGHLEVEL)", icon: "📅", warn: true,
      caption: "Booking automation built in GoHighLevel — checks and confirms every reservation." }
  ];

  const world = mount.querySelector("#heroOrbitWorld");
  const scene = mount.querySelector("#heroOrbitScene");
  const stageInfo = mount.querySelector("#heroOrbitStageInfo");
  const captionTag = mount.querySelector("#heroOrbitCaptionTag");
  const captionText = mount.querySelector("#heroOrbitCaptionText");

  const satNodes = [];
  SAT.forEach((s, i) => {
    const arm = document.createElement("div");
    arm.className = "hero-orbit-arm";
    arm.style.transform = `rotateY(${s.angle}deg)`;

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
    node.addEventListener("click", (e) => { e.stopPropagation(); toggleFocus(i); });

    billboard.appendChild(node);
    satWrap.appendChild(billboard);
    arm.appendChild(satWrap);
    world.appendChild(arm);

    satNodes.push({ node, satWrap, billboard, spoke, angle: s.angle });
  });

  function setRadius() {
    const r = parseFloat(getComputedStyle(mount).getPropertyValue("--ho-radius")) || 145;
    satNodes.forEach(s => {
      s.spoke.style.width = r + "px";
      s.satWrap.style.transform = `translateX(${r}px)`;
    });
  }
  setRadius();
  window.addEventListener("resize", setRadius);

  /* ─────────────────────────────────────────
     ROTATION (both axes) + ZOOM STATE
  ───────────────────────────────────────── */
  let currentYaw = 0, targetYaw = 0;
  let currentPitch = -14, targetPitch = -14;
  let autoYaw = 0;
  let currentZoom = 1, targetZoom = 1;
  let dragging = false, lastX = 0, lastY = 0;
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
    targetYaw = shortestTarget(currentYaw, -SAT[i].angle);
    targetZoom = 1.28;
    satNodes.forEach((s, idx) => s.node.classList.toggle("hero-orbit-active", idx === i));
    stageInfo.classList.add("hero-orbit-focused");
    captionTag.textContent = SAT[i].label.replace("\n", " ");
    captionText.textContent = SAT[i].caption;
  }
  function clearFocus() {
    focusedIndex = -1;
    targetZoom = 1;
    satNodes.forEach(s => s.node.classList.remove("hero-orbit-active"));
    stageInfo.classList.remove("hero-orbit-focused");
    autoYaw = currentYaw;
    scheduleResume(300);
  }
  scene.addEventListener("click", () => { if (focusedIndex !== -1) clearFocus(); });

  function scheduleResume(delay) {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!dragging && focusedIndex === -1) autoYaw = currentYaw;
    }, delay);
  }

  /* ---- drag to look around (both axes) ---- */
  scene.addEventListener("pointerdown", (e) => {
    dragging = true;
    scene.classList.add("hero-orbit-dragging");
    lastX = e.clientX; lastY = e.clientY;
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
    targetPitch = clamp(targetPitch - dy * 0.3, -50, 20);
    currentPitch = clamp(currentPitch - dy * 0.3, -50, 20);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    scene.classList.remove("hero-orbit-dragging");
    autoYaw = currentYaw;
    targetYaw = currentYaw;
    if (focusedIndex === -1) scheduleResume(1200);
  }
  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);
  scene.addEventListener("pointerleave", () => { if (dragging) endDrag(); });

  /* ---- wheel to zoom (ctrl/pinch-trackpad only, so page scroll still works) ---- */
  scene.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return; // avoid hijacking normal page scroll
    e.preventDefault();
    targetZoom = clamp(targetZoom - e.deltaY * 0.0016, 0.7, 1.6);
  }, { passive: false });

  /* ---- pinch to zoom (touch) ---- */
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
      targetZoom = clamp(pinchStartZoom * (d / pinchStartDist), 0.7, 1.6);
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
      const counter = -(s.angle + currentYaw);
      s.billboard.style.transform = `rotateY(${counter}deg)`;
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

})();
