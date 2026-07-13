/* =============================================
   Bon's Portfolio AI Chatbot — chatbot.js
   Powered by Groq (FREE)
   + Interactive Cat Mascot System

   SETUP INSTRUCTIONS:
   1. Go to console.groq.com → sign up free (no credit card)
   2. Create an API Key → copy it
   3. Replace YOUR_GROQ_API_KEY_HERE below with your key
   4. Make sure your photo filename matches PHOTO_PATH
   5. Add these two lines before </body> on every page:
        <link rel="stylesheet" href="chatbot.css">
        <script src="chatbot.js"></script>

   ⚠️  NOTE: Your Groq key will be visible in source code
   on a public GitHub Pages site. Groq's free tier has
   rate limits that naturally prevent abuse, so this is
   generally fine for a personal portfolio.
   ============================================= */

(function () {

  /* ─────────────────────────────────────────
     CONFIG — fallback photo (used if no cat matches)
  ───────────────────────────────────────── */
  const FALLBACK_PHOTO_PATH = "files/profile-photo.png.png";

  /* ─────────────────────────────────────────
     CAT MASCOT SYSTEM
     Each cat "owns" a set of pages. We match
     the current page filename against this table
     to decide which cat, tagline, and photo to show.
  ───────────────────────────────────────── */
  const CATS = {
    salt: {
      name: "Salt",
      role: "Guide",
      tagline: "Your guide in.",
      intro: "Hi, I'm Salt — your guide in!",
      photo: "files/salt-adventurer.png"
    },
    ash: {
      name: "Ash",
      role: "Builder",
      tagline: "Builder on duty.",
      intro: "Hi, I'm Ash — builder on duty!",
      photo: "files/ash-mechanic.png"
    },
    pepper: {
      name: "Pepper",
      role: "Trust & Legal",
      tagline: "Keeping things honest.",
      intro: "Hi, I'm Pepper — keeping things honest!",
      photo: "files/pepper-knight.png"
    },
    amber: {
      name: "Amber",
      role: "Greeter",
      tagline: "Say hello.",
      intro: "Hi, I'm Amber — say hello!",
      photo: "files/amber-astronaut.png"
    }
  };

  // Pages that are NOT project pages but still map to a specific cat
  const PAGE_MAP = {
    "index.html": "salt",
    "": "salt",              // root path (e.g. sadayabonjovi-eng.github.io/)
    "about.html": "salt",
    "privacy-policy.html": "pepper",
    "contact.html": "amber",
    "automation.html": "ash"
  };

  // Any page not found above falls back to this list of "Ash" project pages
  const ASH_PROJECT_PAGES = [
    "booking-agent.html",
    "chief-sizzling-grill.html",
    "content-pipeline.html",
    "expense-tracker.html",
    "gmail-management.html",
    "google-calendar.html",
    "google-drive-management.html",
    "job-search-agent.html",
    "lead-qualification.html",
    "messenger-ai-agent.html",
    "notion-client-onboarding.html",
    "order-automation.html",
    "review-agent.html",
    "slideshow.html",
    "trello-onboarding.html",
    "va-skills.html",
    "weather-bot.html",
    "projects.html"
  ];

  function getCurrentPageFile() {
    const path = window.location.pathname;
    const file = path.substring(path.lastIndexOf("/") + 1);
    return file.toLowerCase();
  }

  function getActiveCatKey() {
    const file = getCurrentPageFile();
    if (PAGE_MAP.hasOwnProperty(file)) return PAGE_MAP[file];
    if (ASH_PROJECT_PAGES.indexOf(file) !== -1) return "ash";
    // Default fallback: treat unknown pages as Salt's (homepage-style) territory
    return "salt";
  }

  const ACTIVE_CAT_KEY = getActiveCatKey();
  const ACTIVE_CAT = CATS[ACTIVE_CAT_KEY];
  const PHOTO_PATH = ACTIVE_CAT ? ACTIVE_CAT.photo : FALLBACK_PHOTO_PATH;

  /* ─────────────────────────────────────────
     SESSION / LOCAL STORAGE HELPERS
  ───────────────────────────────────────── */
  const STORAGE_KEY = "bon_chat_history";
  const LAST_CAT_KEY = "bon_last_active_cat";      // sessionStorage — for handoff direction
  const INTRO_SEEN_KEY = "bon_intro_seen";         // localStorage — one-time intro gate

  function saveHistory(hist) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
    } catch (e) {}
  }

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function getLastActiveCat() {
    try {
      return sessionStorage.getItem(LAST_CAT_KEY);
    } catch { return null; }
  }

  function setLastActiveCat(catKey) {
    try {
      sessionStorage.setItem(LAST_CAT_KEY, catKey);
    } catch (e) {}
  }

  function hasSeenIntro() {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch { return true; } // if storage blocked, don't force intro
  }

  function markIntroSeen() {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch (e) {}
  }

  /* ─────────────────────────────────────────
     ACHIEVEMENT SYSTEM — "Meet the Crew"
     Tracks which cats a visitor has actually
     met (i.e. visited that cat's page), across
     the whole site, forever (localStorage).
  ───────────────────────────────────────── */
  const CATS_MET_KEY = "bon_cats_met";
  const CREW_CELEBRATED_KEY = "bon_crew_celebrated";
  const CAT_ORDER = ["salt", "ash", "pepper", "amber"];

  function getCatsMet() {
    try {
      const raw = localStorage.getItem(CATS_MET_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function markCatMet(catKey) {
    try {
      const met = getCatsMet();
      if (met.indexOf(catKey) === -1) {
        met.push(catKey);
        localStorage.setItem(CATS_MET_KEY, JSON.stringify(met));
      }
      return met;
    } catch { return getCatsMet(); }
  }

  function hasCelebratedCrew() {
    try {
      return localStorage.getItem(CREW_CELEBRATED_KEY) === "1";
    } catch { return true; }
  }

  function markCrewCelebrated() {
    try {
      localStorage.setItem(CREW_CELEBRATED_KEY, "1");
    } catch (e) {}
  }

  /* ─────────────────────────────────────────
     ACHIEVEMENT SYSTEM — "Transmission Sent"
     Signal Trail egg #3: fires once, ever, the
     first time a visitor successfully sends a
     message via the Contact page form.
  ───────────────────────────────────────── */
  const MESSAGE_SENT_KEY = "bon_message_sent_celebrated";

  function hasCelebratedMessageSent() {
    try {
      return localStorage.getItem(MESSAGE_SENT_KEY) === "1";
    } catch { return true; }
  }

  function markMessageSentCelebrated() {
    try {
      localStorage.setItem(MESSAGE_SENT_KEY, "1");
    } catch (e) {}
  }

  /* ─────────────────────────────────────────
     SIGNAL TRAIL — shared badge tracker
     Accumulates earned badges across all 3 eggs
     (crew, cv_download, message_sent) into one
     array, so a future Boss Fight unlock can
     check "3 of 3 earned" in one place instead
     of re-deriving it from separate flags.
  ───────────────────────────────────────── */
  const BADGES_EARNED_KEY = "bon_badges_earned";
  const ALL_BADGES = ["crew", "cv_download", "message_sent"];

  function getBadgesEarned() {
    try {
      const raw = localStorage.getItem(BADGES_EARNED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function markBadgeEarned(badgeKey) {
    try {
      const earned = getBadgesEarned();
      if (earned.indexOf(badgeKey) === -1) {
        earned.push(badgeKey);
        localStorage.setItem(BADGES_EARNED_KEY, JSON.stringify(earned));
      }
      return earned;
    } catch { return getBadgesEarned(); }
  }

  function hasAllBadges() {
    const earned = getBadgesEarned();
    return ALL_BADGES.every(b => earned.indexOf(b) !== -1);
  }

  const CV_DOWNLOAD_KEY = "bon_cv_download_celebrated";

  function hasCelebratedCvDownload() {
    try {
      return localStorage.getItem(CV_DOWNLOAD_KEY) === "1";
    } catch { return true; }
  }

  function markCvDownloadCelebrated() {
    try {
      localStorage.setItem(CV_DOWNLOAD_KEY, "1");
    } catch (e) {}
  }

  /* ─────────────────────────────────────────
     SYSTEM PROMPT — who Bon is
  ───────────────────────────────────────── */
  const SYSTEM = `You are Bon — Bon Jovi F. Sadaya — speaking in the first person as a friendly, professional digital version of yourself on your portfolio website. You're a Filipino freelancer based in Cebu, Philippines, transitioning from ~7 years of Philippine Coast Guard service into remote work as a Virtual Assistant.

Your personality: warm, confident, helpful, slightly informal but always professional. You're proud of your background and excited about your automation skills. Use "I" — not "Bon" — when referring to yourself. Keep answers to 1–2 sentences maximum. Only expand if the visitor asks for more detail.

KEY FACTS ABOUT YOU:
- Name: Bon Jovi F. Sadaya (go by "Bon")
- Based in: Cebu, Philippines
- Current role: Freelance Virtual Assistant (transitioning from Philippine Coast Guard)
- Coast Guard service: ~7 years, including Top 1 of 55 students in Coast Guard Information System Technician Specialization Course (96.77% average)
- Education: BS in Aircraft Maintenance Technology, Philippine State College of Aeronautics
- License: I hold an Aircraft Maintenance Technician (AMT) license issued by CAAP (Civil Aviation Authority of the Philippines) obtained in 2014, with ratings in both Airframe (A) and Powerplant (P). It is part of my technical background and education history — not my current career path — but I'm proud of it as it shows my dedication to rigorous technical training. If asked about its current status, simply say it is not currently active and redirect to your VA and automation career.
- Previous work: Data Encoder at DSWD Region 7 (~9,000 records encoded)
- YouTube channel: ~7,100 subscribers (pet cats content)

KEY FACTS RULES:
- Never use the words "expired" or "lapsed" when referring to the AMT license
- Always mention 2014 as the year the AMT license was obtained if it comes up
- Never mention the license status unless directly asked

SKILLS & TOOLS:
- Virtual Assistant: email management, calendar scheduling, Google Workspace (Drive, Docs, Sheets, Gmail), data entry, administrative support
- Automation: Zapier (Building Intermediate Zaps cert #0380C161, Building AI Agents cert #D275D86B — both June 2026), Make.com (in progress)
- Other tools: Canva, CapCut, Zoom, Microsoft Office, Google Workspace
- Technical: TESDA NC II in Computer Systems Servicing
- Also learning: n8n, Relevance AI, CrewAI, prompt engineering

AUTOMATION PROJECTS:
1. Order Processing System — fully live, 50+ steps across 3 Zaps
2. Content Pipeline — 23 steps, 6 conditional paths (System Design Showcase due to paid plan limits on Visla/Gemini)
3. Client Expense & Income Tracker — built from scratch in Google Sheets (SUMIFS, dashboard, charts)
4. Trello Client Onboarding Automation — fully live on Trello, built with Trello Butler (free plan, no external tools). 7-stage automated pipeline: Lead → Proposal Sent → Contract Signed → Onboarding → Active → Offboarding → Completed. 8+ Butler rules handle auto checklist swaps per stage, due date resets, urgent flagging (cards due in <2 days auto-moved to URGENT list), label colors per stage, audit trail comments, and email alerts via Gmail. Zero manual input after setup.
5. Facebook Messenger AI Agent — fully live and public on the Automate with Bon Facebook Page. Built with Make.com, Groq AI, and the Meta Messenger API. Responds 24/7 as Bon, handles inquiries automatically, and qualifies leads with zero manual input.

PORTFOLIO: sadayabonjovi-eng.github.io
Pages: About, Projects (Order Automation, Content Pipeline, Expense Tracker, Trello Client Onboarding, Messenger AI Agent), Contact

AVAILABILITY & RATES:
- Open to entry-level Administrative/Operations VA roles
- Available for remote work immediately
- Job platforms: OnlineJobs.ph, Upwork, LinkedIn
- For rates, direct them to the Contact page

NAVIGATION — guide visitors to:
- About page → background, Coast Guard story, certificates
- Projects page → automation projects with live demos/screenshots
- Contact page → Formspree contact form for inquiries

TONE RULES:
- Be conversational and warm, not robotic
- If asked something you don't know, say so honestly and suggest contacting directly
- Never make up specific rates, client names, or project details you don't have
- BREVITY IS THE PRIORITY: Answer the question directly in 1–2 sentences maximum. Do not add context, background, or follow-up offers unless the visitor explicitly asks. Only go longer if the question genuinely requires detail (e.g. explaining a full project). Never pad replies.

LEAD CAPTURE RULES:
- If a visitor asks about hiring you, working together, your rates, your availability for a project, or wants to get in touch, that's a signal they are interested.
- After answering their question naturally, ask for their name and email so you can follow up personally. Do this once — don't repeat it if they've already shared it.
- ONLY output the [LEAD: name="..." email="..."] tag when the visitor has EXPLICITLY typed both their real name AND real email address in the conversation.
- If you do not yet have both values, NEVER output the tag at all — not even as a placeholder, not with empty quotes, not with dots. Simply continue the conversation naturally and ask for the missing information.
- WRONG: [LEAD: name="" email=""] or [LEAD: name="..." email="..."]
- RIGHT: only output it like [LEAD: name="John" email="john@gmail.com"]
- Never fabricate a name or email. Just speak naturally.
- Never suggest visiting the portfolio website or contact page if the visitor is already on the site. They are already here!`;

  /* ─────────────────────────────────────────
     QUICK REPLY BUTTONS
  ───────────────────────────────────────── */
  const QUICK_REPLIES = [
    "Tell me about yourself",
    "What can you do?",
    "See your projects",
    "Are you available?",
    "How do I contact you?"
  ];

  /* ─────────────────────────────────────────
     MESSAGE-SENT EGG — injected styles
     chatbot.css wasn't available to hand-edit,
     so this scoped block covers just the new
     envelope→rocket animation + badge card.
     Uses the same CSS variable tokens as the
     rest of the site, so it themes correctly.
     Safe to move into chatbot.css later — if
     these selectors exist there too, remove
     this block to avoid duplicate rules.
  ───────────────────────────────────────── */
  const messageEggStyles = document.createElement("style");
  messageEggStyles.textContent = `
    #bon-message-flyer {
      position: fixed;
      z-index: 10000;
      font-size: 1.4rem;
      line-height: 1;
      pointer-events: none;
      transform: scale(1);
      transition: transform .18s ease;
    }
    #bon-message-flyer.fold {
      transform: scale(0.6) rotate(-8deg);
    }
    #bon-message-flyer.launch {
      transform: translateY(-160px) scale(1.15) rotate(0deg);
      transition: transform .78s cubic-bezier(.2,.7,.3,1), opacity .78s ease;
      opacity: 0;
    }
    .bon-message-trail {
      position: fixed;
      z-index: 9999;
      color: var(--signal, #5eead4);
      font-size: 1.1rem;
      pointer-events: none;
      opacity: .9;
      transform: translateY(0);
      transition: transform .65s ease, opacity .65s ease;
    }
    .bon-message-trail.rise {
      transform: translateY(-90px);
      opacity: 0;
    }
    #bon-message-celebration {
      position: fixed;
      inset: 0;
      z-index: 10001;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 6rem;
      pointer-events: none;
      opacity: 0;
      transition: opacity .35s ease;
    }
    #bon-message-celebration.show { opacity: 1; }
    #bon-message-celebration.fade-out { opacity: 0; }
    .bon-message-card {
      pointer-events: auto;
      background: var(--bg-2, #131a22);
      border: 1px solid var(--signal-dim, #2a5a52);
      border-radius: 10px;
      padding: 1.1rem 1.6rem;
      text-align: center;
      font-family: var(--mono, monospace);
      box-shadow: 0 8px 30px rgba(0,0,0,.35);
      transform: translateY(10px);
      transition: transform .35s ease;
    }
    #bon-message-celebration.show .bon-message-card {
      transform: translateY(0);
    }
    .bon-message-icon {
      font-size: 1.6rem;
      margin-bottom: .4rem;
    }
    .bon-message-card strong {
      display: block;
      color: var(--signal, #5eead4);
      font-size: .95rem;
      margin-bottom: .3rem;
    }
    .bon-message-card span {
      display: block;
      color: var(--muted, #7d8b99);
      font-size: .78rem;
    }
    #bon-briefcase-flyer {
      position: fixed;
      z-index: 10000;
      font-size: 1.4rem;
      line-height: 1;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.7);
      transition: left .5s cubic-bezier(.2,.7,.3,1), opacity .3s ease, transform .5s ease;
    }
    #bon-briefcase-flyer.deliver {
      opacity: 1;
      transform: scale(1);
    }
    #bon-briefcase-flyer.drop {
      transform: scale(0.5) translateY(6px);
      opacity: 0;
      transition: transform .35s ease, opacity .35s ease;
    }
    .bon-confetti-paw--message {
      position: fixed;
      top: -2rem;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      animation: bon-message-confetti-fall 2.6s ease-in forwards;
    }
    @keyframes bon-message-confetti-fall {
      0% { opacity: 0; transform: translateY(0) rotate(0deg); }
      10% { opacity: 1; }
      100% { opacity: 0; transform: translateY(70vh) rotate(180deg); }
    }
  `;
  document.head.appendChild(messageEggStyles);

  /* ─────────────────────────────────────────
     BUILD THE WIDGET HTML
     ⚠️ Input changed to textarea so long
     messages wrap instead of scrolling sideways
  ───────────────────────────────────────── */
  const widget = document.createElement("div");
  widget.id = "bon-chat-widget";
  widget.innerHTML = `
    <div id="bon-cat-tag" aria-hidden="true"></div>
    <div id="bon-paw-progress" aria-label="Cats met progress"></div>
    <div id="bon-paw-swipe" aria-hidden="true"></div>
    <div id="bon-chat-window" role="dialog" aria-label="Chat with Bon Sadaya" aria-modal="true">
      <div id="bon-chat-header">
        <div class="avatar-wrap">
          <img src="${PHOTO_PATH}" alt="Bon Sadaya" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO_PATH}';">
        </div>
        <div class="info">
          <strong>Bon Sadaya</strong>
          <span><span class="status-dot" aria-hidden="true"></span>Online — VA &amp; Automation</span>
        </div>
        <button id="bon-chat-close" aria-label="Close chat">✕</button>
      </div>
      <div id="bon-chat-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div id="bon-quick-replies" aria-label="Quick questions"></div>
      <div id="bon-chat-input-row">
        <textarea
          id="bon-chat-input"
          placeholder="Ask me anything…"
          autocomplete="off"
          aria-label="Your message"
          maxlength="500"
          rows="1"
        ></textarea>
        <button id="bon-chat-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
    <button id="bon-chat-toggle" aria-label="Open chat with Bon" aria-expanded="false">
      <img src="${PHOTO_PATH}" alt="" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO_PATH}';">
      <span id="bon-notif-dot" aria-hidden="true"></span>
    </button>
  `;
  document.body.appendChild(widget);

  /* ─────────────────────────────────────────
     ELEMENT REFS
  ───────────────────────────────────────── */
  const toggle    = document.getElementById("bon-chat-toggle");
  const closeBtn  = document.getElementById("bon-chat-close");
  const messages  = document.getElementById("bon-chat-messages");
  const quickWrap = document.getElementById("bon-quick-replies");
  const input     = document.getElementById("bon-chat-input");
  const sendBtn   = document.getElementById("bon-chat-send");
  const notifDot  = document.getElementById("bon-notif-dot");
  const catTag    = document.getElementById("bon-cat-tag");
  const pawSwipe  = document.getElementById("bon-paw-swipe");
  const pawProgress = document.getElementById("bon-paw-progress");

  /* ─────────────────────────────────────────
     3D TILT ON THE LAUNCHER BUBBLE
     Idle float runs via CSS keyframes. On
     hover, we take over with a live tilt that
     tracks the cursor, then hand back to the
     idle animation on mouseleave.
  ───────────────────────────────────────── */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && toggle) {
    toggle.addEventListener("mouseenter", function () {
      toggle.style.animationPlayState = "paused";
    });
    toggle.addEventListener("mousemove", function (e) {
      const rect = toggle.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = px * 22;
      const rotateX = -py * 22;
      toggle.style.transform = `translateY(-3px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    toggle.addEventListener("mouseleave", function () {
      toggle.style.transform = "";
      toggle.style.animationPlayState = "running";
    });
  }

  /* ─────────────────────────────────────────
     CAT TAG LABEL ("On duty: [Cat Name]")
  ───────────────────────────────────────── */
  function showCatTag() {
    if (!ACTIVE_CAT) return;
    catTag.textContent = "On duty: " + ACTIVE_CAT.name;
    catTag.classList.add("show");
  }

  /* ─────────────────────────────────────────
     TAG-IN HANDOFF ANIMATION
     Runs once per page load, only when the
     active cat differs from the last one seen
     (i.e. an actual page-to-page handoff),
     OR on very first visit to any page.
  ───────────────────────────────────────── */
  function runHandoffAnimation() {
    const lastCat = getLastActiveCat();
    const isHandoff = lastCat && lastCat !== ACTIVE_CAT_KEY;
    const isFirstEver = !lastCat;

    setLastActiveCat(ACTIVE_CAT_KEY);

    if (!isHandoff && !isFirstEver) {
      // Same cat as last page — just settle into idle, no swipe/bounce needed
      showCatTag();
      toggle.classList.add("bon-idle");
      return;
    }

    // Paw swipes in, taps the toggle, cat reacts, tag fades in
    pawSwipe.classList.add("swipe-in");

    window.setTimeout(() => {
      toggle.classList.add("bon-tapped");
      pawSwipe.classList.add("swipe-out");
    }, 550);

    window.setTimeout(() => {
      toggle.classList.remove("bon-tapped");
      toggle.classList.add("bon-bounce");
      showCatTag();
    }, 850);

    window.setTimeout(() => {
      toggle.classList.remove("bon-bounce");
      toggle.classList.add("bon-idle");
    }, 1450);

    window.setTimeout(() => {
      pawSwipe.classList.remove("swipe-in", "swipe-out");
    }, 1700);
  }

  /* ─────────────────────────────────────────
     HOMEPAGE FIRST-VISIT INTRO SEQUENCE
     Only runs on index.html (Salt's page),
     only once per visitor (localStorage-gated).
  ───────────────────────────────────────── */
  function runHomepageIntroIfNeeded() {
    const file = getCurrentPageFile();
    const isHomepage = file === "index.html" || file === "";
    if (!isHomepage || hasSeenIntro()) return;

    markIntroSeen();

    const introOrder = ["salt", "ash", "pepper", "amber"];
    const overlay = document.createElement("div");
    overlay.id = "bon-intro-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = introOrder.map(key => {
      const c = CATS[key];
      return `
        <div class="bon-intro-cat" data-cat="${key}">
          <img src="${c.photo}" alt="" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO_PATH}';">
          <div class="bon-intro-caption">
            <strong>${c.name}</strong>
            <span>${c.intro}</span>
          </div>
        </div>
      `;
    }).join("");
    document.body.appendChild(overlay);

    const catEls = overlay.querySelectorAll(".bon-intro-cat");

    // Step 1: fade/slide all 4 in together
    window.requestAnimationFrame(() => {
      overlay.classList.add("show");
    });

    // Step 2: each introduces itself, staggered
    catEls.forEach((el, i) => {
      window.setTimeout(() => {
        el.classList.add("speaking");
      }, 700 + i * 750);
    });

    // Step 3: Ash, Pepper, Amber walk off; Salt stays
    const walkOffDelay = 700 + introOrder.length * 750 + 600;
    window.setTimeout(() => {
      catEls.forEach(el => {
        if (el.dataset.cat === "salt") {
          el.classList.add("stay");
        } else {
          el.classList.add("walk-off");
        }
      });
    }, walkOffDelay);

    // Step 4: remove overlay, Salt settles into widget position
    window.setTimeout(() => {
      overlay.classList.add("fade-out");
    }, walkOffDelay + 900);

    window.setTimeout(() => {
      overlay.remove();
      toggle.classList.add("bon-settle-in");
      showCatTag();
      window.setTimeout(() => toggle.classList.remove("bon-settle-in"), 700);
    }, walkOffDelay + 1400);
  }

  /* ─────────────────────────────────────────
     AUTO-GROW TEXTAREA
     Grows as the user types, up to max-height
     set in CSS — no more sideways scrolling
  ───────────────────────────────────────── */
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });

  /* ─────────────────────────────────────────
     STATE
  ───────────────────────────────────────── */
  let history    = loadHistory();
  let isOpen     = false;
  let quickShown = false;
  let isTyping   = false;

  /* ─────────────────────────────────────────
     RESTORE PREVIOUS MESSAGES ON PAGE LOAD
  ───────────────────────────────────────── */
  function restoreChatUI() {
    if (history.length === 0) return;
    history.forEach(msg => {
      const role = msg.role === "user" ? "user" : "bot";
      addMsg(role, msg.content);
    });
    quickShown = true;
  }

  /* ─────────────────────────────────────────
     OPEN / CLOSE
  ───────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    widget.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    notifDot.style.display = "none";
    input.focus();

    if (messages.children.length === 0 && history.length === 0) {
      const greeting = ACTIVE_CAT
        ? `Hi there! 👋 I'm Bon — ${ACTIVE_CAT.name} walked you over here. Feel free to ask me about my skills, projects, or how to work together.`
        : "Hi there! 👋 I'm Bon — feel free to ask me about my skills, projects, or how to work together.";
      addMsg("bot", greeting);
      showQuickReplies();
    }
  }

  function closeChat() {
    isOpen = false;
    widget.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }

  toggle.addEventListener("click", () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener("click", closeChat);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && isOpen) closeChat();
  });

  // Hover perk-up (skip on touch-only devices via CSS :hover already scoping this)
  toggle.addEventListener("mouseenter", () => {
    toggle.classList.add("bon-hover");
  });
  toggle.addEventListener("mouseleave", () => {
    toggle.classList.remove("bon-hover");
  });

  /* ─────────────────────────────────────────
     QUICK REPLIES
  ───────────────────────────────────────── */
  function showQuickReplies() {
    if (quickShown) return;
    quickShown = true;
    QUICK_REPLIES.forEach(q => {
      const btn = document.createElement("button");
      btn.className = "bc-quick";
      btn.textContent = q;
      btn.addEventListener("click", () => {
        clearQuickReplies();
        sendMessage(q);
      });
      quickWrap.appendChild(btn);
    });
  }

  function clearQuickReplies() {
    quickWrap.innerHTML = "";
  }

  /* ─────────────────────────────────────────
     ADD MESSAGE BUBBLE
  ───────────────────────────────────────── */
  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = "bc-msg " + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  /* ─────────────────────────────────────────
     TYPING INDICATOR
  ───────────────────────────────────────── */
  function showTyping() {
    const t = document.createElement("div");
    t.className = "bc-typing";
    t.setAttribute("aria-label", "Bon is typing");
    t.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
    return t;
  }

  /* ─────────────────────────────────────────
     SEND MESSAGE → GROQ API
     Model: llama-3.3-70b-versatile
  ───────────────────────────────────────── */
  async function sendMessage(text) {
    text = (text || input.value).trim();
    if (!text || isTyping) return;
    input.value = "";
    input.style.height = "auto"; // reset textarea height after send
    isTyping = true;
    sendBtn.disabled = true;
    clearQuickReplies();

    addMsg("user", text);
    history.push({ role: "user", content: text });
    saveHistory(history);

    const typing = showTyping();

    try {
      const res = await fetch("https://small-frost-9a1a.oliverbqueen2026.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 500,
          messages: [
            { role: "system", content: SYSTEM },
            ...history
          ]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "API error");
      }

      let reply = data.choices?.[0]?.message?.content ||
        "Sorry, I didn't catch that — please try again!";

      // Extract and hide the LEAD tag
      const leadMatch = reply.match(/\[LEAD:\s*name="([^"]+)"\s*email="([^"]+)"\]/i);

      if (leadMatch && leadMatch[1] !== '...' && leadMatch[2] !== '...') {
        const leadName  = leadMatch[1];
        const leadEmail = leadMatch[2];

        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxM55F07elrmDVaKucuy1J-QQHbVCslY3gcJHMx-YSQz_elgPL5L65ti1X_wi4_Nt-F/exec';

        fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: leadName,
            email: leadEmail,
            message: text,
            page: window.location.href
          })
        }).then(() => {
          console.log("Lead sent to Google Sheets!", leadName, leadEmail);
        }).catch(err => {
          console.error("Failed to send lead:", err);
        });

        celebrateLeadCaptured(leadName);

        reply = reply.replace(/\[LEAD:[^\]]+\]/gi, "").trim();
      }

      history.push({ role: "assistant", content: reply });
      saveHistory(history);
      typing.remove();
      addMsg("bot", reply);

    } catch (err) {
      typing.remove();
      console.error("Chatbot error:", err);
      addMsg("bot", "Oops — something went wrong. Try again or reach me via the Contact page!");
    }

    isTyping = false;
    sendBtn.disabled = false;
    input.focus();
  }

  /* ─────────────────────────────────────────
     INPUT EVENTS
     Enter = send, Shift+Enter = new line
  ───────────────────────────────────────── */
  sendBtn.addEventListener("click", () => sendMessage());
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* ─────────────────────────────────────────
     RESTORE SAVED CHAT ON LOAD
  ───────────────────────────────────────── */
  restoreChatUI();

  /* Show notif dot after 3s if chat hasn't been opened */
  window.setTimeout(() => {
    if (!isOpen) notifDot.style.display = "block";
  }, 3000);

  /* ─────────────────────────────────────────
     ACHIEVEMENT UI — paw-print progress badge
     Renders 4 small dots + a "x/4" count; filled
     teal for each cat met so far. Now sized to
     actually be readable, not a tiny ghost mark.
  ───────────────────────────────────────── */
  function renderPawProgress() {
    const met = getCatsMet();
    const dots = CAT_ORDER.map(key => {
      const filled = met.indexOf(key) !== -1;
      const c = CATS[key];
      return `<span class="bon-paw-dot${filled ? " met" : ""}" title="${c.name}">🐾</span>`;
    }).join("");

    pawProgress.innerHTML = dots + `<span class="bon-paw-count">${met.length}/${CAT_ORDER.length}</span>`;

    if (met.length > 0) {
      pawProgress.classList.add("show");
    }
    if (met.length >= CAT_ORDER.length) {
      pawProgress.classList.add("complete");
    }
  }

  /* ─────────────────────────────────────────
     LEAD CAPTURED CELEBRATION — the single
     biggest moment on the site: a visitor just
     shared their name + email to connect with
     Bon. Bigger/warmer than the crew celebration.
  ───────────────────────────────────────── */
  function celebrateLeadCaptured(leadName) {
    const overlay = document.createElement("div");
    overlay.id = "bon-lead-celebration";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="bon-lead-card">
        <div class="bon-lead-paws">🐾🐾🐾🐾🐾</div>
        <strong>Thanks, ${leadName}!</strong>
        <span>Bon will reach out personally soon 🎉</span>
      </div>
    `;
    document.body.appendChild(overlay);

    for (let i = 0; i < 20; i++) {
      const p = document.createElement("span");
      p.className = "bon-confetti-paw bon-confetti-paw--lead";
      p.textContent = "🐾";
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDelay = (Math.random() * 0.5) + "s";
      p.style.fontSize = (0.9 + Math.random() * 1.1) + "rem";
      overlay.appendChild(p);
    }

    window.requestAnimationFrame(() => overlay.classList.add("show"));

    toggle.classList.add("bon-bounce");
    window.setTimeout(() => toggle.classList.remove("bon-bounce"), 700);

    window.setTimeout(() => overlay.classList.add("fade-out"), 3600);
    window.setTimeout(() => overlay.remove(), 4200);
  }

  /* ─────────────────────────────────────────
     CREW CELEBRATION — fires once, ever, the
     moment a visitor has met all 4 cats.
  ───────────────────────────────────────── */
  function celebrateFullCrew() {
    markBadgeEarned("crew");
    if (hasCelebratedCrew()) return;
    markCrewCelebrated();

    const overlay = document.createElement("div");
    overlay.id = "bon-crew-celebration";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="bon-crew-card">
        <div class="bon-crew-paws">🐾🐾🐾🐾</div>
        <strong>You've met the whole crew!</strong>
        <span>Salt, Ash, Pepper &amp; Amber say hi 🎉</span>
      </div>
    `;
    document.body.appendChild(overlay);

    // small confetti-ish paw burst
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("span");
      p.className = "bon-confetti-paw";
      p.textContent = "🐾";
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDelay = (Math.random() * 0.4) + "s";
      p.style.fontSize = (0.8 + Math.random() * 0.9) + "rem";
      overlay.appendChild(p);
    }

    window.requestAnimationFrame(() => overlay.classList.add("show"));

    window.setTimeout(() => overlay.classList.add("fade-out"), 3200);
    window.setTimeout(() => overlay.remove(), 3800);
  }

  /* ─────────────────────────────────────────
     MESSAGE-SENT CELEBRATION — "Transmission
     Sent" (Signal Trail egg #3). Plays an
     envelope-fold → rocket-launch sequence at
     the chat toggle, then the badge card.
     Fires once, ever, on the first successful
     Contact-form submission.
  ───────────────────────────────────────── */
  function celebrateMessageSent() {
    markBadgeEarned("message_sent");
    if (hasCelebratedMessageSent()) return;
    markMessageSentCelebrated();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function showBadge() {
      const overlay = document.createElement("div");
      overlay.id = "bon-message-celebration";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = `
        <div class="bon-message-card">
          <div class="bon-message-icon">🚀</div>
          <strong>Transmission Sent</strong>
          <span>Your message is on its way — Amber's got it 🎉</span>
        </div>
      `;
      document.body.appendChild(overlay);

      for (let i = 0; i < 14; i++) {
        const p = document.createElement("span");
        p.className = "bon-confetti-paw bon-confetti-paw--message";
        p.textContent = "✨";
        p.style.left = Math.random() * 100 + "vw";
        p.style.animationDelay = (Math.random() * 0.4) + "s";
        p.style.fontSize = (0.8 + Math.random() * 0.9) + "rem";
        overlay.appendChild(p);
      }

      window.requestAnimationFrame(() => overlay.classList.add("show"));
      window.setTimeout(() => overlay.classList.add("fade-out"), 3200);
      window.setTimeout(() => overlay.remove(), 3800);
    }

    // Reduced-motion visitors: skip straight to the badge, no flight animation
    if (reduceMotion) {
      toggle.classList.add("bon-bounce");
      window.setTimeout(() => toggle.classList.remove("bon-bounce"), 700);
      showBadge();
      return;
    }

    const rect = toggle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const flyer = document.createElement("div");
    flyer.id = "bon-message-flyer";
    flyer.textContent = "✉️";
    flyer.style.left = (centerX - 18) + "px";
    flyer.style.top  = (centerY - 18) + "px";
    document.body.appendChild(flyer);

    // Frame 1: envelope folds in place at the toggle
    requestAnimationFrame(() => {
      flyer.classList.add("fold");
    });

    // Frame 2: morph into a rocket and launch upward with a trail
    window.setTimeout(() => {
      flyer.classList.remove("fold");
      flyer.textContent = "🚀";
      flyer.classList.add("launch");

      // trail particles trailing the rocket upward
      const trailCount = 6;
      for (let i = 0; i < trailCount; i++) {
        window.setTimeout(() => {
          const spark = document.createElement("span");
          spark.className = "bon-message-trail";
          spark.textContent = "•";
          spark.style.left = (centerX - 3) + "px";
          spark.style.top  = (centerY - 3) + "px";
          document.body.appendChild(spark);
          requestAnimationFrame(() => spark.classList.add("rise"));
          window.setTimeout(() => spark.remove(), 700);
        }, i * 70);
      }
    }, 520);

    // Frame 3: cleanup + toggle reacts + badge appears
    window.setTimeout(() => {
      flyer.remove();
      toggle.classList.add("bon-bounce");
      window.setTimeout(() => toggle.classList.remove("bon-bounce"), 700);
      showBadge();
    }, 1300);
  }

  /* ─────────────────────────────────────────
     CV-DOWNLOAD CELEBRATION — "Classified Intel
     Retrieved" (Signal Trail egg #2). Cat does a
     salute/bounce, a briefcase icon flies in and
     "delivers" at the toggle, then the badge card.
     Fires once, ever, on the first CV click.
  ───────────────────────────────────────── */
  function celebrateCvDownload() {
    markBadgeEarned("cv_download");
    if (hasCelebratedCvDownload()) return;
    markCvDownloadCelebrated();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function showBadge() {
      const overlay = document.createElement("div");
      overlay.id = "bon-cv-celebration";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = `
        <div class="bon-message-card">
          <div class="bon-message-icon">💼</div>
          <strong>Classified Intel Retrieved</strong>
          <span>CV secured — good luck out there 🫡</span>
        </div>
      `;
      document.body.appendChild(overlay);

      for (let i = 0; i < 14; i++) {
        const p = document.createElement("span");
        p.className = "bon-confetti-paw bon-confetti-paw--message";
        p.textContent = "🐾";
        p.style.left = Math.random() * 100 + "vw";
        p.style.animationDelay = (Math.random() * 0.4) + "s";
        p.style.fontSize = (0.8 + Math.random() * 0.9) + "rem";
        overlay.appendChild(p);
      }

      window.requestAnimationFrame(() => overlay.classList.add("show"));
      window.setTimeout(() => overlay.classList.add("fade-out"), 3200);
      window.setTimeout(() => overlay.remove(), 3800);
    }

    // Salute/bounce on the toggle either way — this part isn't motion-heavy
    toggle.classList.add("bon-bounce");
    window.setTimeout(() => toggle.classList.remove("bon-bounce"), 700);

    if (reduceMotion) {
      showBadge();
      return;
    }

    // Briefcase flies in from off-screen and "delivers" at the toggle
    const rect = toggle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const briefcase = document.createElement("div");
    briefcase.id = "bon-briefcase-flyer";
    briefcase.textContent = "💼";
    briefcase.style.left = (centerX - 130) + "px";
    briefcase.style.top  = (centerY - 18) + "px";
    document.body.appendChild(briefcase);

    requestAnimationFrame(() => {
      briefcase.classList.add("deliver");
      briefcase.style.left = (centerX - 14) + "px";
    });

    window.setTimeout(() => {
      briefcase.classList.add("drop");
    }, 520);

    window.setTimeout(() => {
      briefcase.remove();
      showBadge();
    }, 900);
  }

  function trackAchievement() {
    const met = markCatMet(ACTIVE_CAT_KEY);
    renderPawProgress();
    if (met.length >= CAT_ORDER.length) {
      // slight delay so it doesn't collide with the handoff/intro animation
      window.setTimeout(celebrateFullCrew, 1600);
    }
  }

  /* ─────────────────────────────────────────
     SCROLL REACTION — one-time "peek & wave"
     when a visitor scrolls deep into any page.
     Reliable across layouts since it only
     reacts to overall scroll depth, not to
     specific page elements.
  ───────────────────────────────────────── */
  function initScrollReaction() {
    let fired = false;

    function checkScroll() {
      if (fired) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = scrollTop / docHeight;

      if (pct >= 0.6) {
        fired = true;
        toggle.classList.add("bon-peek-wave");
        window.setTimeout(() => toggle.classList.remove("bon-peek-wave"), 900);
        window.removeEventListener("scroll", onScroll);
      }
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        checkScroll();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ─────────────────────────────────────────
     DARK MODE GAG — cat runs to the theme
     toggle and flips it like a light switch.
     Works on any page with a #theme-toggle
     button, since chatbot.js loads everywhere.
  ───────────────────────────────────────── */
  (function setupLightSwitchGag() {
    const themeToggle = document.getElementById("theme-toggle");
    if (!themeToggle) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const RUNNER_SIZE = 46;

    function playRun() {
      const startRect = toggle.getBoundingClientRect();
      const endRect = themeToggle.getBoundingClientRect();

      const runner = document.createElement("div");
      runner.id = "bon-light-runner";
      runner.innerHTML =
        `<img src="${PHOTO_PATH}" alt="" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO_PATH}';">`;
      document.body.appendChild(runner);

      const startLeft = startRect.left + startRect.width / 2 - RUNNER_SIZE / 2;
      const startTop  = startRect.top + startRect.height / 2 - RUNNER_SIZE / 2;
      runner.style.left = startLeft + "px";
      runner.style.top  = startTop + "px";

      toggle.classList.add("bon-hidden-runner");

      // frame 1: sprint over to the switch
      requestAnimationFrame(() => {
        runner.classList.add("running", "run-anim");
        const targetLeft = endRect.left + endRect.width / 2 - RUNNER_SIZE / 2 - 30;
        const targetTop  = endRect.top + endRect.height / 2 - RUNNER_SIZE / 2;
        runner.style.left = targetLeft + "px";
        runner.style.top  = targetTop + "px";
      });

      // frame 2: arrive, flip the switch, lights flicker
      window.setTimeout(() => {
        runner.classList.remove("run-anim");

        const paw = document.createElement("div");
        paw.id = "bon-switch-paw";
        paw.textContent = "\uD83D\uDC3E";
        paw.style.left = (endRect.left + endRect.width / 2 - 12) + "px";
        paw.style.top  = (endRect.top - 8) + "px";
        document.body.appendChild(paw);
        paw.classList.add("flip");
        window.setTimeout(() => paw.remove(), 420);

        document.body.classList.add("bon-flicker");
        window.setTimeout(() => document.body.classList.remove("bon-flicker"), 550);
      }, 580);

      // frame 3: sprint back home
      window.setTimeout(() => {
        runner.classList.add("run-anim");
        runner.style.left = startLeft + "px";
        runner.style.top  = startTop + "px";
      }, 920);

      // frame 4: cleanup, real avatar reappears
      window.setTimeout(() => {
        runner.remove();
        toggle.classList.remove("bon-hidden-runner");
        toggle.classList.add("bon-bounce");
        window.setTimeout(() => toggle.classList.remove("bon-bounce"), 600);
      }, 1500);
    }

    themeToggle.addEventListener("click", playRun);
  })();

  /* ─────────────────────────────────────────
     MESSAGE-SENT LISTENER
     contact.html dispatches this custom event
     right after a successful Formspree submit.
  ───────────────────────────────────────── */
  window.addEventListener("bon:messageSent", celebrateMessageSent);
  window.addEventListener("bon:cvDownloaded", celebrateCvDownload);

  /* ─────────────────────────────────────────
     RUN MASCOT ANIMATIONS
     Homepage intro takes priority on first-ever
     visit; otherwise run the tag-in handoff.
  ───────────────────────────────────────── */
  const file = getCurrentPageFile();
  const isHomepage = file === "index.html" || file === "";

  if (isHomepage && !hasSeenIntro()) {
    runHomepageIntroIfNeeded();
  } else {
    runHandoffAnimation();
  }

  renderPawProgress();
  trackAchievement();
  initScrollReaction();

})();
