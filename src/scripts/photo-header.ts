// Native horizontal scrolling remains available when JavaScript is disabled.
export function initPhotoHeaders(scope: ParentNode): () => void {
  const cleanups: (() => void)[] = [];
  for (const root of scope.querySelectorAll<HTMLElement>('[data-photo-header]')) {
    const track = root.querySelector<HTMLElement>('[data-photo-track]')!;
    const slides = Array.from(track.querySelectorAll<HTMLElement>('[data-photo-slide]'));
    const controls = root.querySelector<HTMLElement>('[data-photo-controls]');
    if (!controls || slides.length < 2) continue;
    const previous = controls.querySelector<HTMLButtonElement>('[data-photo-previous]')!;
    const next = controls.querySelector<HTMLButtonElement>('[data-photo-next]')!;
    const position = controls.querySelector<HTMLElement>('[data-photo-position]')!;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0, frame = 0;
    const update = () => {
      position.textContent = root.dataset.positionLabel!.replace('{current}', String(index + 1)).replace('{total}', String(slides.length));
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      root.dataset.photoIndex = String(index);
    };
    const go = (target: number) => {
      index = Math.max(0, Math.min(slides.length - 1, target));
      track.scrollTo({ left: index * track.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      update();
    };
    const onPrevious = () => go(index - 1);
    const onNext = () => go(index + 1);
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!track.clientWidth) return;
        index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
        update();
      });
    };
    const onKey = (event: KeyboardEvent) => {
      const target = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: slides.length - 1 }[event.key];
      if (target !== undefined) { event.preventDefault(); go(target); }
    };
    const resize = new ResizeObserver(() => {
      if (track.clientWidth) track.scrollTo({ left: index * track.clientWidth, behavior: 'instant' });
    });
    previous.addEventListener('click', onPrevious);
    next.addEventListener('click', onNext);
    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('keydown', onKey);
    resize.observe(track);
    controls.hidden = false;
    update();
    cleanups.push(() => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      previous.removeEventListener('click', onPrevious);
      next.removeEventListener('click', onNext);
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('keydown', onKey);
    });
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
