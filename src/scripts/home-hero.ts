export {};

for (const hero of document.querySelectorAll<HTMLElement>('[data-home-hero]')) {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  function update() {
    frame = 0;
    const bounds = hero.getBoundingClientRect();
    const edge = header?.getBoundingClientRect().bottom ?? 0;
    const progress = bounds.height ? Math.max(0, Math.min(1, (edge - bounds.top) / bounds.height)) : 0;
    const opacity = reduced.matches ? '1' : String(1 - progress);
    if (hero.style.getPropertyValue('--hero-photo-opacity') !== opacity) hero.style.setProperty('--hero-photo-opacity', opacity);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', update);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  reduced.addEventListener('change', () => { cancelAnimationFrame(frame); update(); });
  const size = new ResizeObserver(schedule);
  size.observe(hero);
  if (header) size.observe(header);
}
