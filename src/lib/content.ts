import { getCollection } from 'astro:content';
import siteFile from '../../content/site.json';
import homeFile from '../../content/pages/home.json';
import joinFile from '../../content/pages/join.json';
import eventsFile from '../../content/pages/events.json';
import milestonesFile from '../../content/pages/milestones.json';
import newsFile from '../../content/pages/news.json';
import resourcesFile from '../../content/pages/resources.json';
import contactFile from '../../content/pages/contact.json';
import { siteSchema, pageSchemas, homeHeroSchema } from './schemas';
import { resolveHomeHero } from './home-hero';
import { selectMilestones } from './milestones';

export const site = siteSchema.parse(siteFile);
export const pages = {
  home: pageSchemas.home.parse(homeFile), join: pageSchemas.join.parse(joinFile),
  events: pageSchemas.events.parse(eventsFile), news: pageSchemas.news.parse(newsFile),
  milestones: pageSchemas.milestones.parse(milestonesFile),
  resources: pageSchemas.resources.parse(resourcesFile), contact: pageSchemas.contact.parse(contactFile),
};
// The optional, Git-ignored sidecar is absent in clean builds and never changes Home CMS data.
const heroPreviews = import.meta.glob<unknown>('../../content/pages/demo-home-hero.demo.json', { eager: true, import: 'default' });
const heroPreview = Object.values(heroPreviews)[0];
export const homeHero = resolveHomeHero(pages.home.hero, heroPreview === undefined ? undefined : homeHeroSchema.parse(heroPreview));
export const getEvents = () => getCollection('events', ({ data }) => data.status === 'published');
export async function getNews() {
  return (await getCollection('news', ({ data }) => data.status === 'published'))
    .sort((a, b) => (b.data.date ?? '').localeCompare(a.data.date ?? '') || a.data.slug.localeCompare(b.data.slug));
}
export async function getMilestones() {
  return selectMilestones(await getCollection('news'));
}
export async function getResources() {
  return (await getCollection('resources', ({ data }) => data.status === 'published' || data.status === 'preview'))
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}
