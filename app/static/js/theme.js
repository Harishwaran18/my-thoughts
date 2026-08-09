(function () {
  const root = document.documentElement;
  const switcher = document.getElementById('themeSwitcher');

  function applyAuto() {
    const hour = new Date().getHours();
    const autoTheme = (hour >= 6 && hour < 19) ? 'light' : 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', (prefersDark && autoTheme === 'light') ? 'dark' : autoTheme);
  }

  function setMode(mode) {
    // mode: 'light' | 'dark' | 'auto'
    try { localStorage.setItem('themeMode', mode); } catch (e) {}
    if (mode === 'auto') applyAuto();
    else root.setAttribute('data-theme', mode);
    if (switcher) {
      switcher.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-theme-set') === mode);
      });
    }
  }

  const saved = localStorage.getItem('themeMode') || 'auto';
  setMode(saved);

  if (switcher) {
    switcher.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () { setMode(btn.getAttribute('data-theme-set')); });
    });
  }

  // Re-apply auto every 10 min (in case the hour boundary crosses)
  if (saved === 'auto') setInterval(function () { if (localStorage.getItem('themeMode') === 'auto') applyAuto(); }, 600000);
})();
