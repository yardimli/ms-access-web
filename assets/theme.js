(() => {
    const storageKey = 'acaciadb-theme';
    const root = document.documentElement;
    const toggle = document.querySelector('#theme-toggle');

    function applyTheme(theme, persist = false) {
        const nextTheme = theme === 'dark' ? 'dark' : 'light';
        root.dataset.theme = nextTheme;
        if (persist) localStorage.setItem(storageKey, nextTheme);
        if (!toggle) return;
        const isDark = nextTheme === 'dark';
        const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        toggle.setAttribute('aria-pressed', String(isDark));
        toggle.querySelector('i').className = `fas ${isDark ? 'fa-sun' : 'fa-moon'}`;
    }

    applyTheme(root.dataset.theme);
    toggle?.addEventListener('click', () => {
        applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
})();
