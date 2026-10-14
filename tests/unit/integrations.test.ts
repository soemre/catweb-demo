import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { analyticsConfig } from '../../src/lib/analytics';
import { pageSchemas } from '../../src/lib/schemas';

test('tracking configuration is explicit and rejects conflicting injection modes', () => {
  expect(analyticsConfig()).toEqual({ mode: 'dashboard' });
  expect(analyticsConfig('off', '00000000000000000000000000000001')).toEqual({ mode: 'off' });
  expect(() => analyticsConfig('dashboard', '00000000000000000000000000000001')).toThrow(/explicit manual/);
  expect(() => analyticsConfig('manual')).toThrow(/public site token/);
  expect(() => analyticsConfig('manual', 'not-an-analytics-token')).toThrow(/public site token/);
  expect(() => analyticsConfig('unknown')).toThrow(/PUBLIC_ANALYTICS_MODE/);
  expect(analyticsConfig('manual', '00000000000000000000000000000001').token).toBe('00000000000000000000000000000001');
});

const join = JSON.parse(readFileSync('content/pages/join.json', 'utf8'));
test.each(['https://forms.gle/test', 'https://docs.google.com/forms/d/e/test-form/viewform', ''])('membership accepts responder URLs or the empty fallback: %s', (formUrl) => {
  expect(pageSchemas.join.safeParse({ ...join, membership: { ...join.membership, formUrl } }).success).toBe(true);
});
test.each(['https://docs.google.com/forms/d/test-form/edit', 'https://', '/fake-form/'])('membership rejects editor/broken form destinations: %s', (formUrl) => {
  expect(pageSchemas.join.safeParse({ ...join, membership: { ...join.membership, formUrl } }).success).toBe(false);
});
