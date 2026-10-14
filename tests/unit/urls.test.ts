import { expect, test } from 'vitest';
import { withBase, stripBase } from '../../src/lib/urls';

test('withBase preserves external, mailto, tel, hash and empty paths', () => {
  expect(withBase('')).toBe('');
  expect(withBase(undefined)).toBe('');
  expect(withBase('https://example.org/path')).toBe('https://example.org/path');
  expect(withBase('http://example.org')).toBe('http://example.org');
  expect(withBase('mailto:user@example.org')).toBe('mailto:user@example.org');
  expect(withBase('tel:+39011123456')).toBe('tel:+39011123456');
  expect(withBase('#main')).toBe('#main');
  expect(withBase('//cdn.example.com/asset.js')).toBe('//cdn.example.com/asset.js');
});

test('withBase formats internal paths with or without base', () => {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  if (!base) {
    expect(withBase('/')).toBe('/');
    expect(withBase('/events/')).toBe('/events/');
    expect(withBase('events/')).toBe('/events/');
    expect(stripBase('/events/')).toBe('/events/');
  } else {
    expect(withBase('/')).toBe(`${base}/`);
    expect(withBase('/events/')).toBe(`${base}/events/`);
    expect(withBase('events/')).toBe(`${base}/events/`);
    expect(withBase(`${base}/events/`)).toBe(`${base}/events/`);
    expect(stripBase(`${base}/events/`)).toBe('/events/');
    expect(stripBase(`${base}/`)).toBe('/');
  }
});
