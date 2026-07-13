(function () {
  function loadChatbot() {
    var deferred = document.querySelector('script[type="text/boot-defer"]');
    if (deferred) {
      var s = document.createElement('script');
      s.src = deferred.getAttribute('src');
      deferred.parentNode.replaceChild(s, deferred);
    }
  }

  if (sessionStorage.getItem('boot-seen')) {
    document.addEventListener('DOMContentLoaded', loadChatbot);
    return;
  }

  var lines = [
    '> booting automate_with_bon.sys',
    '> loading skills... [automation, VA ops, AI agents]',
    '> connecting workflows... OK',
    '> ready'
  ];

  var overlay = document.createElement('div');
  overlay.id = 'boot-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:var(--bg,#0d1117);' +
    'display:flex;align-items:center;justify-content:center;' +
    'font-family:"JetBrains Mono","Fira Code",ui-monospace,monospace;' +
    'transition:opacity .4s ease;opacity:1;';

  var linesEl = document.createElement('div');
  linesEl.style.cssText =
    'color:var(--signal,#5eead4);font-size:.95rem;line-height:1.9;' +
    'white-space:pre;text-align:left;';
  overlay.appendChild(linesEl);

  var style = document.createElement('style');
  style.textContent =
    '.boot-cursor{display:inline-block;margin-left:2px;animation:boot-blink 1s steps(1) infinite;}' +
    '@keyframes boot-blink{50%{opacity:0;}}';
  document.head.appendChild(style);

  document.documentElement.style.overflow = 'hidden';
  document.body.insertBefore(overlay, document.body.firstChild);

  function typeLines() {
    var lineIndex = 0;
    var charIndex = 0;
    var currentLineEl = null;

    function nextChar() {
      if (lineIndex >= lines.length) {
        finish();
        return;
      }
      if (charIndex === 0) {
        currentLineEl = document.createElement('div');
        currentLineEl.textContent = '';
        linesEl.appendChild(currentLineEl);
      }
      var line = lines[lineIndex];
      if (charIndex < line.length) {
        currentLineEl.textContent += line[charIndex];
        charIndex++;
        setTimeout(nextChar, 14);
      } else {
        currentLineEl.innerHTML = line + '<span class="boot-cursor">\u258C</span>';
        lineIndex++;
        charIndex = 0;
        setTimeout(function () {
          var cur = currentLineEl.querySelector('.boot-cursor');
          if (cur) cur.remove();
          nextChar();
        }, 160);
      }
    }
    nextChar();
  }

  function finish() {
    setTimeout(function () {
      overlay.style.opacity = '0';
      document.documentElement.style.overflow = '';
      sessionStorage.setItem('boot-seen', '1');
      setTimeout(function () {
        overlay.remove();
        loadChatbot();
      }, 400);
    }, 250);
  }

  typeLines();
})();
