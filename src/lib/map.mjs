import { placeLabels, groupLabel } from './map-labels.mjs';
// A local equirectangular projection keeps this city-scale drawing north-up.
// Restaurant positions come only from the separately sourced Census matches.
export const MAP_WIDTH = 1100;
export const MAP_HEIGHT = 1090;
const SCALE = 6500;
const COS_LATITUDE = Math.cos((37.76 * Math.PI) / 180);
export const project = ([longitude, latitude]) => [
  145 + (longitude + 122.52) * COS_LATITUDE * SCALE,
  230 + (37.815 - latitude) * SCALE,
];
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
  );
const number = (n) => Number(n.toFixed(1));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const polygons = (geometry) =>
  geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
const rings = (geometry) => polygons(geometry).flat();
const geometryPath = (geometry) =>
  rings(geometry)
    .map(
      (ring) =>
        ring
          .map((position, i) => `${i ? 'L' : 'M'}${project(position).map(number).join(',')}`)
          .join('') + 'Z',
    )
    .join('');
const centroid = (geometry) => {
  const ring = [...polygons(geometry)].sort((a, b) => b[0].length - a[0].length)[0][0].map(project);
  let area = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, ay] = ring[i],
      [bx, by] = ring[i + 1],
      cross = ax * by - bx * ay;
    area += cross;
    x += (ax + bx) * cross;
    y += (ay + by) * cross;
  }
  return [x / (3 * area), y / (3 * area)];
};
export function mapLocations(catalog, geocodes) {
  return catalog.places
    .filter((p) => p.status !== 'watchlist')
    .flatMap((place) =>
      place.locations
        .filter(
          (location) => location.operating_status === 'listed' && geocodes.locations[location.id],
        )
        .map((location) => {
          const geo = geocodes.locations[location.id];
          const [x, y] = project([geo.longitude, geo.latitude]);
          return {
            id: location.id,
            placeId: place.id,
            name: place.name.split(' — ')[0],
            address: location.address.street_address,
            neighborhood: location.neighborhood,
            priority:
              (place.shortlist ? 10 : 0) + (location.id === place.primary_location_id ? 1 : 0),
            x,
            y,
          };
        }),
    )
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));
}
export const markerRadius = (group, options = {}) =>
  group.locations.length === 1 ? (options.single ?? 8.5) : (options.group ?? 15);
