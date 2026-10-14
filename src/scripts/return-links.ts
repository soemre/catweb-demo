export type Origin = 'home' | 'events' | 'milestones' | 'news' | 'resources';

const fromUrl = (url: URL): Origin | undefined => {
  if (url.origin !== location.origin) return;
  const path = url.pathname;
  if (path === '/') return 'home';
  if (path === '/events/') return 'events';
  if (path === '/milestones/') return 'milestones';
  if (path === '/resources/') return 'resources';
  if (path === '/news/' || path.startsWith('/news/')) return 'news';
};

function referrer(): URL | undefined {
  try { return document.referrer ? new URL(document.referrer) : undefined; } catch { return undefined; }
}

// Show only the way back to the page the visitor came from; without a usable origin the server defaults stay.
export function applyReturnLinks(scope: ParentNode, override?: Origin) {
  const ref = referrer();
  for (const box of scope.querySelectorAll<HTMLElement>('[data-return-links]')) {
    const allowed = box.dataset.returnAllowed!.split(' ');
    const origin = override ?? (ref && fromUrl(ref));
    if (!origin || !allowed.includes(origin)) { delete box.dataset.returnOrigin; continue; }
    for (const link of box.querySelectorAll<HTMLAnchorElement>('[data-return-to]')) link.hidden = link.dataset.returnTo !== origin;
    // Returning to the exact URL keeps state such as the selected calendar day.
    const target = box.querySelector<HTMLAnchorElement>(`[data-return-to="${origin}"]`)!;
    if (!override && ref && origin !== 'news') target.href = ref.pathname + ref.search;
    box.dataset.returnOrigin = origin;
  }
}

export const returnOriginOf = (state: unknown): Origin | undefined => (state as { returnOrigin?: Origin } | null)?.returnOrigin;

if (document.querySelector('[data-return-links]:not([data-return-origin])')) applyReturnLinks(document);
