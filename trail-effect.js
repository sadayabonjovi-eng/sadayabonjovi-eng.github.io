/* trail-effect.js
   Cursor trail of code-flavored tokens, active across the full page.
   Uses the site's existing CSS variables (--signal, --warn, --mono) so it
   automatically matches dark/light mode without any extra config.
*/
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  // Respect users who've asked for reduced motion — same guard the
  // .pulse status-dot animation already uses in style.css.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const TOKENS = ['++', '//', '**', '</', '/>', '${}', 'fn', 'let', '=>', '->', '{}', '()'];

  const SPAWN_SPACING = 12; // px between spawned tokens — tighter so slow movement still trails
  const MAX_STEPS_PER_MOVE = 6; // caps how many tokens one fast swipe can spawn at once
  let lastX = null;
  let lastY = null;

  function spawnToken(x, y) {
    const el = document.createElement('span');
    el.textContent = TOKENS[Math.floor(Math.random() * TOKENS.length)];

    // ~35% amber, ~65% teal — matches the site's existing accent ratio
    const color = Math.random() < 0.35 ? 'var(--warn)' : 'var(--signal)';

    Object.assign(el.style, {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      pointerEvents: 'none',
      zIndex: '5',
      fontFamily: 'var(--mono)',
      fontWeight: '600',
      fontSize: (12 + Math.random() * 10) + 'px',
      color: color,
      textShadow: `0 0 6px ${color}`,
      opacity: (0.7 + Math.random() * 0.3).toString(),
      transform: `translate(-50%, -50%) rotate(${Math.random() * 20 - 10}deg)`,
    });

    document.body.appendChild(el);

    const dx = (Math.random() - 0.5) * 30;
    const dy = (Math.random() - 0.5) * 30 - 14;
    const duration = 600 + Math.random() * 400;

    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
      el.style.transform += ` translate(${dx}px, ${dy}px) scale(0.7)`;
      el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), duration + 60);
  }

  function getPos(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function handleMove(e) {
    const { x, y } = getPos(e);

    if (lastX === null) {
      lastX = x;
      lastY = y;
      spawnToken(x, y);
      return;
    }

    const dx = x - lastX;
    const dy = y - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SPAWN_SPACING) return;

    // Walk along the segment from the last point to this one, dropping a
    // token every SPAWN_SPACING px, so fast swipes don't leave gaps —
    // but cap it so a huge fast swipe doesn't dump dozens of tokens at once.
    const steps = Math.min(Math.floor(dist / SPAWN_SPACING), MAX_STEPS_PER_MOVE);
    for (let i = 1; i <= steps; i++) {
      const t = (i * SPAWN_SPACING) / dist;
      spawnToken(lastX + dx * t, lastY + dy * t);
    }

    lastX = x;
    lastY = y;
  }

  // Listen on window with capture:true so this fires BEFORE any child
  // element (like the interactive 3D globe's own drag/zoom handlers) gets
  // a chance to call stopPropagation() and swallow the event.
  window.addEventListener('mousemove', handleMove, { capture: true });
  window.addEventListener('touchmove', handleMove, { capture: true, passive: true });
})();
