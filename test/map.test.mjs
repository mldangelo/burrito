import { criticalReviews, filterMapStops } from '../src/lib/map-filters.mjs';
import { boxesOverlap, groupLabel, placeLabels } from '../src/lib/map-labels.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'cheerio';
import { mapLocations, mapGroups, markerRadius, renderMap } from '../src/lib/map.mjs';
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const catalog = json('data/places.json'),
  geocodes = json('data/geocodes.json'),
  geography = json('data/map/neighborhoods.geojson');
const locations = mapLocations(catalog, geocodes),
  groups = mapGroups(locations);
test('SVG groups preserve every mapped listed branch exactly once with non-overlapping markers', () => {
  const expected = catalog.places
    .filter((p) => p.status !== 'watchlist')
    .flatMap((p) => p.locations)
    .filter((l) => l.operating_status === 'listed' && geocodes.locations[l.id])
    .map((l) => l.id)
    .sort();
  assert.deepEqual(groups.flatMap((g) => g.locations.map((l) => l.id)).sort(), expected);
  for (const g of groups) {
    assert.ok(g.x > 30 && g.x < 1070 && g.y > 195 && g.y < 945);
    assert.ok(Math.abs(g.x - g.locations.reduce((s, l) => s + l.x, 0) / g.locations.length) < 1e-8);
  }
  for (let i = 0; i < groups.length; i++)
    for (let j = i + 1; j < groups.length; j++)
      assert.ok(
        Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) >=
          markerRadius(groups[i]) + markerRadius(groups[j]) + 5,
      );
  const west = locations.find((l) => l.placeId === 'leos'),
    mission = locations.find((l) => l.placeId === 'la-taqueria'),
    south = locations.find(
      (l) => l.id === catalog.places.find((p) => p.id === 'la-corneta').primary_location_id,
    );
  assert.ok(west.x < mission.x);
  assert.ok(south.y > mission.y);
});
test('standalone SVG is deterministic, self-contained, and links every group to its branch or index', () => {
  const original = JSON.stringify(geography);
  const svg = renderMap(catalog, geocodes, geography);
  assert.equal(JSON.stringify(geography), original);
  assert.equal(svg, renderMap(catalog, geocodes, geography));
  assert.equal(readFileSync('public/maps/sf-burrito-map.svg', 'utf8'), svg);
  const $ = load(svg, { xmlMode: true });
  assert.equal($('a.stop').length, groups.length);
  assert.equal($('script,image,foreignObject').length, 0);
  assert.ok(!/NaN|Infinity/.test(svg));
  const index = load(readFileSync('dist/map/index.html', 'utf8'));
  for (const g of groups) {
    const ids = g.locations.map((l) => l.id).join(' ');
    const a = $('a.stop')
      .toArray()
      .find((e) => $(e).attr('data-location-ids') === ids);
    assert.ok(a);
    assert.ok($(a).attr('aria-label'));
    const href = $(a).attr('href');
    if (g.locations.length > 1) assert.equal(index('#' + g.id).length, 1);
    else assert.ok(href.endsWith(`#${g.locations[0].id}`));
  }
  assert.ok($('#map-description').text().includes('not rankings'));
  assert.equal(index('.map-stop-group li').length, locations.length);
});

test('restaurant names in the SVG have separate label boxes and complete link targets', () => {
  const $ = load(readFileSync('public/maps/sf-burrito-map.svg', 'utf8'), { xmlMode: true });
  const labels = $('.restaurant-label').toArray();
  assert.ok(labels.length > 0);
  const rectangles = labels.map((a) => {
    assert.ok($(a).attr('href'));
    assert.ok($(a).find('text').text().length > 0);
    const r = $(a).find('rect');
    return { x: +r.attr('x'), y: +r.attr('y'), w: +r.attr('width'), h: +r.attr('height') };
  });
  for (let i = 0; i < rectangles.length; i++)
    for (let j = i + 1; j < rectangles.length; j++)
      assert.equal(boxesOverlap(rectangles[i], rectangles[j], 0), false);
});
test('screen-space label placement never overlaps labels or obstacles across viewport sizes', () => {
  for (const width of [284, 354, 720, 858, 1160])
    for (const zoom of [0.35, 0.8, 1.6, 3.2]) {
      const screen = locations.map((l) => ({
        ...l,
        x: (l.x - 600) * zoom + width / 2,
        y: (l.y - 630) * zoom + 260,
      }));
      const groups = mapGroups(screen, { single: 22, group: 22, gap: 6 }).filter(
        (g) => g.x > 25 && g.y > 25 && g.x < width - 25 && g.y < 495,
      );
      const obstacles = groups.map((g) => ({ x: g.x - 22, y: g.y - 22, w: 44, h: 44 }));
      const items = groups.map((g) => ({
        ...g,
        r: 22,
        text: groupLabel(g),
        priority: Math.max(...g.locations.map((l) => l.priority)),
      }));
      const { placed, hidden } = placeLabels(items, {
        bounds: { x: 6, y: 6, w: width - 12, h: 508 },
        obstacles,
        height: 44,
      });
      assert.equal(placed.length + hidden.length, items.length);
      for (const box of placed) {
        assert.ok(box.x >= 6 && box.y >= 6 && box.x + box.w <= width - 6 && box.y + box.h <= 514);
        for (const obstacle of obstacles) assert.equal(boxesOverlap(box, obstacle, 0), false);
      }
      for (let i = 0; i < placed.length; i++)
        for (let j = i + 1; j < placed.length; j++)
          assert.equal(boxesOverlap(placed[i], placed[j], 0), false);
    }
});

