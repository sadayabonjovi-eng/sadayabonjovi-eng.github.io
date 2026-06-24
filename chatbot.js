/* =============================================
   Bon's Portfolio AI Chatbot — chatbot.js
   Powered by Groq (FREE)

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
     CONFIG — edit these two values
  ───────────────────────────────────────── */
  // API key is now safely hidden inside Cloudflare Worker — no key needed here!
  const PHOTO_PATH   = "files/profile-photo.png.png"; // path to your profile photo

  /* ─────────────────────────────────────────
     SYSTEM PROMPT — who Bon is
  ───────────────────────────────────────── */
  const SYSTEM = `You are Bon — Bon Jovi F. Sadaya — speaking in the first person as a friendly, professional digital version of yourself on your portfolio website. You're a Filipino freelancer based in Cebu, Philippines, transitioning from ~7 years of Philippine Coast Guard service into remote work as a Virtual Assistant.

Your personality: warm, confident, helpful, slightly informal but always professional. You're proud of your background and excited about your automation skills. Use "I" — not "Bon" — when referring to yourself. Keep answers concise (2–4 sentences) unless the visitor asks for detail.

KEY FACTS ABOUT YOU:
- Name: Bon Jovi F. Sadaya (go by "Bon")
- Based in: Cebu, Philippines
- Current role: Freelance Virtual Assistant (transitioning from Philippine Coast Guard)
- Coast Guard service: ~7 years, including Top 1 of 55 students in Coast Guard Information System Technician Specialization Course (96.77% average)
- Education: BS in Airframe Mechanics and Aircraft Maintenance Technology, Philippine State College of Aeronautics
- Previous work: Data Encoder at DSWD Region 7 (~9,000 records encoded)
- YouTube channel: ~7,100 subscribers (pet cats content)

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

PORTFOLIO: sadayabonjovi-eng.github.io
Pages: About, Projects (Order Automation, Content Pipeline, Expense Tracker), Contact

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

LEAD CAPTURE RULES:
- If a visitor asks about hiring you, working together, your rates, your availability for a project, or wants to get in touch, that's a signal they are interested.
- After answering their question naturally, ask for their name and email so you can follow up personally. Do this once — don't repeat it if they've already shared it.
- When you have both a name AND an email from the visitor, end your reply with this exact tag on a new line (replace with actual values):
  [LEAD: name="..." email="..."]
- Never fabricate a name or email. Only output the tag if the visitor explicitly gave both.`;

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
     BUILD THE WIDGET HTML
  ───────────────────────────────────────── */
  const widget = document.createElement("div");
  widget.id = "bon-chat-widget";
  widget.innerHTML = `
    <div id="bon-chat-window" role="dialog" aria-label="Chat with Bon Sadaya" aria-modal="true">
      <div id="bon-chat-header">
        <div class="avatar-wrap">
          <img src="${PHOTO_PATH}" alt="Bon Sadaya">
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
        <input
          id="bon-chat-input"
          type="text"
          placeholder="Ask me anything…"
          autocomplete="off"
          aria-label="Your message"
          maxlength="500"
        />
        <button id="bon-chat-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
    <button id="bon-chat-toggle" aria-label="Open chat with Bon" aria-expanded="false">
      <img src="${PHOTO_PATH}" alt="">
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

  /* ─────────────────────────────────────────
     STATE
  ───────────────────────────────────────── */
  let history    = [];
  let isOpen     = false;
  let quickShown = false;
  let isTyping   = false;

  /* ─────────────────────────────────────────
     OPEN / CLOSE
  ───────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    widget.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    notifDot.style.display = "none";
    input.focus();

    if (messages.children.length === 0) {
      addMsg("bot", "Hi there! 👋 I'm Bon — feel free to ask me about my skills, projects, or how to work together.");
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
     SEND MESSAGE → GROQ API (free)
     Model: llama-3.3-70b-versatile
  ───────────────────────────────────────── */
  async function sendMessage(text) {
    text = (text || input.value).trim();
    if (!text || isTyping) return;
    input.value = "";
    isTyping = true;
    sendBtn.disabled = true;
    clearQuickReplies();

    addMsg("user", text);
    history.push({ role: "user", content: text });

    const typing = showTyping();

    try {
      const res = await fetch("https://small-frost-9a1a.oliverbqueen2026.workers.dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

      const reply = data.choices?.[0]?.message?.content ||
        "Sorry, I didn't catch that — please try again!";

      history.push({ role: "assistant", content: reply });
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
  ───────────────────────────────────────── */
  sendBtn.addEventListener("click", () => sendMessage());
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* Show notif dot after 3s if chat hasn't been opened */
  setTimeout(() => {
    if (!isOpen) notifDot.style.display = "block";
  }, 3000);

})();
