(function () {
  'use strict';

  /* ----- Reading progress bar ----- */
  var progress = document.getElementById('readingProgress');
  if (progress) {
    var ticking = false;
    function updateProgress() {
      var h = document.documentElement;
      var scrollable = h.scrollHeight - h.clientHeight;
      var pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
      progress.style.width = Math.min(100, pct) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(updateProgress); ticking = true; }
    }, { passive: true });
    updateProgress();
  }

  /* ----- Scroll reveal ----- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ----- Copy link button + native share ----- */
  var shareBar = document.getElementById('shareBar');
  var copyBtn = document.getElementById('copyLink');
  if (shareBar && copyBtn) {
    var shareUrl = shareBar.getAttribute('data-url') || window.location.href;
    var shareTitle = shareBar.getAttribute('data-title') || document.title;

    // If the browser supports the native Share API, add a native share button
    if (navigator.share) {
      var nativeBtn = document.createElement('button');
      nativeBtn.className = 'share-btn';
      nativeBtn.setAttribute('aria-label', 'Share');
      nativeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
      nativeBtn.addEventListener('click', function () {
        navigator.share({ title: shareTitle, url: shareUrl }).catch(function () {});
      });
      shareBar.insertBefore(nativeBtn, copyBtn);
    }

    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.classList.add('copied');
        var original = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(function () { copyBtn.classList.remove('copied'); copyBtn.innerHTML = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(done).catch(function () { fallbackCopy(shareUrl, done); });
      } else {
        fallbackCopy(shareUrl, done);
      }
    });
  }
  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ----- TOC scrollspy ----- */
  var tocLinks = document.querySelectorAll('.toc-sidebar a');
  if (tocLinks.length) {
    var headings = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.charAt(0) === '#') {
        var el = document.getElementById(id.slice(1));
        if (el) headings.push({ el: el, link: link });
      }
    });
    var spyTicking = false;
    function scrollspy() {
      var pos = document.documentElement.scrollTop + 120;
      var current = null;
      headings.forEach(function (h) {
        if (h.el.offsetTop <= pos) current = h;
      });
      tocLinks.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.link.classList.add('active');
      spyTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!spyTicking) { window.requestAnimationFrame(scrollspy); spyTicking = true; }
    }, { passive: true });
    scrollspy();
  }

  /* ----- Section nav scrollspy (single-page) ----- */
  var sectionNav = document.getElementById('sectionNav');
  if (sectionNav) {
    var navLinks = sectionNav.querySelectorAll('a');
    var sections = [];
    navLinks.forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.charAt(0) === '#') {
        var el = document.getElementById(id.slice(1));
        if (el) sections.push({ el: el, link: link });
      }
    });
    var navTicking = false;
    function sectionScrollspy() {
      var pos = document.documentElement.scrollTop + 140;
      var current = sections[0] ? sections[0].link : null;
      sections.forEach(function (s) {
        if (s.el.offsetTop <= pos) current = s.link;
      });
      navLinks.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.classList.add('active');
      navTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!navTicking) { window.requestAnimationFrame(sectionScrollspy); navTicking = true; }
    }, { passive: true });
    sectionScrollspy();
  }

  /* ----- Header scrolled state ----- */
  var header = document.querySelector('.site-header');
  if (header) {
    var headerTick = false;
    function headerState() {
      if (window.scrollY > 20) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
      headerTick = false;
    }
    window.addEventListener('scroll', function () {
      if (!headerTick) { requestAnimationFrame(headerState); headerTick = true; }
    }, { passive: true });
  }

  /* ----- Animated count-up for hero stats ----- */
  var counters = document.querySelectorAll('.hero-stat .num[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var dur = 1400, start = 0, startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var prog = Math.min((ts - startTime) / dur, 1);
          var eased = 1 - Math.pow(1 - prog, 3);
          var val = Math.floor(eased * target);
          el.textContent = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
          if (prog < 1) requestAnimationFrame(step);
          else el.textContent = target >= 1000 ? (target / 1000).toFixed(1) + 'k' : target;
        }
        requestAnimationFrame(step);
        countObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { countObs.observe(c); });
  } else {
    counters.forEach(function (c) {
      var t = parseInt(c.getAttribute('data-count'), 10) || 0;
      c.textContent = t >= 1000 ? (t / 1000).toFixed(1) + 'k' : t;
    });
  }

  /* ----- Newsletter form (front-end demo) ----- */
  var nlForm = document.getElementById('newsletterForm');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var success = document.getElementById('newsletterSuccess');
      nlForm.style.display = 'none';
      if (success) success.classList.add('show');
    });
  }

  /* ----- Copy buttons on code blocks ----- */
  var pres = document.querySelectorAll('.post-content pre');
  pres.forEach(function (pre) {
    var btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      function done() {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
    pre.appendChild(btn);
  });

  /* ----- Back to top ring with progress ----- */
  var ring = document.getElementById('backToTopRing');
  var ringProg = document.getElementById('ringProgress');
  if (ring && ringProg) {
    var CIRC = 138.23;
    var ringTick = false;
    function updateRing() {
      var h = document.documentElement;
      var scrollable = h.scrollHeight - h.clientHeight;
      var pct = scrollable > 0 ? h.scrollTop / scrollable : 0;
      ringProg.style.strokeDashoffset = String(CIRC * (1 - pct));
      if (window.scrollY > 400) ring.classList.add('show');
      else ring.classList.remove('show');
      ringTick = false;
    }
    window.addEventListener('scroll', function () {
      if (!ringTick) { requestAnimationFrame(updateRing); ringTick = true; }
    }, { passive: true });
    ring.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    updateRing();
  }

  /* ----- Section in-view animation (gradient underline) ----- */
  var pageSections = document.querySelectorAll('.page-section');
  if ('IntersectionObserver' in window && pageSections.length) {
    var psObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); psObs.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    pageSections.forEach(function (s) { psObs.observe(s); });
  } else {
    pageSections.forEach(function (s) { s.classList.add('in-view'); });
  }

  /* ----- Show reader controls after a moment ----- */
  var rc = document.getElementById('readerControls');
  if (rc) setTimeout(function () { rc.classList.add('show'); }, 1200);
})();
