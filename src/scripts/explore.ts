import { filterPlaces } from '../lib/filter.mjs';
import 'leaflet/dist/leaflet.css';
const data = JSON.parse(document.querySelector('#explorer-data')!.textContent!);
const search = document.querySelector<HTMLInputElement>('#search')!;
const neighborhood = document.querySelector<HTMLSelectElement>('#neighborhood')!;
const count = document.querySelector('#result-count')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const surprise = document.querySelector<HTMLButtonElement>('#surprise')!;
const styles = [...document.querySelectorAll<HTMLButtonElement>('[data-style]')];
const views = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
const cards = [...document.querySelectorAll<HTMLElement>('[data-place-id]')];
let style = 'all',
  view = 'list',
  filtered = data,
  map: any,
  layer: any,
  L: any,
  mapPromise: Promise<void> | undefined;
const readURL = () => {
  const p = new URLSearchParams(location.search);
  search.value = p.get('q') ?? '';
  neighborhood.value = p.get('neighborhood') ?? '';
  style = styles.some((b) => b.dataset.style === p.get('style')) ? p.get('style')! : 'all';
  view = p.get('view') === 'map' ? 'map' : 'list';
};
function random() {
  if (!filtered.length) return;
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  const branch = neighborhood.value
    ? pick.locations.find((l) => l.neighborhood === neighborhood.value)
    : null;
  location.assign(branch?.url ?? pick.url);
}
function update(write = true) {
  filtered = filterPlaces(data, { query: search.value, style, neighborhood: neighborhood.value });
  const ids = new Set(filtered.map((p) => p.id));
  cards.forEach((c) => {
    c.hidden = !ids.has(c.dataset.placeId);
    if (c.hidden) return;
    const p = filtered.find((p) => p.id === c.dataset.placeId);
    const branch = neighborhood.value
      ? p.locations.find((l) => l.neighborhood === neighborhood.value)
      : p.locations.find((l) => l.id === p.primaryLocationId);
    const isPrimary = branch.id === p.primaryLocationId;
    c.querySelector('.card-meta span')!.textContent = branch.neighborhood;
    c.querySelector('.card-order')!.textContent = branch.order;
    c.querySelector('.card-summary')!.textContent = isPrimary
      ? p.summary
      : 'This branch is listed for discovery. Check the entry for the exact location covered by a review.';
    c.querySelector('.evidence')!.textContent = isPrimary ? p.evidence : 'Additional branch';
    c.querySelector<HTMLAnchorElement>('.text-link')!.href = branch.url;
  });
  styles.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === style)));
  views.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  document.querySelector<HTMLElement>('#list-view')!.hidden = view !== 'list';
  document.querySelector<HTMLElement>('#map-view')!.hidden = view !== 'map' || !filtered.length;
  document.querySelector<HTMLElement>('#empty')!.hidden = filtered.length !== 0;
  count.textContent = `${filtered.length} ${filtered.length === 1 ? 'place' : 'places'} to unwrap`;
  surprise.disabled = filtered.length === 0;
  reset.hidden = !search.value && !neighborhood.value && style === 'all';
  if (write) {
    const p = new URLSearchParams();
    if (search.value.trim()) p.set('q', search.value.trim());
    if (neighborhood.value) p.set('neighborhood', neighborhood.value);
    if (style !== 'all') p.set('style', style);
    if (view === 'map') p.set('view', 'map');
    history.replaceState(null, '', location.pathname + (p.size ? '?' + p : ''));
  }
  if (view === 'map' && filtered.length) void drawMap();
}
async function drawMap() {
  try {
    if (!mapPromise)
      mapPromise = (async () => {
        L = await import('leaflet');
        map = L.map('map', { scrollWheelZoom: false }).setView([37.765, -122.435], 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).addTo(map);
        layer = L.layerGroup().addTo(map);
      })();
    await mapPromise;
    map.invalidateSize();
    layer.clearLayers();
    const points: number[][] = [];
    const missing: any[] = [];
    for (const p of filtered)
      for (const loc of p.locations) {
        if (neighborhood.value && loc.neighborhood !== neighborhood.value) continue;
        if (!loc.coordinates) {
          missing.push(loc);
          continue;
        }
        points.push(loc.coordinates);
        const popup = document.createElement('div');
        popup.className = 'map-popup';
        const title = document.createElement('strong');
        title.textContent = loc.name;
        const address = document.createElement('p');
        address.textContent = loc.address + ' · ' + loc.neighborhood;
        const a = document.createElement('a');
        a.href = loc.url;
        a.textContent = 'Read the field notes →';
        popup.append(title, address, a);
        L.circleMarker(loc.coordinates, {
          radius: 8,
          color: '#f9f3e7',
          weight: 2,
          fillColor: '#ac372a',
          fillOpacity: 1,
        })
          .bindPopup(popup)
          .addTo(layer);
      }
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 15 });
    document.querySelector('#map-count')!.textContent =
      `${points.length} mapped ${points.length === 1 ? 'location' : 'locations'} · ${missing.length} without a pin for these filters.`;
    const unmapped = document.querySelector('#unmapped')!;
    unmapped.replaceChildren();
    if (missing.length) {
      const title = document.createElement('h3');
      title.textContent = 'Also in the guide, without a pin';
      const links = document.createElement('div');
      links.className = 'branch-links';
      for (const loc of missing) {
        const a = document.createElement('a');
        a.href = loc.url;
        a.textContent = loc.name + ' · ' + loc.address;
        links.append(a);
      }
      unmapped.append(title, links);
    }
  } catch {
    mapPromise = undefined;
    document.querySelector('#map-count')!.textContent =
      'The map could not load. Use the list for every place and its directions link.';
  }
}
function clear() {
  search.value = '';
  neighborhood.value = '';
  style = 'all';
  update();
}
document.querySelector('#filters')!.addEventListener('submit', (e) => {
  e.preventDefault();
  update();
});
search.addEventListener('input', () => update());
neighborhood.addEventListener('change', () => update());
styles.forEach((b) =>
  b.addEventListener('click', () => {
    style = b.dataset.style!;
    update();
  }),
);
views.forEach((b) =>
  b.addEventListener('click', () => {
    view = b.dataset.view!;
    update();
  }),
);
reset.addEventListener('click', clear);
document.querySelector('#empty-reset')!.addEventListener('click', clear);
surprise.addEventListener('click', random);
surprise.hidden = false;
document.querySelector<HTMLElement>('.view-toggle')!.hidden = false;
readURL();
const surpriseRequested = new URLSearchParams(location.search).get('surprise') === '1';
update(false);
document.querySelector<HTMLFieldSetElement>('#filter-controls')!.disabled = false;
if (surpriseRequested) random();
window.addEventListener('popstate', () => {
  readURL();
  update(false);
});
