/* trail-effect.js
   Cursor trail of code-flavored tokens, fired on hover over the hero <header>.
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

  let lastSpawn = 0;
  const SPAWN_INTERVAL = 25; // ms between spawns — keeps characters close together

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
    const now = Date.now();
    if (now - lastSpawn < SPAWN_INTERVAL) return;
    lastSpawn = now;
    const { x, y } = getPos(e);
    spawnToken(x, y);
  }

  header.addEventListener('mousemove', handleMove);
  header.addEventListener('touchmove', handleMove, { passive: true });
})();
