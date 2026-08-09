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
})();