test('critical coverage stays with reviewed branches and preserves evidence categories', () => {
  const place = (id) => catalog.places.find((p) => p.id === id);
  assert.ok(criticalReviews(place('el-farolito'), 'el-farolito-2779-mission-st').length);
  assert.equal(criticalReviews(place('el-farolito'), 'el-farolito-1230-grant-ave').length, 0);
  assert.equal(
    criticalReviews(place('suavecito'), place('suavecito').primary_location_id).length,
    0,
  );
  assert.equal(criticalReviews(place('el-faro'), place('el-faro').primary_location_id).length, 0);
  assert.equal(
    criticalReviews(place('tacko'), place('tacko').primary_location_id)[0].evidence,
    'restaurant_or_taco_editorial',
  );
  assert.equal(
    criticalReviews(place('el-toro'), place('el-toro').primary_location_id)[0].evidence,
    'historical_burrito_review',
  );
  const page = load(readFileSync('dist/map/index.html', 'utf8'));
  const stops = JSON.parse(page('#field-map-data').text());
  for (const stop of stops) {
    const p = place(stop.placeId);
    const expected = criticalReviews(p, stop.id);
    assert.deepEqual(
      stop.reviews.map((r) => r.kind),
      expected.map((r) => r.evidence),
    );
    assert.deepEqual(
      stop.reviews.flatMap((r) => r.sources.map((s) => s.url)),
      expected.flatMap((r) =>
        r.source_ids.map((id) => catalog.sources.find((source) => source.id === id).url),
      ),
    );
  }
});

test('map styles combine with search and exact neighborhood scope', () => {
  const page = load(readFileSync('dist/map/index.html', 'utf8'));
  const stops = JSON.parse(page('#field-map-data').text());
  const original = JSON.stringify(stops);
  const sisig = filterMapStops(stops, { style: 'california-style', query: 'senor valencia' });
  assert.deepEqual(
    sisig.map((s) => s.id),
    ['senor-sisig-990-valencia-st'],
  );
  assert.equal(
    filterMapStops(stops, { style: 'classic-mission', query: 'senor valencia' }).length,
    0,
  );
  const mission = filterMapStops(stops, { neighborhood: 'Mission' });
  assert.ok(mission.some((s) => s.id === 'la-taqueria-2889-mission-st'));
  assert.ok(!mission.some((s) => s.id === 'el-farolito-4817-mission-st'));
  assert.ok(
    filterMapStops(stops, { style: 'classic-mission' }).some(
      (s) => s.id === 'el-farolito-4817-mission-st',
    ),
  );
  assert.equal(JSON.stringify(stops), original);
});

test('Mission chapter exposes every listed local branch once in its directory', () => {
  const page = load(readFileSync('dist/neighborhoods/mission/index.html', 'utf8'));
  const expected = catalog.places
    .filter((p) => p.status !== 'watchlist')
    .flatMap((p) => p.locations)
    .filter((l) => l.neighborhood === 'Mission' && l.operating_status === 'listed')
    .map((l) => l.id)
    .sort();
  const actual = page('.mission-street li[data-location-id]')
    .toArray()
    .map((el) => page(el).attr('data-location-id'))
    .sort();
  assert.deepEqual(actual, expected);
  for (const el of page('.mission-street li').toArray()) {
    const id = page(el).attr('data-location-id');
    assert.ok(
      page(el)
        .find('a')
        .attr('href')
        .endsWith('#' + id),
    );
  }
  const extraBranch = page(
    '[data-location-id="el-farolito-2950-24th-st"] .mission-review-label',
  ).text();
  assert.ok(!extraBranch.includes('Burrito review'));
  assert.ok(page('a[href="/burrito/map/?neighborhood=Mission&reviews=1"]').length > 0);
  assert.equal(load(readFileSync('dist/map/index.html', 'utf8'))('a[download]').length, 0);
});

