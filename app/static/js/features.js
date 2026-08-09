/* ============================================================
   v6 features: posts-read progress, text-selection share,
   reading-time-remaining, social-proof toasts.
   ============================================================ */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---------- Posts-read progress (homepage) ---------- */
  var readProg = document.getElementById('readProgress');
  var rpFg = document.getElementById('rpFg');
  var rpRead = document.getElementById('rpRead');
  var posts = document.querySelectorAll('.combined-post');
  if (readProg && posts.length) {
    var seen = new Set();
    var CIRC = 94.2;
    setTimeout(function () { readProg.classList.add('show'); }, 1600);
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && e.target.id) seen.add(e.target.id);
          var n = seen.size;
          if (rpRead) rpRead.textContent = n;
          if (rpFg) rpFg.style.strokeDashoffset = String(CIRC * (1 - n / posts.length));
        });
      }, { threshold: 0.4 });
      posts.forEach(function (p) { obs.observe(p); });
    }
  }

  /* ---------- Text selection → share quote ---------- */
  var postContent = document.querySelector('.post-content, .combined-content');
  var quoteBtn = document.createElement('div');
  quoteBtn.className = 'quote-share';
  quoteBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> Share quote';
  document.body.appendChild(quoteBtn);

  function hideQuote() { quoteBtn.classList.remove('show'); }
  if (postContent) {
    document.addEventListener('mouseup', function () {
      var sel = window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (text.length < 8 || text.length > 280) { hideQuote(); return; }
      // ensure selection is within post content
      var node = sel.anchorNode;
      if (!node || !postContent.contains(node)) { hideQuote(); return; }
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      quoteBtn.style.top = (rect.top + window.scrollY - 38) + 'px';
      quoteBtn.style.left = (rect.left + window.scrollX + rect.width / 2 - 60) + 'px';
      quoteBtn.classList.add('show');
    });
    document.addEventListener('mousedown', function (e) {
      if (e.target !== quoteBtn && !quoteBtn.contains(e.target)) {
        setTimeout(hideQuote, 50);
      }
    });
  }
  quoteBtn.addEventListener('click', function () {
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    if (!text) return;
    var url = window.location.href;
    var tweet = '"' + text + '" — ' + url;
    if (text.length > 220) tweet = '"' + text.slice(0, 217) + '..." — ' + url;
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet), '_blank');
    hideQuote();
    if (window.__toast) window.__toast('Quote ready to share!');
    try { navigator.clipboard && navigator.clipboard.writeText(tweet); } catch (e) {}
  });

  /* ---------- Reading time remaining (post pages) ---------- */
  var postFull = document.querySelector('.post-full');
  if (postFull && posts.length === 0) {
    var trEl = document.createElement('div');
    trEl.className = 'time-remaining';
    trEl.innerHTML = '<span id="trText">— min left</span>';
    document.body.appendChild(trEl);
    var trText = trEl.querySelector('#trText');
    var totalScroll = 0;
    var ticking = false;
    function updateTR() {
      var h = document.documentElement;
      var scrollable = h.scrollHeight - h.clientHeight;
      if (scrollable <= 0) return;
      var remaining = 1 - (h.scrollTop / scrollable);
      var rtEl = document.querySelector('.post-meta-bar');
      // parse "X min read" from meta
      var mins = 1;
      if (rtEl) {
        var m = rtEl.textContent.match(/(\d+)\s*min/);
        if (m) mins = parseInt(m[1], 10);
      }
      var left = Math.max(0, Math.ceil(mins * remaining));
      if (trText) trText.textContent = left + ' min left';
      if (window.scrollY > 300 && remaining < 0.97) trEl.classList.add('show');
      else trEl.classList.remove('show');
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(updateTR); ticking = true; }
    }, { passive: true });
  }

  /* ---------- Social proof: "someone just subscribed" toasts ---------- */
  var names = ['Alex', 'Sam', 'Jordan', 'Riya', 'Karan', 'Maya', 'Liam', 'Priya', 'Noah', 'Ananya', 'Ethan', 'Zara'];
  var cities = ['from Chennai', 'from Bangalore', 'from Mumbai', 'from Hyderabad', 'from Pune', 'from Delhi', 'from Kochi', 'from London', 'from New York', 'from Tokyo'];
  function showSocialProof() {
    if (document.hidden) return;
    // only on homepage, and only ~50% of the time
    if (!document.querySelector('.newsletter')) return;
    if (Math.random() > 0.5) return;
    var n = names[Math.floor(Math.random() * names.length)];
    var c = cities[Math.floor(Math.random() * cities.length)];
    if (window.__toast) window.__toast(n + ' ' + c + ' just subscribed');
  }
  // First one after 12s, then every 35-70s
  setTimeout(showSocialProof, 12000);
  setInterval(showSocialProof, 45000 + Math.random() * 25000);
})();
