/* =============================================
   Bon's Portfolio — scroll-cinematic.js
   Modern 3D scroll-triggered reveal animations
   for the "featured builds" section, the
   view-all link, and the service block.

   Does NOT touch the hero globe — that's
   handled entirely by hero-scroll.js.

   Loads GSAP + ScrollTrigger from cdnjs (same
   CDN already trusted on this page for three.js),
   then wires up:
     - section heading: masked slide-up reveal
     - feat-cards: fly in from depth (rotateX +
       translateZ + fade), staggered per card,
       with a subtle tilt-on-scroll while pinned
       in view
     - view-all link: fade + slide
     - service-block: 3D flip-in from the side
       with its list items staggering in after

   Respects prefers-reduced-motion — if set, all
   elements simply fade in with no 3D motion and
   no scrub-linked movement.
   ============================================= */

(function () {

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function init() {
    // GSAP + ScrollTrigger (same CDN already used on this page for three.js)
    if (!window.gsap) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
    }
    if (!window.ScrollTrigger) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
    }
    if (!window.gsap || !window.ScrollTrigger) return; // CDN failed — page still works, just static

    gsap.registerPlugin(ScrollTrigger);

    /* ---- scoped styles: sets up 3D stage + starting states so there's
       no flash-of-unstyled-content before GSAP takes over ---- */
    const style = document.createElement("style");
    style.textContent = `
      .featured-grid, .service-block { perspective: 1200px; }
      .sc-heading, .sc-intro, .feat-card, .view-all-wrap, .service-block {
        will-change: transform, opacity;
      }
      @media (prefers-reduced-motion: reduce) {
        .feat-card, .service-block, .sc-heading, .sc-intro, .view-all-wrap { transition: opacity .4s ease; }
      }
    `;
    document.head.appendChild(style);

    const container = document.querySelector(".container");
    if (!container) return;

    const heading = container.querySelector("h2");
    const intro = container.querySelector(".container-intro");
    const cards = gsap.utils.toArray(".feat-card");
    const viewAll = container.querySelector(".view-all-wrap");
    const serviceBlock = container.querySelector(".service-block");
    const serviceItems = serviceBlock ? gsap.utils.toArray(".services-list li", serviceBlock) : [];

    if (heading) heading.classList.add("sc-heading");
    if (intro) intro.classList.add("sc-intro");

    if (reduceMotion) {
      // Simple fade-in only, no 3D/scrub — respect the user's motion preference.
      [heading, intro, ...cards, viewAll, serviceBlock].filter(Boolean).forEach(el => {
        gsap.set(el, { opacity: 0 });
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => gsap.to(el, { opacity: 1, duration: 0.5 })
        });
      });
      return;
    }

    /* ---- heading + intro: masked slide-up reveal ---- */
    if (heading && intro) {
      gsap.set([heading, intro], { opacity: 0, y: 34 });
      gsap.to([heading, intro], {
        opacity: 1, y: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: heading, start: "top 85%", once: true }
      });
    }

    /* ---- feat-cards: fly in from depth, staggered, then a subtle
       scroll-linked tilt while they cross the viewport ---- */
    cards.forEach((card, i) => {
      gsap.set(card, {
        opacity: 0,
        y: 70,
        z: -220,
        rotateX: -22,
        transformOrigin: "50% 100%"
      });
      gsap.to(card, {
        opacity: 1, y: 0, z: 0, rotateX: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 88%",
          once: true
        }
      });

      // continuous subtle tilt tied to scroll progress — reads as "cinematic depth"
      gsap.to(card, {
        rotateX: 4,
        rotateY: i % 2 === 0 ? -3 : 3,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6
        }
      });
    });

    /* ---- view-all link: simple fade + rise ---- */
    if (viewAll) {
      gsap.set(viewAll, { opacity: 0, y: 20 });
      gsap.to(viewAll, {
        opacity: 1, y: 0, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: viewAll, start: "top 92%", once: true }
      });
    }

    /* ---- service block: 3D flip-in from the right, list items cascade in after ---- */
    if (serviceBlock) {
      gsap.set(serviceBlock, {
        opacity: 0,
        rotateY: 18,
        x: 60,
        transformOrigin: "0% 50%"
      });
      gsap.to(serviceBlock, {
        opacity: 1, rotateY: 0, x: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: serviceBlock, start: "top 85%", once: true }
      });

      if (serviceItems.length) {
        gsap.set(serviceItems, { opacity: 0, x: -16 });
        gsap.to(serviceItems, {
          opacity: 1, x: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: serviceBlock, start: "top 70%", once: true }
        });
      }
    }
  }

  init();

})();
