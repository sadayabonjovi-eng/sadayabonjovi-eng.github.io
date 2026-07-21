/* =============================================
   Bon's Portfolio — pipeline-connect.js
   Turns the existing .pipeline timeline (used on
   how-i-work.html) into a live "automation system
   connecting" animation:

     - the static vertical line becomes a glowing
       teal line that DRAWS itself downward as you
       scroll, with a bright "signal head" dot
       riding the leading edge — like a connection
       being wired in real time
     - each step's node dot lights up (fills solid
       + pulses) the moment the connecting line
       reaches it, as if that step just came online

   Self-contained: finds every .pipeline block on
   the page and wires each one independently. If no
   .pipeline exists, does nothing.

   Respects prefers-reduced-motion — line is fully
   drawn and all nodes lit immediately, no animation.
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
    const pipelines = document.querySelectorAll(".pipeline");
    if (!pipelines.length) return;

    if (!window.gsap) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
    }
    if (!window.ScrollTrigger) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
    }
    if (!window.gsap || !window.ScrollTrigger) return; // CDN failed — static timeline still works fine

    gsap.registerPlugin(ScrollTrigger);

    const style = document.createElement("style");
    style.textContent = `
      .pl-line-fill{
        position:absolute;
        left:7px; top:10px; bottom:10px;
        width:1px;
        background:linear-gradient(var(--signal), var(--signal));
        box-shadow:0 0 8px var(--signal);
        transform:scaleY(0);
        transform-origin:top center;
        pointer-events:none;
      }
      .pl-line-fill::after{
        content:"";
        position:absolute;
        left:50%; bottom:-3px;
        width:8px; height:8px;
        margin-left:-4px;
        border-radius:50%;
        background:var(--signal);
        box-shadow:0 0 10px 3px var(--signal);
      }
      .project::before{ transition:background .25s ease, box-shadow .25s ease; }
      .project.pl-active::before{
        background:var(--signal);
        box-shadow:0 0 0 4px var(--signal-dim), 0 0 14px 2px var(--signal);
        animation:plPulse .6s ease;
      }
      .project.is-service.pl-active::before{
        background:var(--warn);
        box-shadow:0 0 0 4px var(--signal-dim), 0 0 14px 2px var(--warn);
      }
      @keyframes plPulse{
        0%{ transform:scale(.55); }
        60%{ transform:scale(1.3); }
        100%{ transform:scale(1); }
      }
      @media (prefers-reduced-motion: reduce){
        .project.pl-active::before{ animation:none; }
      }
    `;
    document.head.appendChild(style);

    pipelines.forEach(pipeline => {
      const nodes = Array.from(pipeline.querySelectorAll(".project"));
      if (!nodes.length) return;

      const fill = document.createElement("div");
      fill.className = "pl-line-fill";
      pipeline.prepend(fill);

      if (reduceMotion) {
        gsap.set(fill, { scaleY: 1 });
        nodes.forEach(n => n.classList.add("pl-active"));
        return;
      }

      gsap.to(fill, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: pipeline,
          start: "top 72%",
          end: "bottom 60%",
          scrub: 0.5
        }
      });

      nodes.forEach(node => {
        ScrollTrigger.create({
          trigger: node,
          start: "top 68%",
          once: true,
          onEnter: () => node.classList.add("pl-active")
        });
      });
    });
  }

  init();

})();
