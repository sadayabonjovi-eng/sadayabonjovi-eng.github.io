/* ==========================================================================
   motion.js — auto scroll-reveal for the whole site
   Include on every page, after chatbot.js:
   <script src="motion.js"></script>
   No markup changes needed — it finds the usual content blocks itself.
   ========================================================================== */

(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SELECTOR = [
    '.project-card',
    '.category-card',
    '.info-card',
    '.section-block',
    '.build-event',
    '.demo-box',
    '.notice-box',
    '.step-table',
    '.diagram-wrap'
  ].join(',');

  var targets = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  if (!targets.length) return;

  if (reduceMotion) {
    // Skip animation entirely, just make sure everything is visible
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  // Light stagger for cards that sit next to each other in the same parent
  var groupCounters = new WeakMap();
  targets.forEach(function (el) {
    el.classList.add('reveal', 'reveal-stagger');
    var parent = el.parentElement;
    var count = groupCounters.get(parent) || 0;
    var delay = Math.min(count, 5) * 70; // cap stagger so long lists don't lag forever
    el.style.setProperty('--reveal-delay', delay + 'ms');
    groupCounters.set(parent, count + 1);
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  targets.forEach(function (el) { io.observe(el); });
})();
