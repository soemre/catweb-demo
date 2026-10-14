import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { collectionSchemas } from './lib/schemas';

// Explicit keys preserve collection-specific type inference.
const events = defineCollection({ loader: glob({ base: './content/events', pattern: '*.md', generateId: ({ entry }) => entry.replace(/\.md$/, '') }), schema: collectionSchemas.events });
const news = defineCollection({ loader: glob({ base: './content/news', pattern: '*.md', generateId: ({ entry }) => entry.replace(/\.md$/, '') }), schema: collectionSchemas.news });
const resources = defineCollection({ loader: glob({ base: './content/resources', pattern: '*.md', generateId: ({ entry }) => entry.replace(/\.md$/, '') }), schema: collectionSchemas.resources });
const areas = defineCollection({ loader: glob({ base: './content/areas', pattern: '*.json' }), schema: collectionSchemas.areas });
const achievements = defineCollection({ loader: glob({ base: './content/achievements', pattern: '*.json' }), schema: collectionSchemas.achievements });
const supporters = defineCollection({ loader: glob({ base: './content/supporters', pattern: '*.json' }), schema: collectionSchemas.supporters });
export const collections = { events, news, resources, areas, achievements, supporters };
