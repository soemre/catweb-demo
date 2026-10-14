export function withBase(path: string | undefined): string {
  if (!path) return '';
  if (/^(?:https?:|mailto:|tel:|#|\/\/)/i.test(path)) return path;
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  if (cleanPath === base || cleanPath.startsWith(`${base}/`)) return cleanPath;
  return `${base}${cleanPath}`;
}

export function stripBase(path: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  if (base && (path === base || path.startsWith(`${base}/`))) {
    return path.slice(base.length) || '/';
  }
  return path;
}
