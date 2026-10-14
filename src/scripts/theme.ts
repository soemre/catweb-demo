export {};

const root = document.documentElement;
const control = document.querySelector<HTMLElement>('[data-theme-control]');
const toggle = control?.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const media = matchMedia('(prefers-color-scheme: dark)');
type Preference = 'light' | 'dark' | 'system';
const valid = (value: string | null | undefined): value is Preference => ['light', 'dark', 'system'].includes(value ?? '');

function apply(preference: Preference) {
  const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  if (toggle && control) {
    toggle.setAttribute('aria-checked', String(resolved === 'dark'));
    const destination = resolved === 'dark' ? control.dataset.lightLabel! : control.dataset.darkLabel!;
    toggle.title = control.dataset.toggleLabel!.replace('{theme}', destination);
  }
}
function choose(preference: Preference) {
  apply(preference);
  try { localStorage.setItem('cat-theme', preference); } catch {}
}
if (control && toggle) {
  const initial = root.dataset.themePreference ?? root.dataset.defaultTheme;
  apply(valid(initial) ? initial : 'system');
  control.hidden = false;
  toggle.addEventListener('click', () => choose(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  media.addEventListener('change', () => { if (root.dataset.themePreference === 'system') apply('system'); });
  window.addEventListener('storage', (event) => {
    if (event.key === 'cat-theme') apply(valid(event.newValue) ? event.newValue : valid(root.dataset.defaultTheme) ? root.dataset.defaultTheme : 'system');
  });
}
