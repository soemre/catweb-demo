import { z } from 'zod';

export const optionalText = z.string().nullish().transform((value) => value ?? '');
export const link = z.string().refine((value) => {
  if (!/^(\/(?!\/)|https?:\/\/|mailto:)/i.test(value)) return false;
  try {
    const url = new URL(value, 'https://collettivoalanturing.it');
    return value.startsWith('/') ? url.origin === 'https://collettivoalanturing.it' : ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch { return false; }
}, 'Use a valid site path, https:// URL or mailto: link');
export const optionalLink = z.union([link, z.literal('')]).nullish().transform((v) => v ?? '');
const media = z.union([z.string().regex(/^\/media\/[^?#]+$/, 'Upload to /media/'), z.literal('')]).nullish().transform((v) => v ?? '');
export const seo = z.object({ title: optionalText, description: optionalText, image: media });
const button = z.object({ label: z.string().min(1), url: link });
const nav = z.object({ home: button, join: button, events: button, milestones: button, news: button, resources: button, contact: button });
const strings = <T extends readonly string[]>(keys: T) => z.object(Object.fromEntries(keys.map((key) => [key, z.string().min(1)])) as { [K in T[number]]: z.ZodString });

export const siteSchema = z.object({
  name: z.string().min(1), logo: media, logoDark: media, logoAlt: optionalText,
  description: z.string().min(1), shareImage: media,
  dateLocale: z.string().refine((locale) => { try { new Intl.DateTimeFormat(locale); return true; } catch { return false; } }, 'Use a valid locale'),
  contact: z.object({ email: z.email(), office: z.string().min(1), fiscalCode: z.string().regex(/^\d+$/), telegram: link, instagram: link, linkedin: link }),
  navigation: nav,
  footer: z.object({ copy: z.string() }),
  ui: z.object({
    skip: z.string().min(1), navigation: z.string().min(1), menu: z.string().min(1),
    theme: strings(['label', 'light', 'dark', 'toggleLabel'] as const).extend({ default: z.enum(['light', 'dark', 'system']) }),
    event: strings(['upcoming', 'happening', 'past', 'cancelled', 'ended', 'closed', 'opens', 'noRegistration', 'checkWithJavaScript', 'homeWithoutJavaScript', 'browserWithoutJavaScript', 'start', 'end', 'location', 'venueLink', 'audience', 'language', 'cost', 'accessibility', 'registration', 'opening', 'closing', 'recap', 'gallery', 'materials'] as const),
    post: strings(['backHome', 'backEvents', 'backNews', 'backMilestones', 'backResources', 'publishedOn', 'milestoneDate', 'author'] as const),
    resource: strings(['guide', 'external', 'official', 'file', 'provider', 'checked', 'preview'] as const),
    empty: strings(['events', 'news', 'resources', 'supporters', 'achievements'] as const),
    notFound: z.object({ title: z.string(), body: z.string(), action: button }),
  }),
});

const pageBase = z.object({ title: z.string().min(1), headline: z.string().min(1), seo });
const preview = z.object({ heading: z.string(), intro: z.string(), count: z.number().int().min(0).max(5), action: button });
const eventPreview = preview.extend({ count: z.number().int().min(0).max(3), countdown: strings(['days', 'hours', 'minutes', 'seconds', 'label'] as const) });
export const homeHeroSchema = z.object({
  enabled: z.boolean().default(true), image: media, alt: optionalText,
  focusX: z.number().min(0).max(100).nullish().transform((value) => value ?? 50),
  focusY: z.number().min(0).max(100).nullish().transform((value) => value ?? 50),
}).superRefine((hero, ctx) => {
  if (hero.enabled && hero.image && !hero.alt.trim()) ctx.addIssue({ code: 'custom', path: ['alt'], message: 'Add alternative text for the Home opening photo' });
});
export type HomeHeroData = z.infer<typeof homeHeroSchema>;
const membershipFormUrl = optionalLink.refine((value) => {
  if (!value) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return !(url.hostname === 'docs.google.com' && url.pathname.includes('/forms/') && /\/edit\/?$/.test(url.pathname));
  } catch { return false; }
}, 'Use the published form responder URL, not a Google Forms editor URL');
export const pageSchemas = {
  home: pageBase.extend({ safeSpace: z.string(), intro: z.string(), invitations: z.string(), hero: homeHeroSchema.nullish().transform((value) => value ?? homeHeroSchema.parse({})), events: eventPreview, news: preview, supporters: strings(['heading'] as const) }),
  join: pageBase.extend({ intro: z.string(), ideas: z.string(), growth: z.object({ heading: z.string(), body: z.string() }), areas: z.object({ heading: z.string(), intro: z.string(), choice: z.string() }), membership: z.object({ heading: z.string(), intro: z.string(), information: optionalText, formUrl: membershipFormUrl, formLabel: z.string(), events: button, emailLabel: z.string(), questions: z.string(), contact: button, eligibility: optionalText, eligibilityLabel: z.string(), fee: optionalText, feeLabel: z.string(), duration: optionalText, durationLabel: z.string(), approval: optionalText, approvalLabel: z.string() }) }),
  events: pageBase.extend({ intro: z.string(), controls: strings(['agenda', 'backCalendar', 'previous', 'next', 'today', 'month', 'selectDay', 'moreEvents', 'selectedDay'] as const), empty: strings(['all', 'month', 'day'] as const) }),
  milestones: pageBase.extend({ intro: z.string(), timelineHeading: z.string().min(1), learnMore: z.string().min(1), empty: z.string().min(1) }),
  news: pageBase.extend({ intro: z.string(), listingHeading: z.string(), categories: strings(['news', 'article', 'announcement', 'milestone'] as const), controls: strings(['previousPhoto', 'nextPhoto', 'photoPosition', 'loading', 'loaded'] as const) }),
  resources: pageBase.extend({ intro: z.string(), invitation: z.string() }),
  contact: pageBase.extend({ intro: z.string(), detailsHeading: z.string(), labels: strings(['telegram', 'instagram', 'linkedin', 'office', 'fiscalCode'] as const) }),
};

const editorial = z.object({
  title: optionalText, slug: optionalText, summary: optionalText,
  status: z.enum(['draft', 'published']).default('draft'),
  image: media, imageAlt: optionalText, seo: seo.optional(),
});
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/, 'Use an ISO timestamp including seconds and Z or an explicit UTC offset').refine((value) => z.iso.datetime({ offset: true }).safeParse(value).success && Number.isFinite(Date.parse(value)), 'Invalid timestamp');
// Astro's YAML reader converts unquoted ISO scalars to Date objects. Source
// validation uses YAML 1.2 strings first, so timezone-less source still fails.
const astroDate = (value: unknown, dateOnly = false) => value instanceof Date && Number.isFinite(value.valueOf()) ? value.toISOString().slice(0, dateOnly ? 10 : undefined) : value;
const optionalInstant = z.preprocess((value) => astroDate(value), z.union([iso, z.literal('')]).nullish().transform((v) => v || undefined));
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Invalid date');
const optionalDate = z.preprocess((value) => astroDate(value, true), z.union([dateOnly, z.literal('')]).nullish().transform((v) => v || undefined));
const imageItem = z.object({ image: media, alt: optionalText, caption: optionalText });
const illustratedEditorial = editorial.extend({ sticker: media, gallery: z.array(imageItem).nullish().transform((v) => v ?? []) });
const material = z.object({ title: z.string().min(1), url: link });
export const eventSchema = illustratedEditorial.extend({
  start: optionalInstant, end: optionalInstant, calendarImage: media,
  location: optionalText, venueUrl: optionalLink, audience: optionalText, language: optionalText, cost: optionalText, accessibility: optionalText,
  registrationRequired: z.boolean().default(false), registrationOpens: optionalInstant, registrationCloses: optionalInstant,
  registrationUrl: optionalLink, registrationLabel: optionalText, manuallyClosed: z.boolean().default(false),
  cancelled: z.boolean().default(false), cancellationNotice: optionalText,
  attendance: optionalText, recap: optionalText,
  materials: z.array(material).nullish().transform((v) => v ?? []),
}).superRefine((event, ctx) => {
  if (event.status !== 'published') return;
  const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  for (const field of ['title', 'slug', 'summary', 'start', 'end'] as const) if (!event[field]) fail(field, 'Required for a published event');
  if (event.start && event.end && Date.parse(event.start) >= Date.parse(event.end)) fail('end', 'End must be after start');
  if (event.registrationRequired) {
    if (!/^https?:\/\//i.test(event.registrationUrl)) fail('registrationUrl', 'Published registration requires a valid external form URL');
    if (!event.registrationCloses) fail('registrationCloses', 'Published registration requires a closing deadline');
  }
  if (event.registrationOpens && event.registrationCloses && Date.parse(event.registrationOpens) >= Date.parse(event.registrationCloses)) fail('registrationOpens', 'Opening must be before closing');
  if (event.registrationCloses && event.end && Date.parse(event.registrationCloses) > Date.parse(event.end)) fail('registrationCloses', 'Closing must not be after event end');
});
export const newsSchema = illustratedEditorial.extend({ category: z.enum(['news', 'article', 'announcement', 'milestone']).default('news'), author: optionalText, date: optionalDate, milestoneDate: optionalDate }).superRefine((post, ctx) => {
  if (post.status === 'published' && post.category === 'milestone' && !post.milestoneDate) {
    ctx.addIssue({ code: 'custom', path: ['milestoneDate'], message: 'Required for a published milestone: enter the date it happened' });
  }
});
export const resourceSchema = editorial.extend({ status: z.enum(['draft', 'preview', 'published']).default('draft'), kind: z.enum(['guide', 'external', 'file']).default('guide'), order: z.number().int().default(0), provider: optionalText, url: optionalLink, file: media, checked: optionalDate, editorNotes: optionalText });
export const areaSchema = z.object({ name: z.string().min(1), description: optionalText, contribute: optionalText, order: z.number().int(), visible: z.boolean().default(true) });
export const achievementSchema = z.object({ text: z.string().min(1), order: z.number().int(), published: z.boolean().default(false), verification: z.enum(['pending', 'confirmed', 'rejected']).default('pending'), editorNotes: optionalText });
export const supporterSchema = z.object({ name: z.string().min(1), website: link, logo: media, logoAlt: optionalText, relationship: optionalText, order: z.number().int(), visible: z.boolean().default(false) });
export const collectionSchemas = { events: eventSchema, news: newsSchema, resources: resourceSchema, areas: areaSchema, achievements: achievementSchema, supporters: supporterSchema };
export type EventData = z.infer<typeof eventSchema>;
export type SiteData = z.infer<typeof siteSchema>;

export function assertPublicCopy(value: unknown, path = 'content'): void {
  if (typeof value === 'string' && /(?:^|\n)\s*\[[^\]\n]+\]\s*(?:$|\n)|\[(?:Explain|Confirm|Founding year|Year and details|Membership details|Upcoming event|Recent news|Supporting organisation|Resource entr|Guide or resource|Add further)/i.test(value)) {
    throw new Error(`${path}: editor placeholders cannot be published`);
  }
  if (Array.isArray(value)) value.forEach((v, i) => assertPublicCopy(v, `${path}.${i}`));
  else if (value && typeof value === 'object') for (const [key, v] of Object.entries(value)) if (key !== 'editorNotes') assertPublicCopy(v, `${path}.${key}`);
}
