// Test-only records. These are copied into an isolated project, never production content.
export const NOW = '2026-10-12T09:59:59Z';
export const eventFixture = {
  title: 'Original fixture event', slug: 'shared-event', status: 'published', summary: 'Original fixture summary',
  start: '2026-10-12T14:00:00+02:00', end: '2026-10-12T16:00:00+02:00',
  registrationRequired: true, registrationOpens: '2026-10-10T12:00:00+02:00',
  registrationCloses: '2026-10-12T12:00:00+02:00', registrationUrl: 'https://example.org/register', registrationLabel: 'Register fixture',
  image: '/media/fixture.svg', imageAlt: 'A test illustration',
  sticker: '/media/sticker.svg', calendarImage: '/media/fixture.svg',
  location: 'Test venue', audience: 'Fixture audience', language: 'English', cost: 'Fixture cost', accessibility: 'Test accessibility information.',
};
export const otherEvents = [
  { title: 'Overnight fixture', slug: 'overnight', start: '2026-10-11T23:30:00+02:00', end: '2026-10-13T00:00:00+02:00' },
  { title: 'Cancelled fixture', slug: 'cancelled', start: '2026-10-12T15:00:00+02:00', end: '2026-10-12T17:00:00+02:00', cancelled: true, cancellationNotice: 'Fixture cancellation notice.' },
  { title: 'Older fixture', slug: 'older', start: '2026-10-09T18:00:00+02:00', end: '2026-10-09T20:00:00+02:00', calendarImage: '/media/sticker.svg' },
  { title: 'Recent past fixture', slug: 'recent-past', start: '2026-10-10T18:00:00+02:00', end: '2026-10-10T20:00:00+02:00' },
  { title: 'Future DST fixture', slug: 'future-dst', start: '2026-10-25T02:30:00+02:00', end: '2026-10-25T02:30:00+01:00', accessibility: 'A fixture note containing the literal </script> delimiter.' },
].map((entry) => ({ status: 'published', summary: 'Only a test fixture.', attendance: 'Fixture attendance instructions.', ...entry }));

export const stackedEvents = [1, 2, 3, 4].map((index) => ({
  title: `Stacked fixture ${index}`, slug: `stacked-${index}`, status: 'published',
  summary: 'Only a calendar overflow fixture.', attendance: 'Fixture attendance instructions.',
  start: `2026-09-15T1${index}:00:00+02:00`, end: `2026-09-15T1${index}:30:00+02:00`,
}));

export const milestoneFixtures = ['2026-09-01', '2024-05-12', '2024-05-12', '2023-03-20', '2022-01-08', '2021-07-10', '2020-02-14', '2019-06-05'].map((milestoneDate, index) => ({
  title: index === 4 ? 'Fixture milestone 5 — a longer title about building a welcoming community together' : `Fixture milestone ${index + 1}`,
  slug: `fixture-milestone-${index + 1}`, status: 'published', category: 'milestone',
  summary: 'A test-only milestone story.', date: `2026-10-0${8 - index}`, milestoneDate,
  sticker: index % 2 === 0 ? '/media/sticker.svg' : '',
}));

export const newsFixtures = [1, 2, 3, 4].map((index) => ({
  title: `Fixture news ${index}`, slug: `fixture-news-${index}`, status: 'published',
  summary: 'Test article summary.', category: index === 1 ? 'article' : index === 2 ? 'announcement' : 'news', date: `2026-10-0${index}`,
  sticker: index === 3 ? '' : '/media/sticker.svg',
  image: index === 1 || index === 4 ? '/media/fixture.svg' : '', imageAlt: index === 1 || index === 4 ? 'First article photograph' : '',
  gallery: index === 1 ? [{ image: '/media/photo.svg', alt: 'Second article photograph', caption: 'Another view of the gathering.' }] : [],
}));
