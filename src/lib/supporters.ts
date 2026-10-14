type SupporterImage = { id: string; data: { visible: boolean; logo: string; order: number } };
export function selectSupporterImages<T extends SupporterImage>(entries: T[]): T[] {
  return entries.filter(({ data }) => data.visible && Boolean(data.logo?.trim()))
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
