/* ============================================================
   INTERACTIONS — command palette, reader controls, keyboard
   shortcuts, ambient focus sound, konami easter egg.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Command palette ---------- */
  var overlay = document.getElementById('cmdOverlay');
  var cmdInput = document.getElementById('cmdInput');
  var cmdResults = document.getElementById('cmdResults');
  var cmdOpenBtn = document.getElementById('cmdOpen');
  var index = [];
  var raw = document.getElementById('cmdIndex');
  if (raw) { try { index = JSON.parse(raw.textContent); } catch (e) {} }
  var selected = -1;

  function openCmd() {
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.add('open');
    cmdInput.value = '';
    render('');
    setTimeout(function () { cmdInput.focus(); }, 30);
  }
  function closeCmd() {
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(function () { overlay.hidden = true; }, 200);
  }
  function fuzzy(q, text) {
    q = q.toLowerCase(); text = text.toLowerCase();
    if (!q) return true;
    if (text.indexOf(q) !== -1) return 2;
    var qi = 0;
    for (var i = 0; i < text.length && qi < q.length; i++) {
      if (text[i] === q[qi]) qi++;
    }
    return qi === q.length ? 1 : 0;
  }
  function render(q) {
    var scored = [];
    index.forEach(function (item) {
      var s = fuzzy(q, item.label);
      if (s) scored.push({ item: item, score: s });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    scored = scored.slice(0, 8);
    cmdResults.innerHTML = '';
    scored.forEach(function (entry, i) {
      var li = document.createElement('li');
      li.className = 'cmd-item' + (i === 0 ? ' active' : '');
      li.innerHTML = '<span class="cmd-item-label">' + entry.item.label + '</span>' +
                     '<span class="cmd-item-hint">' + entry.item.hint + '</span>';
      li.addEventListener('mouseenter', function () {
        var all = cmdResults.querySelectorAll('.cmd-item');
        all.forEach(function (x) { x.classList.remove('active'); });
        li.classList.add('active');
        selected = i;
      });
      li.addEventListener('click', function () { go(entry.item); });
      cmdResults.appendChild(li);
    });
    selected = scored.length ? 0 : -1;
  }
  function go(item) {
    closeCmd();
    if (item.url === '#theme') {
      var t = document.getElementById('themeToggle');
      if (t) t.click();
    } else {
      window.location.href = item.url;
    }
  }
  function moveSel(dir) {
    var items = cmdResults.querySelectorAll('.cmd-item');
    if (!items.length) return;
    items.forEach(function (x) { x.classList.remove('active'); });
    selected = (selected + dir + items.length) % items.length;
    items[selected].classList.add('active');
    items[selected].scrollIntoView({ block: 'nearest' });
  }

  if (cmdOpenBtn) cmdOpenBtn.addEventListener('click', openCmd);
  if (overlay) {
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCmd(); });
  }
  if (cmdInput) {
    cmdInput.addEventListener('input', function () { render(cmdInput.value); });
    cmdInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var items = cmdResults.querySelectorAll('.cmd-item');
        if (items[selected]) items[selected].click();
      } else if (e.key === 'Escape') { closeCmd(); }
    });
  }

  /* ---------- Global keyboard shortcuts ---------- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    // Command palette: Ctrl/Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openCmd(); return;
    }
    if (typing) return;

    if (e.key === 'Escape' && overlay && !overlay.hidden) { closeCmd(); return; }
    // / focuses search
    if (e.key === '/') {
      e.preventDefault();
      var s = document.querySelector('.search-form input');
      if (s) s.focus();
      else window.location.href = '/search';
      return;
    }
    // t toggles theme
    if (e.key === 't') {
      var tb = document.getElementById('themeToggle');
      if (tb) tb.click();
      return;
    }
    // g then h = home, g then a = about
    if (e.key === 'g') {
      var handler = function (ev) {
        document.removeEventListener('keydown', handler);
        if (ev.key === 'h') window.location.href = '/';
        else if (ev.key === 'a') window.location.href = '/about';
      };
      setTimeout(function () { document.addEventListener('keydown', handler); }, 0);
      setTimeout(function () { document.removeEventListener('keydown', handler); }, 800);
      return;
    }
    // j/k scroll between combined posts
    if (e.key === 'j' || e.key === 'k') {
      var posts = document.querySelectorAll('.combined-post');
      if (!posts.length) return;
      var pos = document.documentElement.scrollTop + 120;
      var target = null;
      if (e.key === 'j') {
        posts.forEach(function (p) { if (p.offsetTop <= pos) target = p; });
        if (target) {
          var next = target.nextElementSibling;
          while (next && !next.classList.contains('combined-post')) next = next.nextElementSibling;
          if (next) target = next;
        }
      } else {
        posts.forEach(function (p) { if (p.offsetTop < pos - 20) target = p; });
      }
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  /* ---------- Reader controls: font size ---------- */
  var root = document.documentElement;
  var fontLevel = parseInt(localStorage.getItem('fontLevel') || '0', 10);
  function applyFont() {
    var base = 17, size = base + fontLevel * 1.5;
    document.body.style.fontSize = size + 'px';
    var pc = document.querySelector('.post-content, .combined-content');
    if (pc) pc.style.fontSize = (1.12 + fontLevel * 0.08) + 'rem';
  }
  applyFont();
  var fontInc = document.getElementById('fontInc');
  var fontDec = document.getElementById('fontDec');
  if (fontInc) fontInc.addEventListener('click', function () {
    fontLevel = Math.min(4, fontLevel + 1); localStorage.setItem('fontLevel', fontLevel); applyFont();
  });
  if (fontDec) fontDec.addEventListener('click', function () {
    fontLevel = Math.max(-2, fontLevel - 1); localStorage.setItem('fontLevel', fontLevel); applyFont();
  });

  /* ---------- Focus mode ---------- */
  var focusBtn = document.getElementById('focusToggle');
  if (focusBtn) focusBtn.addEventListener('click', function () {
    document.body.classList.toggle('focus-mode');
    focusBtn.classList.toggle('active');
  });

  /* ---------- Ambient focus sound (WebAudio brown noise) ---------- */
  var soundBtn = document.getElementById('soundToggle');
  var audioCtx = null, noiseNode = null, gainNode = null, filterNode = null, soundOn = false;
  function startSound() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var bufSize = 2 * audioCtx.sampleRate;
    var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < bufSize; i++) {
      var white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buf;
    noiseNode.loop = true;
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 600;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    noiseNode.connect(filterNode); filterNode.connect(gainNode); gainNode.connect(audioCtx.destination);
    noiseNode.start();
    gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.2);
  }
  function stopSound() {
    if (gainNode && audioCtx) gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
    setTimeout(function () { if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode = null; } }, 700);
  }
  if (soundBtn) soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.classList.toggle('active');
    if (soundOn) startSound(); else stopSound();
  });

  /* ---------- Konami code easter egg ---------- */
  var konami = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
  var ki = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === konami[ki]) {
      ki++;
      if (ki === konami.length) {
        ki = 0;
        celebrate();
      }
    } else {
      ki = (k === konami[0]) ? 1 : 0;
    }
  });
  function celebrate() {
    var msg = document.createElement('div');
    msg.className = 'konami-msg';
    msg.textContent = '✦ You found the secret ✦';
    document.body.appendChild(msg);
    setTimeout(function () { msg.classList.add('show'); }, 10);
    setTimeout(function () { msg.classList.remove('show'); }, 3500);
    setTimeout(function () { msg.remove(); }, 4200);
    // Big confetti burst
    var colors = ['#b45309', '#d97706', '#0f766e', '#14b8a6', '#f59e0b', '#2dd4bf', '#ef4444', '#8b5cf6'];
    for (var i = 0; i < 150; i++) {
      var c = document.createElement('div');
      c.className = 'confetti-piece';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.animationDuration = (2 + Math.random() * 1.8) + 's';
      if (Math.random() > 0.5) c.style.borderRadius = '50%';
      document.body.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 4000); })(c);
    }
  }

  /* ---------- Newsletter form (real backend) ---------- */
  var nlForm = document.getElementById('newsletterForm');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = nlForm.querySelector('input[name="email"]').value;
      var btn = nlForm.querySelector('button[type="submit"]');
      var orig = btn.textContent;
      btn.textContent = '...'; btn.disabled = true;
      fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=' + encodeURIComponent(email)
      }).then(function (r) { return r.json(); })
        .then(function (data) {
          var success = document.getElementById('newsletterSuccess');
          var subCount = document.getElementById('subCount');
          if (data.ok) {
            nlForm.style.display = 'none';
            if (success) { success.innerHTML = '&#10003; ' + data.msg; success.classList.add('show'); }
            if (subCount && data.count) subCount.textContent = data.count;
            fireConfetti(80);
          } else {
            if (success) { success.innerHTML = data.msg; success.classList.add('show'); success.style.color = 'var(--accent)'; }
            btn.textContent = orig; btn.disabled = false;
          }
        }).catch(function () { btn.textContent = orig; btn.disabled = false; });
    });
  }

  /* ---------- Reading now widget ---------- */
  var rnCount = document.getElementById('rnCount');
  if (rnCount) {
    function fetchReading() {
      fetch('/api/reading-now').then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && typeof d.count === 'number') {
            rnCount.textContent = d.count;
            var rn = document.getElementById('readingNow');
            if (rn) rn.classList.add('show');
          }
        }).catch(function () {});
    }
    fetchReading();
    setInterval(fetchReading, 9000);
  }

  /* ---------- Reading list (bookmarks, localStorage) ---------- */
  var RL_KEY = 'readingList';
  function getRL() { try { return JSON.parse(localStorage.getItem(RL_KEY) || '[]'); } catch (e) { return []; } }
  function saveRL(list) { localStorage.setItem(RL_KEY, JSON.stringify(list)); updateRLCount(); }
  function updateRLCount() {
    var list = getRL();
    var c = document.getElementById('rlCount');
    if (c) { c.textContent = list.length; c.hidden = list.length === 0; }
    var slugs = list.map(function (x) { return x.slug; });
    document.querySelectorAll('.bookmark-btn').forEach(function (b) {
      var saved = slugs.indexOf(b.getAttribute('data-slug')) !== -1;
      b.classList.toggle('saved', saved);
      var lbl = b.querySelector('.bm-label');
      if (lbl) lbl.textContent = saved ? 'Saved' : 'Save';
    });
  }
  document.querySelectorAll('.bookmark-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slug = btn.getAttribute('data-slug');
      var title = btn.getAttribute('data-title');
      var list = getRL();
      var idx = list.map(function (x) { return x.slug; }).indexOf(slug);
      if (idx === -1) list.push({ slug: slug, title: title, url: '/post/' + slug });
      else list.splice(idx, 1);
      saveRL(list); renderRL();
    });
  });
  function renderRL() {
    var list = getRL();
    var ul = document.getElementById('rlItems');
    var empty = document.getElementById('rlEmpty');
    if (!ul) return;
    ul.innerHTML = '';
    if (!list.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    list.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'rl-item';
      li.innerHTML = '<a href="' + item.url + '">' + item.title + '</a>' +
                     '<button class="rl-remove" data-slug="' + item.slug + '" aria-label="Remove">&times;</button>';
      li.querySelector('.rl-remove').addEventListener('click', function () {
        var l = getRL().filter(function (x) { return x.slug !== item.slug; });
        saveRL(l); renderRL();
      });
      ul.appendChild(li);
    });
  }
  var rlFab = document.getElementById('readingListFab');
  var rlDrawer = document.getElementById('readingListDrawer');
  var rlClose = document.getElementById('rlClose');
  if (rlFab) rlFab.addEventListener('click', function () {
    renderRL();
    if (rlDrawer) { rlDrawer.hidden = false; setTimeout(function(){ rlDrawer.classList.add('open'); }, 10); }
  });
  if (rlClose) rlClose.addEventListener('click', function () {
    if (rlDrawer) { rlDrawer.classList.remove('open'); setTimeout(function(){ rlDrawer.hidden = true; }, 250); }
  });
  updateRLCount(); renderRL();

  /* ---------- PWA install prompt ---------- */
  var deferredPrompt = null;
  var installPrompt = document.getElementById('installPrompt');
  var installBtn = document.getElementById('installBtn');
  var installDismiss = document.getElementById('installDismiss');
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e;
    if (installPrompt && !localStorage.getItem('installDismissed')) {
      installPrompt.hidden = false;
      setTimeout(function () { installPrompt.classList.add('show'); }, 10);
    }
  });
  if (installBtn) installBtn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      installPrompt.classList.remove('show');
      setTimeout(function () { installPrompt.hidden = true; }, 250);
    });
  });
  if (installDismiss) installDismiss.addEventListener('click', function () {
    localStorage.setItem('installDismissed', '1');
    installPrompt.classList.remove('show');
    setTimeout(function () { installPrompt.hidden = true; }, 250);
  });

  /* ---------- Shared confetti helper ---------- */
  function fireConfetti(n) {
    var colors = ['#b45309', '#d97706', '#0f766e', '#14b8a6', '#f59e0b', '#2dd4bf'];
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'confetti-piece';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      if (Math.random() > 0.5) c.style.borderRadius = '50%';
      document.body.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 3200); })(c);
    }
  }
})();
