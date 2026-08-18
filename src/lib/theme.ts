// Применяет тему: класс .dark на <html> + цвет статус-бара
export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', dark ? '#0F1512' : '#0F2A1D')
  }
}