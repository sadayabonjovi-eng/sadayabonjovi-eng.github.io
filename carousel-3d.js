(function () {
  function initCarousel(root) {
    var stage = root.querySelector('.carousel-stage');
    var ring = root.querySelector('.carousel-ring');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.carousel-card'));
    var n = cards.length;
    if (!n || !stage || !ring) return;

    var angleStep = 360 / n;

    function positionCards(cardWidth) {
      var radius = Math.round((cardWidth / 2) / Math.tan(Math.PI / n)) + 60;
      cards.forEach(function (card, i) {
        var angle = angleStep * i;
        card.style.transform = 'rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
      });
    }
    positionCards(root.dataset.cardWidth ? parseInt(root.dataset.cardWidth, 10) : 230);

    var rotation = 0;
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startRotation = 0;
    var autoTimer = null;
    var resumeTimer = null;

    // Continuous idle drift — slow and steady, not a stepped/jump-cut auto-advance
    var AUTO_SPEED_DEG = 0.028; // per tick — slow, deliberate spin
    var AUTO_TICK_MS = 30;

    function apply(withTransition) {
      ring.style.transition = withTransition
        ? 'transform .55s cubic-bezier(.22,.9,.32,1)'
        : 'none';
      ring.style.transform = 'rotateY(' + rotation + 'deg)';
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(function () {
        rotation -= AUTO_SPEED_DEG;
        apply(false);
      }, AUTO_TICK_MS);
    }
    function stopAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    }
    function scheduleResume() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(startAuto, 2400);
    }

    // Snap forward/back by exactly one card, with a smooth transition —
    // used by arrow buttons and arrow keys
    function step(direction) {
      stopAuto();
      rotation -= direction * angleStep;
      apply(true);
      scheduleResume();
    }

    // Drag: free-spins the wheel directly under the pointer, no snapping
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startRotation = rotation;
      stopAuto();
      clearTimeout(resumeTimer);
      stage.style.cursor = 'grabbing';
    });
    document.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) e.preventDefault();
      rotation = startRotation + dx * 0.4;
      apply(false);
    }, { passive: false });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      stage.style.cursor = 'grab';
      scheduleResume();
    }
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    stage.setAttribute('tabindex', '0');
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', 'Drag to rotate project cards, or use the arrow buttons / arrow keys');
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { step(1); }
      if (e.key === 'ArrowLeft') { step(-1); }
    });
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (moved) e.preventDefault();
      });
    });

    // Visible prev/next buttons
    var nav = document.createElement('div');
    nav.className = 'carousel-nav';

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'carousel-arrow carousel-arrow-prev';
    prevBtn.setAttribute('aria-label', 'Previous card');
    prevBtn.innerHTML = '&#8592;';

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'carousel-arrow carousel-arrow-next';
    nextBtn.setAttribute('aria-label', 'Next card');
    nextBtn.innerHTML = '&#8594;';

    prevBtn.addEventListener('click', function () { step(-1); stage.focus(); });
    nextBtn.addEventListener('click', function () { step(1); stage.focus(); });

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    root.appendChild(nav);

    apply(false);
    startAuto();

    window.addEventListener('resize', function () {
      var newCardWidth = root.dataset.cardWidth
        ? parseInt(root.dataset.cardWidth, 10)
        : (window.innerWidth < 560 ? 190 : 230);
      positionCards(newCardWidth);
    });
  }

  function init() {
    document.querySelectorAll('.carousel-3d').forEach(initCarousel);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