test('California chapter preserves all listed style branches and highlights only their own critical coverage', () => {
  const page = load(readFileSync('dist/guides/california-burritos/index.html', 'utf8'));
  const expected = catalog.places
    .filter((p) => p.status !== 'watchlist' && p.styles.includes('california-style'))
    .flatMap((place) =>
      place.locations
        .filter((location) => location.operating_status === 'listed')
        .map((location) => ({ place, location })),
    );
  const cards = page('.california-directory .california-stop');
  assert.deepEqual(
    cards
      .toArray()
      .map((el) => page(el).attr('data-location-id'))
      .sort(),
    expected.map((stop) => stop.location.id).sort(),
  );
  for (const { place, location } of expected) {
    const card = page(`.california-directory [data-location-id="${location.id}"]`);
    const reviews = criticalReviews(place, location.id);
    assert.equal(card.hasClass('is-reviewed'), reviews.length > 0);
    assert.deepEqual(
      card
        .find('.california-review')
        .toArray()
        .map((el) => page(el).attr('data-evidence')),
      reviews.map((r) => r.evidence),
    );
    assert.deepEqual(
      card
        .find('.california-review li a')
        .toArray()
        .map((el) => page(el).attr('href')),
      reviews.flatMap((r) =>
        r.source_ids.map((id) => catalog.sources.find((source) => source.id === id).url),
      ),
    );
    assert.ok(
      card
        .find('h4 a')
        .attr('href')
        .endsWith('#' + location.id),
    );
  }
  for (const id of [
    'el-burrito-express-1812-divisadero-st',
    'rancho-grande-855-divisadero-st',
    'suavecito-882-sutter-st',
  ])
    assert.equal(page(`.california-stop[data-location-id="${id}"]`).hasClass('is-reviewed'), false);
  assert.ok(page('.california-review[data-evidence="historical_burrito_review"]').length);
  assert.equal(page('[data-location-id="los-coyotes-3032-16th-st"]').length, 0);
  const list = page('script[type="application/ld+json"]')
    .toArray()
    .map((el) => JSON.parse(page(el).text()))
    .find((data) => data['@type'] === 'ItemList');
  assert.deepEqual(
    list.itemListElement.map((item) => item.url.split('#')[1]).sort(),
    expected.map((stop) => stop.location.id).sort(),
  );
});

test('California starting picks retain their review sources, dates, and unmapped branch directions', () => {
  const page = load(readFileSync('dist/guides/california-burritos/index.html', 'utf8'));
  const featured = page('.california-featured');
  assert.equal(featured.length, 3);
  for (const el of featured.toArray()) {
    const id = page(el).attr('data-location-id');
    const place = catalog.places.find((p) => p.locations.some((l) => l.id === id));
    const urls = criticalReviews(place, id).flatMap((r) =>
      r.source_ids.map((sourceId) => catalog.sources.find((s) => s.id === sourceId).url),
    );
    for (const link of page(el).find('.california-pick-sources a').toArray())
      assert.ok(urls.includes(page(link).attr('href')));
  }
  assert.equal(
    page('.california-featured[data-location-id="senor-sisig-1-ferry-building-suite-41"]').length,
    1,
  );
  assert.equal(
    page(
      '.california-featured[data-location-id="senor-sisig-1-ferry-building-suite-41"] .california-unmapped',
    ).length,
    1,
  );
  assert.equal(page('.california-featured[data-location-id="garaje-475-3rd-st"] time').length, 0);
  assert.ok(
    page('.california-featured[data-location-id="garaje-475-3rd-st"]')
      .text()
      .includes('Publication date not listed'),
  );
  assert.equal(
    page(
      '.california-featured[data-location-id="senor-sisig-1-ferry-building-suite-41"] time',
    ).attr('datetime'),
    '2023-03-13',
  );
  assert.ok(page('a[href="/burrito/map/?style=california-style&reviews=1"]').length >= 2);
});
