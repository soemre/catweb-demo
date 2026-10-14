import { initPhotoHeaders } from './photo-header';
import { applyReturnLinks, returnOriginOf } from './return-links';

type ReaderState = { windowY: number; listTop: number; readerTop?: number; fromList?: boolean; focusHref?: string };
type Snapshot = { reader: string; heading: string; detail: string; selected: string; title: string; metadata: Node[]; navigation: string | null };
const metadataSelector = 'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[data-site-structured-data]';
const root = document.querySelector<HTMLElement>('[data-news-workspace]');

if (root) {
  const workspace = root;
  const reader = workspace.querySelector<HTMLElement>('[data-news-reader]')!;
  const heading = workspace.querySelector<HTMLElement>('[data-news-page-heading]')!;
  const list = workspace.querySelector<HTMLElement>('[data-news-list]');
  const sidebar = workspace.querySelector<HTMLElement>('[data-news-sidebar]')!;
  const status = workspace.querySelector<HTMLElement>('[data-news-status]')!;
  const mobile = matchMedia('(max-width: 64rem)');
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const fitPanels = () => {
    if (header) workspace.style.setProperty('--news-header-height', `${header.getBoundingClientRect().height}px`);
  };
  fitPanels();
  // Logo edits, font loading and resized navigation can all change the header height.
  const headerSize = new ResizeObserver(fitPanels);
  if (header) headerSize.observe(header);
  const indexUrl = new URL(workspace.dataset.newsUrl!, location.origin);
  const cache = new Map<string, Snapshot>();
  let controller: AbortController | undefined;
  let cleanupPhotos = initPhotoHeaders(reader);
  applyReturnLinks(reader, returnOriginOf(history.state));
  let scrollFrame = 0;
  let renderedPath = location.pathname;
  const originalScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';

  function snapshot(doc: Document): Snapshot {
    const incoming = doc.querySelector<HTMLElement>('[data-news-workspace]');
    if (!incoming) throw new Error('No news reader at this destination');
    return {
      reader: incoming.querySelector('[data-news-reader]')!.innerHTML,
      heading: incoming.querySelector('[data-news-page-heading]')!.innerHTML,
      detail: incoming.dataset.newsDetail!, selected: incoming.dataset.newsSelected!,
      title: doc.title,
      metadata: Array.from(doc.head.querySelectorAll(metadataSelector)).map((node) => node.cloneNode(true)),
      navigation: doc.querySelector('[data-site-navigation] a[aria-current="page"]')?.getAttribute('href') ?? null,
    };
  }

  function remember() {
    // popstate changes the URL before its article has finished loading.
    if (location.pathname !== renderedPath) return;
    const previous = history.state?.newsReader as ReaderState | undefined;
    const newsReader: ReaderState = { ...previous, windowY: window.scrollY, listTop: list?.scrollTop ?? 0, readerTop: reader.scrollTop };
    if (document.activeElement instanceof HTMLAnchorElement && sidebar.contains(document.activeElement)) newsReader.focusHref = document.activeElement.pathname;
    history.replaceState({ ...history.state, newsReader }, '', location.href);
  }
  function rememberScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(remember);
  }
  cache.set(location.pathname, snapshot(document));
  // Preserve an existing state on Back/Forward restoration, including a mobile return.
  if (!history.state?.newsReader) remember();

  async function navigate(url: URL, mode: 'push' | 'pop', restored?: ReaderState) {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    if (mode === 'push') remember();
    reader.setAttribute('aria-busy', 'true');
    status.textContent = workspace.dataset.newsLoading!;
    try {
      let incoming = cache.get(url.pathname);
      if (!incoming) {
        const response = await fetch(url.href, { signal: request.signal });
        if (!response.ok || new URL(response.url).origin !== location.origin) throw new Error('Article could not be loaded');
        incoming = snapshot(new DOMParser().parseFromString(await response.text(), 'text/html'));
        cache.set(url.pathname, incoming);
      }
      if (request.signal.aborted) return;
      const state: ReaderState = mode === 'pop'
        ? restored ?? { windowY: 0, listTop: 0, readerTop: 0 }
        : { windowY: 0, listTop: list?.scrollTop ?? 0, readerTop: 0, fromList: location.pathname === indexUrl.pathname && url.pathname !== indexUrl.pathname };
      if (mode === 'push') {
        remember();
        // Choosing an article from the list means the way back is the list, not the page that first opened the reader.
        history.pushState({ newsReader: state, returnOrigin: 'news' }, '', url.href);
      }
      cleanupPhotos();
      reader.innerHTML = incoming.reader;
      heading.innerHTML = incoming.heading;
      renderedPath = url.pathname;
      workspace.dataset.newsDetail = incoming.detail;
      workspace.dataset.newsSelected = incoming.selected;
      cleanupPhotos = initPhotoHeaders(reader);
      applyReturnLinks(reader, returnOriginOf(history.state));
      for (const link of workspace.querySelectorAll<HTMLAnchorElement>('[data-news-link]')) {
        if (link.pathname === incoming.selected) link.setAttribute('aria-current', incoming.detail === 'true' ? 'page' : 'true');
        else link.removeAttribute('aria-current');
      }
      document.title = incoming.title;
      document.head.querySelectorAll(metadataSelector).forEach((node) => node.remove());
      incoming.metadata.forEach((node) => document.head.append(document.importNode(node, true)));
      for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-site-navigation] a')) {
        if (link.getAttribute('href') === incoming.navigation) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      if (list) list.scrollTop = state.listTop;
      reader.scrollTop = state.readerTop ?? 0;
      const focusTarget = mobile.matches && incoming.detail === 'false'
        ? workspace.querySelector<HTMLAnchorElement>(`[data-news-link][href="${state.focusHref ?? incoming.selected}"]`) ?? heading.querySelector<HTMLElement>('h1')
        : reader.querySelector<HTMLElement>('#news-article-title') ?? reader;
      focusTarget?.focus({ preventScroll: true });
      window.scrollTo({ top: state.windowY, behavior: 'instant' });
      status.textContent = workspace.dataset.newsLoaded!.replace('{title}', reader.querySelector('#news-article-title')?.textContent ?? document.title);
    } catch {
      // Real static links remain the fallback for unavailable or malformed responses.
      if (!request.signal.aborted) location.assign(url.href);
    } finally {
      if (controller === request) reader.removeAttribute('aria-busy');
    }
  }

  workspace.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-news-link], a[data-news-back]') : null;
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    if (url.pathname === location.pathname) return;
    if (anchor.hasAttribute('data-news-back') && history.state?.newsReader?.fromList) {
      history.back();
    } else void navigate(url, 'push');
  });
  window.addEventListener('popstate', (event) => {
    const url = new URL(location.href);
    if (url.pathname === indexUrl.pathname || Array.from(workspace.querySelectorAll<HTMLAnchorElement>('[data-news-link]')).some((link) => link.pathname === url.pathname)) {
      void navigate(url, 'pop', event.state?.newsReader);
    } else location.reload();
  });
  window.addEventListener('scroll', rememberScroll, { passive: true });
  reader.addEventListener('scroll', rememberScroll, { passive: true });
  list?.addEventListener('scroll', rememberScroll, { passive: true });
  window.addEventListener('pagehide', () => {
    remember();
    controller?.abort();
    history.scrollRestoration = originalScrollRestoration;
  });
  window.addEventListener('pageshow', () => {
    history.scrollRestoration = 'manual';
    const state = history.state?.newsReader as ReaderState | undefined;
    if (state) requestAnimationFrame(() => {
      if (list) list.scrollTop = state.listTop;
      reader.scrollTop = state.readerTop ?? 0;
      window.scrollTo({ top: state.windowY, behavior: 'instant' });
    });
  });
  mobile.addEventListener('change', () => {
    // Move focus before leaving it inside a pane that is now visually hidden.
    if (mobile.matches && workspace.dataset.newsDetail === 'false' && reader.contains(document.activeElement)) {
      workspace.querySelector<HTMLAnchorElement>('[data-news-link][aria-current]')?.focus({ preventScroll: true });
    } else if (mobile.matches && workspace.dataset.newsDetail === 'true' && sidebar.contains(document.activeElement)) {
      reader.querySelector<HTMLElement>('#news-article-title')?.focus({ preventScroll: true });
    }
  });
}
