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
