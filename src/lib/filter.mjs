export const normalize = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function filterPlaces(places, { query = '', style = 'all', neighborhood = '' }) {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return places.filter(
    (p) =>
      (style === 'all' || p.styles.includes(style)) &&
      (!neighborhood || p.neighborhoods.includes(neighborhood)) &&
      tokens.every((t) => normalize(p.search).includes(t)),
  );
}
