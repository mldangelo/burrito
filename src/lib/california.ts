import { currentPlaces } from './catalog';
import { criticalReviews } from './map-filters.mjs';

export const californiaPlaces = currentPlaces.filter((place) =>
  place.styles.includes('california-style'),
);
export const californiaStops = californiaPlaces
  .flatMap((place) =>
    place.locations
      .filter((location) => location.operating_status === 'listed')
      .map((location) => ({
        place,
        location,
        reviews: criticalReviews(place, location.id),
        // A business-level style tag does not establish an order at every branch.
        order: place.standout_items.find(
          (item) =>
            item.location_ids.includes(location.id) &&
            /\b(california|cali|norcal)\b/i.test(item.name),
        ),
      })),
  )
  .sort(
    (a, b) =>
      a.location.neighborhood.localeCompare(b.location.neighborhood, 'en') ||
      a.place.name.localeCompare(b.place.name, 'en'),
  );

export const californiaStarts = [
  {
    locationId: 'leos-1234-great-hwy',
    label: 'AL PASTOR / OCEAN BEACH',
    note: 'Julia Chen picks the al pastor California burrito; Axios favors the steak version. Two reviews, two orders to consider.',
    sourceIds: ['src-e0042adc092e', 'src-89fba1912dec'],
  },
  {
    locationId: 'garaje-475-3rd-st',
    label: 'PRESSED / SOMA',
    note: 'The Cali Steak Zapato is the specific pick in Max Child’s review. A pressed variation on steak and fries.',
    sourceIds: ['src-5ee76e6c3ce8'],
  },
  {
    locationId: 'senor-sisig-1-ferry-building-suite-41',
    label: 'SISIG / FERRY BUILDING',
    note: 'Mario Cortez singles out this branch’s California Sisig, praising the balance of fries, meat and toppings.',
    sourceIds: ['src-1af29794faa0'],
  },
].map((pick) => ({
  ...pick,
  stop: californiaStops.find((stop) => stop.location.id === pick.locationId)!,
}));
