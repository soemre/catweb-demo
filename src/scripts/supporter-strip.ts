export {};

for (const root of document.querySelectorAll<HTMLElement>('[data-supporter-strip]')) {
  const viewport = root.querySelector<HTMLElement>('[data-supporter-viewport]')!;
  const track = root.querySelector<HTMLElement>('[data-supporter-track]')!;
  const original = root.querySelector<HTMLElement>('[data-supporter-original]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let period = 0, frame = 0, last = 0, offset = 0;
  let hover = false, dragging = false, visible = false;
  const canRun = () => period > 0 && !reduced.matches && !hover && !dragging && !viewport.contains(document.activeElement) && !document.hidden && visible;

  function step(time: number) {
    frame = 0;
    if (!canRun()) { sync(); return; }
    if (last) {
      // Positive native scrolling moves the images left; fractional pixels accumulate.
      offset = (offset + Math.min(time - last, 100) * .03) % period;
      viewport.scrollLeft = offset;
    }
    last = time;
    frame = requestAnimationFrame(step);
  }
  function sync() {
    const running = canRun();
    root.dataset.running = String(running);
    if (!running) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else if (!frame) {
      offset = viewport.scrollLeft % period;
      viewport.scrollLeft = offset;
      last = 0;
      frame = requestAnimationFrame(step);
    }
  }
  function rebuild() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    track.querySelectorAll('[data-supporter-clone]').forEach((copy) => copy.remove());
    period = 0;
    if (!reduced.matches && original.children.length > 1) {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      period = original.getBoundingClientRect().width + gap;
      if (period > 0) {
        // Fill the viewport plus a complete repeat, even when the image set is short.
        const count = Math.ceil((viewport.clientWidth + gap) / period) + 1;
        for (let index = 1; index < count; index++) {
          const copy = original.cloneNode(true) as HTMLElement;
          copy.removeAttribute('data-supporter-original'); copy.dataset.supporterClone = '';
          copy.setAttribute('aria-hidden', 'true');
          copy.querySelectorAll('[data-supporter]').forEach((item) => item.removeAttribute('data-supporter'));
          copy.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => { link.tabIndex = -1; });
          // Copies remain pointer-clickable links, but add no duplicate screen-reader/Tab entries.
          track.append(copy);
        }
        viewport.scrollLeft %= period;
      }
    }
    sync();
  }
  viewport.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hover = true; sync(); } });
  viewport.addEventListener('pointerleave', () => { hover = false; sync(); });
  viewport.addEventListener('pointerdown', () => { dragging = true; sync(); });
  window.addEventListener('pointerup', () => { if (dragging) { dragging = false; sync(); } });
  window.addEventListener('pointercancel', () => { dragging = false; sync(); });
  viewport.addEventListener('focusin', sync);
  viewport.addEventListener('focusout', () => queueMicrotask(sync));
  reduced.addEventListener('change', rebuild);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; last = 0; });
  new ResizeObserver(rebuild).observe(viewport);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(viewport);
  rebuild();
}
