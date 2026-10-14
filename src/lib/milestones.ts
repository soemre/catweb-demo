interface MilestoneEntry {
  data: { status: string; category: string; milestoneDate?: string; slug: string };
}

export function selectMilestones<T extends MilestoneEntry>(entries: readonly T[]): T[] {
  return entries.filter(({ data }) => data.status === 'published' && data.category === 'milestone')
    .sort((a, b) => (b.data.milestoneDate ?? '').localeCompare(a.data.milestoneDate ?? '') || a.data.slug.localeCompare(b.data.slug));
}
