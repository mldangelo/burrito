import { normalize } from './filter.mjs';

export const mapStyles = [
  { id: 'all', label: 'All styles' },
  { id: 'california-style', label: 'California-style' },
  { id: 'classic-mission', label: 'Mission-style' },
];
export const reviewKinds = {
  burrito_specific_editorial: 'Burrito review',
  restaurant_or_taco_editorial: 'Restaurant / taco coverage',
  historical_burrito_review: 'Archive burrito review',
};
// Keep coverage attached to the address actually reviewed. A menu or opening
// announcement is not critical coverage, and archive evidence keeps its label.
export function criticalReviews(place, locationId) {
  return place.reviews.filter(
    (review) =>
      Object.hasOwn(reviewKinds, review.evidence) && review.location_ids.includes(locationId),
  );
}
export function filterMapStops(stops, { query = '', style = 'all', neighborhood = '' } = {}) {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return stops.filter(
    (stop) =>
      (style === 'all' || stop.styles.includes(style)) &&
      (!neighborhood || stop.neighborhood === neighborhood) &&
      tokens.every((token) =>
        normalize(`${stop.name} ${stop.address} ${stop.neighborhood}`).includes(token),
      ),
  );
}
