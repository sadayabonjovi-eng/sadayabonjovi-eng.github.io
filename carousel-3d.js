(function () {
  function initCarousel(root) {
    var stage = root.querySelector('.carousel-stage');
    var ring = root.querySelector('.carousel-ring');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.carousel-card'));
    var n = cards.length;
    if (!n || !stage || !ring) return;

    var cardWidth = root.dataset.cardWidth ? parseInt(root.dataset.cardWidth, 10) : 230;
    var angleStep = 360 / n;
    var radius = Math.round((cardWidth / 2) / Math.tan(Math.PI / n)) + 60;

    cards.forEach(function (card, i) {
      var angle = angleStep * i;
      card.style.transform = 'rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
    });

    var rotation = -angleStep * 0;
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startRotation = 0;
    var autoTimer = null;
    var resumeTimer = null;

    function apply() {
      ring.style.transform = 'rotateY(' + rotation + 'deg)';
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(function () {
        rotation += 0.045;
        apply();
      }, 30);
    }
    function stopAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    }
    function scheduleResume() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(startAuto, 2200);
    }

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
      rotation = startRotation + dx * 0.45;
      apply();
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
    stage.setAttribute('aria-label', 'Drag to rotate project cards, or use arrow keys');
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { rotation -= angleStep; apply(); stopAuto(); scheduleResume(); }
      if (e.key === 'ArrowLeft') { rotation += angleStep; apply(); stopAuto(); scheduleResume(); }
    });

    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (moved) e.preventDefault();
      });
    });

    apply();
    startAuto();

    window.addEventListener('resize', function () {
      var newCardWidth = root.dataset.cardWidth ? parseInt(root.dataset.cardWidth, 10) : (window.innerWidth < 560 ? 190 : 230);
      var newRadius = Math.round((newCardWidth / 2) / Math.tan(Math.PI / n)) + 60;
      cards.forEach(function (card, i) {
        var angle = angleStep * i;
        card.style.transform = 'rotateY(' + angle + 'deg) translateZ(' + newRadius + 'px)';
      });
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
