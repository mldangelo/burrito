import raw from '../../data/places.json';

export const catalog = raw;
export const places = catalog.places;
export const currentPlaces = places.filter((p) => p.status !== 'watchlist');
export const watchlist = places.filter((p) => p.status === 'watchlist');
export const sourceMap = new Map(catalog.sources.map((s) => [s.id, s]));
export type Place = (typeof places)[number];
export type Location = Place['locations'][number];
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const path = (value = '') => base + '/' + value.replace(/^\//, '');
export const absolute = (value = '') => new URL(path(value), import.meta.env.SITE).href;
export const primary = (place: Place) =>
  place.locations.find((l) => l.id === place.primary_location_id)!;
export const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const shortName = (p: Place) => p.name.split(' — ')[0];
export const label = (s: string) => s.replaceAll('_', ' ').replaceAll('-', ' ');
export const dateLabel = (s: string) =>
  new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
export const evidenceLabels: Record<string, string> = {
  burrito_specific_editorial: 'Burrito review',
  restaurant_or_taco_editorial: 'Restaurant coverage',
  historical_burrito_review: 'Archive pick',
  menu_or_local_candidate: 'Neighborhood candidate',
  historical_significance: 'History stop',
  unconfirmed: 'Opening unconfirmed',
};
export function evidence(p: Place) {
  if (p.status === 'watchlist') return 'Opening unconfirmed';
  if (p.status === 'history') return 'History stop';
  return evidenceLabels[p.reviews[0].evidence];
}
export function order(p: Place) {
  return (
    p.standout_items.find((i) => i.location_ids.includes(p.primary_location_id))?.name ??
    p.standout_items[0].name
  );
}
export function description(p: Place) {
  return `${p.name} in ${primary(p).neighborhood}, San Francisco. ${order(p)}. Address, posted hours, review sources and visit notes.`;
}
export function formatWindows(windows: Location['hours']['weekly']['monday']) {
  if (windows === null) return 'Not confirmed';
  if (!windows.length) return 'Closed';
  return windows
    .map((w) => `${clock(w.opens)}–${clock(w.closes)}${w.closes_next_day ? ' next day' : ''}`)
    .join(' · ');
}
export function clock(value: string) {
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
}
export const basisLabels: Record<string, string> = {
  editorial: 'From editorial coverage',
  menu_candidate: 'From the menu',
  historical_review: 'From an older review',
};
export const scopeLabels: Record<string, string> = {
  restaurant: 'Restaurant hours',
  kitchen: 'Kitchen hours',
  online_ordering: 'Online ordering hours',
  truck_schedule: 'Truck schedule',
};
export const neighborhoods = [
  ...new Set(
    currentPlaces.flatMap((p) =>
      p.locations.filter((l) => l.operating_status === 'listed').map((l) => l.neighborhood),
    ),
  ),
].sort();
export const inNeighborhood = (name: string) =>
  currentPlaces.filter((p) =>
    p.locations.some((l) => l.operating_status === 'listed' && l.neighborhood === name),
  );
// A browsing category can cover several catalog style tags.
export const categories = [
  { id: 'all', name: 'A little of everything', icon: '✨', styles: [] },
  { id: 'classic-mission', name: 'Mission classics', icon: '🌯', styles: ['classic-mission'] },
  { id: 'california-style', name: 'Fries inside', icon: '🍟', styles: ['california-style'] },
  { id: 'breakfast', name: 'Breakfast', icon: '🍳', styles: ['breakfast'] },
  { id: 'seafood', name: 'Seafood', icon: '🐟', styles: ['seafood'] },
  {
    id: 'vegetarian',
    name: 'Meat alternatives',
    icon: '🌱',
    styles: ['vegetarian-standout', 'vegetarian-options'],
  },
];
// Stickers decorate a place's own style tags, most distinctive first.
export const stickers = [
  { style: 'california-style', icon: '🍟', name: 'Fries inside', tint: '#f2d9a2' },
  { style: 'breakfast', icon: '🍳', name: 'Breakfast', tint: '#f3e3a3' },
  { style: 'seafood', icon: '🐟', name: 'Seafood', tint: '#d3e3e1' },
  { style: 'vegetarian-standout', icon: '🌱', name: 'Meat alternative', tint: '#dbe5c6' },
  { style: 'vegetarian-options', icon: '🌱', name: 'Meat alternative', tint: '#dbe5c6' },
  { style: 'birria', icon: '🍲', name: 'Birria', tint: '#efcfc2' },
  { style: 'duck', icon: '🦆', name: 'Duck', tint: '#e2dccb' },
  { style: 'late-night', icon: '🌙', name: 'Late night', tint: '#dcdde9' },
  { style: 'food-truck', icon: '🚚', name: 'Truck', tint: '#e6dccd' },
  { style: 'history', icon: '📜', name: 'History', tint: '#e8ddc6' },
  { style: 'classic-mission', icon: '🌯', name: 'Mission classic', tint: '#ecd9c4' },
];
export const stickerFor = (style: string) => stickers.find((s) => s.style === style);
export const stickersFor = (p: Place, max = 2) =>
  stickers.filter((s) => p.styles.includes(s.style)).slice(0, max);
export const categoryIds = (p: Place) =>
  categories.filter((c) => c.styles.some((s) => p.styles.includes(s))).map((c) => c.id);
export function branchEntities(p: Place) {
  return p.locations
    .filter((l) => l.operating_status === 'listed')
    .map((l) => ({
      '@type': 'Restaurant',
      '@id': absolute(`places/${p.id}/#${l.id}`),
      name: l.name,
      url: absolute(`places/${p.id}/#${l.id}`),
      hasMap: l.maps_url,
      address: {
        '@type': 'PostalAddress',
        streetAddress: l.address.street_address,
        addressLocality: l.address.locality,
        addressRegion: l.address.region,
        addressCountry: l.address.country,
        ...(l.address.postal_code ? { postalCode: l.address.postal_code } : {}),
      },
      // An ordering window or a conflicted schedule is not a restaurant opening-hours claim.
      ...(l.hours.status === 'published' && l.hours.scope === 'restaurant'
        ? {
            openingHoursSpecification: Object.entries(l.hours.weekly).flatMap(([day, windows]) =>
              (windows ?? []).map((w) => ({
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: 'https://schema.org/' + day[0].toUpperCase() + day.slice(1),
                opens: w.opens,
                closes: w.closes,
              })),
            ),
          }
        : {}),
    }));
}
export function placeMarkdown(p: Place) {
  const lines = [
    `# ${p.name}`,
    '',
    `Canonical page: ${absolute(`places/${p.id}/`)}`,
    `Status: ${p.status}`,
    `Researched: ${p.checked_on}`,
    `Styles: ${p.styles.join(', ')}`,
    '',
    p.summary,
    '',
    '## Orders',
    '',
  ];
  for (const i of p.standout_items)
    lines.push(
      `- ${i.name} (${i.basis}; branches: ${i.location_ids.join(', ')}). ${i.notes.join(' ')} Sources: ${i.source_ids.map((id) => sourceMap.get(id)?.url).join(', ')}`,
    );
  lines.push(
    '',
    '## Vibe',
    '',
    `${p.vibe.summary ?? 'Unknown'} (${p.vibe.basis}; branches: ${p.vibe.location_ids.join(', ')}).`,
    '',
    '## Locations',
    '',
  );
  for (const l of p.locations) {
    lines.push(
      `### ${l.name}`,
      '',
      `ID: ${l.id}`,
      `${l.address.street_address}, San Francisco, CA${l.address.postal_code ? ' ' + l.address.postal_code : ''}`,
      `Status: ${l.operating_status}`,
      `Directions: ${l.maps_url}`,
      `${scopeLabels[l.hours.scope]}: ${l.hours.status}; America/Los_Angeles`,
      ...Object.entries(l.hours.weekly).map(([day, w]) => `- ${day}: ${formatWindows(w)}`),
      ...l.hours.notes.map((n) => `- Note: ${n}`),
      '',
    );
  }
  lines.push('## Review evidence', '');
  for (const r of p.reviews)
    lines.push(
      `- ${evidenceLabels[r.evidence]} (${r.location_ids.join(', ')}): ${r.summary} Sources: ${r.source_ids.map((id) => sourceMap.get(id)?.url).join(', ')}`,
    );
  lines.push(
    '',
    '## Visit notes and research gaps',
    '',
    ...[...p.visit_notes, ...p.research_gaps].map((n) => '- ' + n),
    '',
    '## Sources',
    '',
  );
  for (const id of p.source_ids) {
    const s = sourceMap.get(id)!;
    lines.push(
      `- ${s.title} — ${s.url} (kind: ${s.kind}; published: ${s.published_on ?? 'unknown'}; checked: ${s.checked_on})`,
    );
  }
  return lines.join('\n') + '\n';
}
