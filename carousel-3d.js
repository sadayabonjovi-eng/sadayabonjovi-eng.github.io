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
    // Shared step handler used by keyboard arrows AND the new visible buttons
    function step(direction) {
      // direction: 1 = next/right, -1 = prev/left
      rotation -= direction * angleStep;
      apply();
      stopAuto();
      scheduleResume();
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

    // --- Visible prev/next buttons (new) ---
    // These make navigation discoverable without relying on anyone finding
    // the keyboard shortcut or knowing to click-drag first.
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

    prevBtn.addEventListener('click', function () {
      step(-1);
      stage.focus();
    });
    nextBtn.addEventListener('click', function () {
      step(1);
      stage.focus();
    });

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    root.appendChild(nav);

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
