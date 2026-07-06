export function initSearch() {
  const searchBtn = document.getElementById('searchBtn');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchClose = document.getElementById('searchClose');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  if (!searchBtn || !searchOverlay) return;

  searchBtn.addEventListener('click', () => { searchOverlay.classList.add('active'); searchInput?.focus(); });
  searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) searchOverlay.classList.remove('active'); });
  if (searchClose) searchClose.addEventListener('click', () => { searchOverlay.classList.remove('active'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchOverlay.classList.remove('active');
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchOverlay.classList.add('active'); searchInput?.focus(); }
  });

  if (!searchInput || !searchResults) return;

  const pages = [
    { title: 'Главная', url: '../index.html', content: 'ЧВК Military Special Forces 043 частная военная компания Roblox' },
    { title: 'Регламент', url: 'reglament.html', content: 'Регламент ЧВК MSF-043 правила поведения взаимодействия' },
    { title: 'Карбогрейд', url: 'karbogreyd.html', content: 'Карбогрейд система рангов грейды K1 K2 K3' },
    { title: 'Структура', url: 'struktura.html', content: 'Структура командование директор корпуса' },
    { title: 'Корпуса', url: 'korpusa.html', content: 'Корпуса SSC RSC MSC TSC ERS' },
    { title: 'USF', url: 'usf.html', content: 'Universal Strike Force' },
    { title: 'DMS', url: 'dms.html', content: 'Double MilSec' },
    { title: 'Feld Demons', url: 'fd.html', content: 'Feld Demons взвод' },
    { title: 'Рапорты', url: '../reports/index.html', content: 'Заполнитель рапортов' }
  ];

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) { searchResults.innerHTML = '<div class="search-empty">Введите запрос</div>'; return; }
    const results = pages.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    if (!results.length) { searchResults.innerHTML = '<div class="search-empty">Ничего не найдено</div>'; return; }
    searchResults.innerHTML = results.map(r => {
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const ctx = r.content.substring(0, 80) + '...';
      const highlighted = ctx.replace(regex, '<strong style="color:var(--accent)">$1</strong>');
      return `<a href="${r.url}" class="search-result"><div class="search-result-title">${r.title}</div><div class="search-result-context">${highlighted}</div></a>`;
    }).join('');
  });

  searchResults.addEventListener('click', (e) => {
    const link = e.target.closest('.search-result');
    if (link) searchOverlay.classList.remove('active');
  });
}