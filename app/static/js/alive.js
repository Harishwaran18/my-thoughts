/* ============================================================
   ALIVE SYSTEM — makes the site feel genuinely living.
   - Custom dual-layer cursor (dot + trailing glow ring)
   - Aurora spotlight following the cursor
   - Ambient floating particles
   - Magnetic buttons + 3D tilt cards
   - Live author presence widget (time + rotating status)
   - Typewriter hero tagline
   - Confetti celebration on newsletter subscribe
   Desktop/pointer only. Respects prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (reduceMotion) return;

  /* ---------- Custom cursor ---------- */
  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  if (finePointer) {
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('cursor-custom');
  }

  var mx = -100, my = -100, rx = -100, ry = -100;
  var hovering = false;
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
  }
  if (finePointer) {
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', function () {
      document.body.classList.add('cursor-hidden');
    });
    document.addEventListener('mouseenter', function () {
      document.body.classList.remove('cursor-hidden');
    });
    // Hover state on interactive elements
    var hoverSel = 'a, button, input, textarea, .tag, .social-link, .theme-toggle, .back-to-top-ring, .copy-code-btn, .share-btn';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) {
        if (!hovering) { ring.classList.add('hovering'); dot.classList.add('hovering'); hovering = true; }
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) {
        if (hovering) { ring.classList.remove('hovering'); dot.classList.remove('hovering'); hovering = false; }
      }
    });
    // Trailing ring with easing
    function ringLoop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(ringLoop);
    }
    requestAnimationFrame(ringLoop);
  }

  /* ---------- Aurora spotlight ---------- */
  var aurora = document.createElement('div');
  aurora.className = 'aurora aurora-teal';
  document.body.appendChild(aurora);
  var aw = aurora; // ::before is the warm layer
  var ax = window.innerWidth / 2, ay = 200, tax = ax, tay = ay;
  function auroraMove(e) { ax = e.clientX; ay = e.clientY; }
  window.addEventListener('mousemove', auroraMove, { passive: true });
  function auroraLoop() {
    tax += (ax - tax) * 0.08;
    tay += (ay - tay) * 0.08;
    aw.style.setProperty('--ax', tax + 'px');
    aw.style.setProperty('--ay', tay + 'px');
    // Move the ::before (warm) and ::after (teal) via CSS vars on inline style
    aw.querySelector('span.a-warm') ? null : null;
    // We use background-position trick: set transform via custom props
    var warm = aw.firstChild;
    aw.style.background =
      'radial-gradient(600px circle at ' + tax + 'px ' + tay + 'px, rgba(217,119,6,0.10), transparent 65%),' +
      'radial-gradient(420px circle at ' + (tax + 80) + 'px ' + (tay + 60) + 'px, rgba(15,118,110,0.09), transparent 70%)';
    requestAnimationFrame(auroraLoop);
  }
  // Replace pseudo-element approach with a real background on the div
  aw.style.transition = 'background 0.3s linear';
  requestAnimationFrame(auroraLoop);

  /* ---------- Ambient particles ---------- */
  var pcount = window.innerWidth < 600 ? 14 : 28;
  var particleContainer = document.createElement('div');
  particleContainer.className = 'particles';
  document.body.appendChild(particleContainer);
  for (var i = 0; i < pcount; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var size = 2 + Math.random() * 3;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (18 + Math.random() * 22) + 's';
    p.style.animationDelay = (Math.random() * 30) + 's';
    p.style.setProperty('--drift-x', (Math.random() * 80 - 40) + 'px');
    if (Math.random() > 0.5) p.style.background = 'var(--accent-2-soft)';
    particleContainer.appendChild(p);
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer) {
    var magnets = document.querySelectorAll('.btn, .hero-badge, .social-link, .back-to-top-ring');
    magnets.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = (e.clientX - cx) * 0.3;
        var dy = (e.clientY - cy) * 0.3;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---------- 3D tilt on post cards / featured ---------- */
  if (finePointer) {
    var tilts = document.querySelectorAll('.post-card, .featured-card, .related-card, .combined-post');
    tilts.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        var maxTilt = 6;
        card.style.transform = 'perspective(1000px) rotateY(' + (px * maxTilt) + 'deg) rotateX(' + (-py * maxTilt) + 'deg) translateY(-3px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ---------- Hero parallax (badge/title shift opposite cursor) ---------- */
  var hero = document.querySelector('.hero');
  if (hero && finePointer) {
    var heroBadge = hero.querySelector('.hero-badge');
    var heroH1 = hero.querySelector('h1');
    var heroSub = hero.querySelector('.hero-sub');
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (heroBadge) heroBadge.style.transform = 'translate(' + (-px * 14) + 'px,' + (-py * 10) + 'px)';
      if (heroH1) heroH1.style.transform = 'translate(' + (-px * 8) + 'px,' + (-py * 6) + 'px)';
      if (heroSub) heroSub.style.transform = 'translate(' + (-px * 5) + 'px,' + (-py * 4) + 'px)';
    });
    hero.addEventListener('mouseleave', function () {
      if (heroBadge) heroBadge.style.transform = '';
      if (heroH1) heroH1.style.transform = '';
      if (heroSub) heroSub.style.transform = '';
    });
  }

  /* ---------- Typewriter hero tagline ---------- */
  var tw = document.querySelector('[data-typewriter]');
  if (tw) {
    var full = tw.getAttribute('data-typewriter');
    tw.textContent = '';
    var caret = document.createElement('span');
    caret.className = 'typewriter-caret';
    tw.appendChild(caret);
    var ti = 0;
    setTimeout(function type() {
      if (ti <= full.length) {
        tw.textContent = full.slice(0, ti);
        tw.appendChild(caret);
        ti++;
        setTimeout(type, 28 + Math.random() * 40);
      } else {
        tw.classList.add('typewriter-done');
      }
    }, 700);
  }

  /* ---------- Live author presence widget ---------- */
  var presence = document.createElement('div');
  presence.className = 'presence';
  presence.innerHTML =
    '<span class="presence-dot"></span>' +
    '<span class="presence-text"><span class="presence-status" id="presenceStatus">writing</span>' +
    '<span class="presence-divider"> · </span>' +
    '<span class="presence-time" id="presenceTime">--:--</span></span>';
  document.body.appendChild(presence);
  setTimeout(function () { presence.classList.add('show'); }, 1500);

  var statuses = ['writing', 'reading', 'thinking', 'brewing coffee', 'shipping', 'listening'];
  var si = 0;
  setInterval(function () {
    si = (si + 1) % statuses.length;
    var st = document.getElementById('presenceStatus');
    if (st) {
      st.style.opacity = '0';
      setTimeout(function () { st.textContent = statuses[si]; st.style.opacity = '1'; }, 250);
    }
  }, 4200);
  var stStyle = document.getElementById('presenceStatus');
  if (stStyle) stStyle.style.transition = 'opacity 0.25s';

  function updateTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes().toString().padStart(2, '0');
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    var t = document.getElementById('presenceTime');
    if (t) t.textContent = h12 + ':' + m + ' ' + ap + ' local';
  }
  updateTime();
  setInterval(updateTime, 1000);

  /* Newsletter confetti is triggered by interactions.js after the real
     /subscribe backend responds. */
})();