export function mapGroups(locations, options = {}) {
  const center = (members) => ({
    locations: members,
    id: 'stops-' + members.map((l) => l.id).sort()[0],
    x: members.reduce((sum, l) => sum + l.x, 0) / members.length,
    y: members.reduce((sum, l) => sum + l.y, 0) / members.length,
  });
  const groups = locations.map((l) => center([l]));
  // Merge the closest overlapping pair until every marker has clear space.
  // Coordinates stay at the actual mean; no restaurant point is nudged or invented.
  while (true) {
    let closest = null;
    for (let a = 0; a < groups.length; a++)
      for (let b = a + 1; b < groups.length; b++) {
        const d = distance(groups[a], groups[b]);
        if (
          d <
            markerRadius(groups[a], options) +
              markerRadius(groups[b], options) +
              (options.gap ?? 5) &&
          (!closest || d < closest.distance)
        )
          closest = { a, b, distance: d };
      }
    if (!closest) break;
    groups[closest.a] = center(
      [...groups[closest.a].locations, ...groups[closest.b].locations].sort((a, b) =>
        a.id.localeCompare(b.id, 'en'),
      ),
    );
    groups.splice(closest.b, 1);
  }
  return groups.sort((a, b) => a.y - b.y || a.x - b.x);
}
const neighborhoods = [
  ['Presidio National Park', ['THE PRESIDIO']],
  ['Outer Richmond', ['OUTER RICHMOND']],
  ['Inner Richmond', ['INNER RICHMOND']],
  ['Golden Gate Park', ['GOLDEN GATE PARK']],
  ['Outer Sunset', ['OUTER', 'SUNSET']],
  ['Inner Sunset', ['INNER', 'SUNSET']],
  ['Parkside', ['PARKSIDE']],
  ['Pacific Heights', ['PACIFIC HEIGHTS']],
  ['Marina', ['MARINA']],
  ['North Beach', ['NORTH BEACH']],
  ['South of Market', ['SOMA']],
  ['Haight Ashbury', ['THE HAIGHT']],
  ['Castro', ['CASTRO']],
  ['Mission', ['THE', 'MISSION']],
  ['Potrero Hill', ['POTRERO', 'HILL']],
  ['Noe Valley', ['NOE VALLEY']],
  ['Glen Park', ['GLEN PARK']],
  ['Excelsior', ['EXCELSIOR']],
  ['Bayview', ['BAYVIEW']],
  ['McLaren Park', ['McLAREN', 'PARK']],
];
const parks = new Set([
  'Presidio National Park',
  'Golden Gate Park',
  'Lincoln Park / Ft. Miley',
  'McLaren Park',
  'Candlestick Point SRA',
]);
const excluded = new Set(['Treasure Island', 'Yerba Buena Island']);
function labelPosition(feature, lines, groups, occupied) {
  const [cx, cy] = centroid(feature.geometry);
  const width = Math.max(...lines.map((s) => s.length)) * 7.4,
    height = lines.length * 17;
  const offsets = [
    [0, 0],
    [0, -22],
    [0, 22],
    [30, 0],
    [-30, 0],
    [0, -42],
    [0, 42],
    [40, 24],
    [-40, 24],
    [40, -24],
    [-40, -24],
  ];
  let best;
  for (const [dx, dy] of offsets) {
    const x = cx + dx,
      y = cy + dy;
    const overlap = groups.filter(
      (g) => Math.abs(g.x - x) < width / 2 + 15 && g.y > y - 15 && g.y < y + height + 10,
    ).length;
    const other = occupied.filter(
      (b) =>
        Math.abs(b.x - x) < (width + b.width) / 2 + 5 &&
        Math.abs(b.y - y) < (height + b.height) / 2 + 10,
    ).length;
    const score = overlap * 1000 + other * 1000 + Math.hypot(dx, dy);
    if (!best || score < best.score) best = { x, y, width, height, score };
  }
  occupied.push(best);
  return best;
}
export function renderMap(
  catalog,
  geocodes,
  geography,
  baseURL = 'https://mldangelo.github.io/burrito/',
) {
  const base = baseURL.replace(/\/?$/, '/');
  const locations = mapLocations(catalog, geocodes),
    groups = mapGroups(locations);
  const listed = catalog.places
    .filter((p) => p.status !== 'watchlist')
    .flatMap((p) => p.locations)
    .filter((l) => l.operating_status === 'listed');
  const features = geography.features.filter((f) => !excluded.has(f.properties.name));
  const land = features
    .map(
      (f) =>
        `<path d="${geometryPath(f.geometry)}" class="${parks.has(f.properties.name) ? 'park' : 'land'}"/>`,
    )
    .join('\n');
  const occupied = [];
  const labels = neighborhoods
    .map(([name, lines]) => {
      const f = features.find((f) => f.properties.name === name);
      if (!f) return '';
      const { x, y } = labelPosition(f, lines, groups, occupied);
      return `<text class="district ${parks.has(name) ? 'park-label' : ''}" x="${number(x)}" y="${number(y)}">${lines.map((line, i) => `<tspan x="${number(x)}" dy="${i ? 17 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
    })
    .join('\n');
  const markers = groups
    .map((g) => {
      const one = g.locations.length === 1,
        loc = g.locations[0];
      const url = one ? `${base}places/${loc.placeId}/#${loc.id}` : `${base}map/#${g.id}`;
      const title = one
        ? `${loc.name} · ${loc.address}`
        : `${g.locations.length} nearby locations: ${g.locations.map((l) => `${l.name}, ${l.address}`).join('; ')}`;
      return `<a href="${escape(url)}" target="_top" class="stop" aria-label="${escape(title)}" data-location-ids="${g.locations.map((l) => l.id).join(' ')}"><title>${escape(title)}</title><circle class="halo" cx="${number(g.x)}" cy="${number(g.y)}" r="${one ? 8.5 : 15}"/><circle class="pin" cx="${number(g.x)}" cy="${number(g.y)}" r="${one ? 5.5 : 12}"/>${one ? '' : `<text class="count" x="${number(g.x)}" y="${number(g.y + 4.3)}">${g.locations.length}</text>`}</a>`;
    })
    .join('\n');
  const labelItems = groups.map((g) => ({
    ...g,
    text: groupLabel(g),
    r: markerRadius(g),
    priority: Math.max(...g.locations.map((l) => l.priority)),
  }));
  const labelObstacles = [
    ...groups.map((g) => ({
      x: g.x - markerRadius(g),
      y: g.y - markerRadius(g),
      w: markerRadius(g) * 2,
      h: markerRadius(g) * 2,
    })),
    ...occupied.map((b) => ({ x: b.x - b.width / 2, y: b.y - 13, w: b.width, h: b.height + 3 })),
    { x: 78, y: 470, w: 38, h: 155 },
    { x: 940, y: 425, w: 120, h: 205 },
    { x: 985, y: 215, w: 50, h: 70 },
    { x: 810, y: 880, w: 115, h: 45 },
  ];
  const restaurantLabels = placeLabels(labelItems, {
    bounds: { x: 40, y: 205, w: 1020, h: 730 },
    obstacles: labelObstacles,
    height: 25,
    padding: 7,
  });
  const names = restaurantLabels.placed
    .map((l) => {
      const loc = l.locations[0];
      const url =
        l.locations.length === 1
          ? `${base}places/${loc.placeId}/#${loc.id}`
          : `${base}map/#${l.id}`;
      return `<a class="restaurant-label" href="${escape(url)}" target="_top" aria-label="${escape(l.locations.map((p) => p.name + ' · ' + p.address).join('; '))}"><path d="M${number(l.anchor.x)} ${number(l.anchor.y)}L${number(l.edge.x)} ${number(l.edge.y)}" fill="none" stroke="#9c9f8e" stroke-width=".8"/><rect x="${number(l.x)}" y="${number(l.y)}" width="${l.w}" height="${l.h}" rx="3"/><text x="${number(l.x + 7)}" y="${number(l.y + 16.5)}">${escape(l.text)}</text></a>`;
    })
    .join('\n');
  const waves = [];
  for (const [x, y] of [
    [60, 375],
    [35, 430],
    [65, 690],
    [55, 765],
    [940, 335],
    [980, 565],
    [940, 630],
    [1010, 700],
  ])
    waves.push(`<path d="M${x} ${y}q12 -6 24 0t24 0t24 0"/>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" role="group" aria-labelledby="map-title map-description">
<title id="map-title">San Francisco, wrapped up — the burrito field map</title>
<desc id="map-description">${locations.length} approximate address locations across San Francisco. Numbered circles group nearby locations; they are counts, not rankings. Restaurant names appear where there is room; zoom the web map to reveal more. Select a circle or name to read its entries. ${listed.length - locations.length} listed locations lack a coordinate match and remain in the guide. Neighborhood geometry: DataSF SF Find Neighborhoods. Coordinates: U.S. Census Bureau, checked ${geocodes.checked_on}.</desc>
<metadata>Source geography: https://data.sf.gov/d/gfpk-269f (public domain); neighborhood outlines are general reference areas, not hard boundaries. Local equirectangular projection centered on latitude 37.76. Points are Census address-range interpolation; grouped points use the mean of their members. Main peninsula only; no listed catalog location is omitted by the extent.</metadata>
<style>
svg{background:#f9f3e7;color:#233c31;fill:#233c31}text{font-family:Arial,Helvetica,sans-serif}.serif{font-family:Georgia,'Times New Roman',serif}.kicker{font-size:11px;letter-spacing:2.6px;font-weight:600}.land{fill:#f8f1df;stroke:#d7d2bd;stroke-width:.65;stroke-linejoin:round}.park{fill:#d3dfbc;stroke:#a9b89a;stroke-width:.8;stroke-linejoin:round}.district{font-size:11px;letter-spacing:1.6px;text-anchor:middle;font-weight:600;fill:#68715c;paint-order:stroke;stroke:#f8f1df;stroke-width:3;stroke-linejoin:round;pointer-events:none}.park-label{fill:#58704c;stroke:#d3dfbc}.water-label{font-size:17px;letter-spacing:1px;fill:#6f8d8c;font-style:italic}.stop{cursor:pointer}.halo{fill:#f9f3e7;stroke:#f9f3e7;stroke-width:1.5}.pin{fill:#ac372a;stroke:#8e2d24;stroke-width:.7;transition:fill .12s}.count{font-size:12px;font-weight:bold;text-anchor:middle;fill:#fff8e7;pointer-events:none}.stop:hover .pin,.stop:focus .pin{fill:#233c31;stroke:#233c31}.stop:focus{outline:none}.stop:focus .halo{stroke:#233c31;stroke-width:3}.caption{font-size:12px;fill:#676657}.rule{stroke:#d8d4c4;stroke-width:1}.decor{pointer-events:none}.legend{font-size:12px}.map-border{fill:none;stroke:#a8bfba;stroke-width:.8}.restaurant-label rect{fill:#fffaf0;stroke:#c8c6b3;stroke-width:.7}.restaurant-label text{font-size:12px;font-weight:600;fill:#233c31}.restaurant-label:hover rect,.restaurant-label:focus rect{stroke:#ac372a;stroke-width:2}
@media(prefers-reduced-motion:reduce){.pin{transition:none}}
</style>
<defs><clipPath id="map-crop"><rect x="30" y="195" width="1040" height="750" rx="6"/></clipPath><pattern id="water-lines" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 16L16 0" stroke="#b5ceca" stroke-opacity=".17" stroke-width=".7"/></pattern></defs>
<rect width="1100" height="1090" fill="#f9f3e7"/>
<text class="kicker" x="45" y="44">BURRITO / SAN FRANCISCO FIELD GUIDE</text><text class="serif" x="42" y="111" font-size="55" letter-spacing="-2">San Francisco, <tspan fill="#ac372a" font-style="italic">wrapped up.</tspan></text>
<text x="46" y="148" font-size="14" fill="#676657">From the Mission to the ocean. Follow your appetite across the city.</text>
<g transform="translate(996 83) rotate(10)" class="decor"><circle r="42" fill="none" stroke="#ac372a"/><text text-anchor="middle" y="-18" font-size="8" letter-spacing="1.2" fill="#ac372a">ONE CITY</text><text text-anchor="middle" y="2" font-size="13" font-weight="bold" fill="#ac372a">MANY</text><text text-anchor="middle" y="16" font-size="13" font-weight="bold" fill="#ac372a">WRAPS</text><text text-anchor="middle" y="30" font-size="7" letter-spacing="1.2" fill="#ac372a">SF / CA</text></g>
<g clip-path="url(#map-crop)"><rect x="30" y="195" width="1040" height="750" fill="#deebe6"/><rect x="30" y="195" width="1040" height="750" fill="url(#water-lines)"/>
<g class="decor" fill="none" stroke="#aac3bf" stroke-width="1.3">${waves.join('')}</g>
${land}
<text class="water-label serif decor" transform="translate(104 602) rotate(-90)">Pacific Ocean</text><text class="water-label serif decor" transform="translate(978 465) rotate(60)">San Francisco Bay</text>
${labels}
${markers}
${names}
<g transform="translate(1008 250)" class="decor"><text x="0" y="-22" text-anchor="middle" font-size="11" letter-spacing="1">N</text><path d="M0 -12L-6 11L0 7L6 11Z" fill="#233c31"/><path d="M0 7V28" stroke="#233c31" stroke-width="1"/></g>
<g transform="translate(815 889)" class="decor"><path d="M0 0V7H94.15V0M47.075 7V2" fill="none" stroke="#6f8275" stroke-width="1.3"/><text x="0" y="24" font-size="10" fill="#6f8275">0</text><text x="94.15" y="24" font-size="10" text-anchor="end" fill="#6f8275">≈ 1 mile</text></g>
</g>
<rect class="map-border" x="30" y="195" width="1040" height="750" rx="6"/>
<g transform="translate(46 981)"><circle cx="5" cy="-4" r="5.5" fill="#ac372a"/><text class="legend" x="21">One location</text><circle cx="176" cy="-4" r="12" fill="#ac372a"/><text class="count" x="176" y=".3">3</text><text class="legend" x="197">Nearby locations · select to explore</text><text class="serif" x="1008" y="1" text-anchor="end" font-size="20">${locations.length} mapped <tspan font-style="italic" fill="#ac372a">/</tspan> ${listed.length} listed</text></g>
<path class="rule" d="M45 1004H1055"/>
<text class="caption" x="46" y="1028">Approximate addresses. Zoom the web map for more names. Counts are locations, not ratings. ${listed.length - locations.length} unmapped stops remain in the guide.</text>
<text class="caption" x="46" y="1050">Geography: DataSF · Address coordinates: U.S. Census Bureau · Research snapshot: ${catalog.updated_on}</text>
<a href="${escape(base + 'map/')}" target="_top"><text class="caption" x="1055" y="1073" text-anchor="end">mldangelo.github.io/burrito ↗</text></a>
</svg>\n`;
}
