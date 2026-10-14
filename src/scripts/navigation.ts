export {};

const header = document.querySelector<HTMLElement>('[data-site-header]');
const toggle = header?.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const navigation = header?.querySelector<HTMLElement>('[data-site-navigation]');
const mobile = matchMedia('(max-width: 64rem)');

if (header && toggle && navigation) {
  function setOpen(open: boolean) {
    toggle!.setAttribute('aria-expanded', String(open));
    navigation!.hidden = mobile.matches && !open;
  }
  function syncViewport() {
    const toggleHadFocus = document.activeElement === toggle;
    toggle!.hidden = !mobile.matches;
    // Return focus before hiding navigation on a desktop → mobile resize.
    if (mobile.matches && navigation!.contains(document.activeElement)) toggle!.focus();
    setOpen(false);
    if (!mobile.matches && toggleHadFocus) navigation!.querySelector<HTMLAnchorElement>('a[aria-current="page"], a')?.focus();
  }
  syncViewport();
  mobile.addEventListener('change', syncViewport);
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (mobile.matches && event.target instanceof Node && !header.contains(event.target)) setOpen(false);
  });
  // Without JavaScript the toggle stays hidden and all navigation links remain visible.
}
