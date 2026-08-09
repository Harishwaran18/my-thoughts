(function () {
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  // Determine initial theme: saved preference > auto by local time > OS preference
  const saved = localStorage.getItem('theme');
  if (saved) {
    setTheme(saved);
  } else {
    const hour = new Date().getHours();
    // Light 6am–7pm, dark otherwise — auto day/night
    const autoTheme = (hour >= 6 && hour < 19) ? 'light' : 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark && autoTheme === 'light' ? 'dark' : autoTheme);
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      const current = root.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
})();
