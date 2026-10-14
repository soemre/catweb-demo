export type AnalyticsMode = 'dashboard' | 'manual' | 'off';

export function analyticsConfig(mode = 'dashboard', token = ''): { mode: AnalyticsMode; token?: string } {
  if (!['dashboard', 'manual', 'off'].includes(mode)) throw new Error('PUBLIC_ANALYTICS_MODE must be dashboard, manual or off');
  if (mode !== 'manual') {
    if (mode === 'dashboard' && token) throw new Error('A Web Analytics token requires explicit manual mode. Use either dashboard injection or manual injection.');
    return { mode: mode as AnalyticsMode };
  }
  if (!/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(token)) throw new Error('Manual analytics requires the public site token from Cloudflare Web Analytics');
  return { mode: 'manual', token };
}
