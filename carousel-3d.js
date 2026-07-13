(function () {
  function initCarousel(root) {
    var stage = root.querySelector('.carousel-stage');
    var ring = root.querySelector('.carousel-ring');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.carousel-card'));
    var n = cards.length;
    if (!n || !stage || !ring) return;

    function getStep() {
      // card width + the flex gap between cards, read live so resize keeps it accurate
      var cardRect = cards[0].getBoundingClientRect();
      var gap = parseFloat(getComputedStyle(ring).columnGap || getComputedStyle(ring).gap || 0) || 0;
      return cardRect.width + gap;
    }

    var index = 0;
    var offset = 0; // current translateX in px (negative moves left)
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startOffset = 0;
    var autoTimer = null;
    var resumeTimer = null;

    function maxIndex() { return n - 1; }

    function apply(withTransition) {
      ring.style.transition = withTransition ? 'transform .32s ease' : 'none';
      ring.style.transform = 'translateX(' + offset + 'px)';
      prevBtn.disabled = index <= 0;
      nextBtn.disabled = index >= maxIndex();
    }

    function goTo(newIndex, withTransition) {
      index = Math.max(0, Math.min(maxIndex(), newIndex));
      offset = -index * getStep();
      apply(withTransition !== false);
    }

    function step(direction) {
      goTo(index + direction, true);
      stopAuto();
      scheduleResume();
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(function () {
        var next = index + 1;
        if (next > maxIndex()) next = 0; // loop back to the start
        goTo(next, true);
      }, 3200);
    }
    function stopAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    }
    function scheduleResume() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(startAuto, 2600);
    }

    // Drag to slide, snaps to the nearest card on release
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startOffset = offset;
      stopAuto();
      clearTimeout(resumeTimer);
      stage.style.cursor = 'grabbing';
    });
    document.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) e.preventDefault();
      offset = startOffset + dx;
      apply(false);
    }, { passive: false });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      stage.style.cursor = 'grab';
      var dx = (e && e.clientX !== undefined ? e.clientX : startX) - startX;
      var threshold = getStep() * 0.2;
      if (dx <= -threshold) {
        goTo(index + 1, true);
      } else if (dx >= threshold) {
        goTo(index - 1, true);
      } else {
        goTo(index, true); // snap back to current card
      }
      scheduleResume();
    }
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    stage.setAttribute('tabindex', '0');
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', 'Drag to browse project cards, or use the arrow buttons / arrow keys');
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

    goTo(0, false);
    startAuto();

    window.addEventListener('resize', function () {
      goTo(index, false); // re-snap to the same card at the new card width
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
