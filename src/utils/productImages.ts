export function getProductPlaceholder(category?: string, name?: string): string {
  const key = (category || name || '').toLowerCase();
  if (key.includes('rehab') || key.includes('band') || key.includes('brace')) return 'https://picsum.photos/seed/rehab-gear/800/600';
  if (key.includes('skin') || key.includes('aesthetic') || key.includes('cream')) return 'https://picsum.photos/seed/skin-care/800/600';
  if (key.includes('hair')) return 'https://picsum.photos/seed/hair-care/800/600';
  if (key.includes('body') || key.includes('weight')) return 'https://picsum.photos/seed/body-care/800/600';
  if (key.includes('nutrition') || key.includes('diet')) return 'https://picsum.photos/seed/nutrition/800/600';
  return 'https://picsum.photos/seed/physiosmetic/800/600';
}

