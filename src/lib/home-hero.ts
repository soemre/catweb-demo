import type { HomeHeroData } from './schemas';

/** Local seeded artwork is a fallback only; CMS selections and the enable switch win. */
export function resolveHomeHero(cms: HomeHeroData, demo?: HomeHeroData): HomeHeroData {
  if (!cms.enabled || cms.image || !demo?.enabled || !demo.image) return cms;
  return { ...cms, image: demo.image, alt: cms.alt.trim() || demo.alt };
}
