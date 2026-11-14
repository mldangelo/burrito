import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { load } from 'cheerio';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { filterPlaces } from '../src/lib/filter.mjs';
const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));
const catalog = json('data/places.json');
const geocodes = json('data/geocodes.json');
const origin = 'https://mldangelo.github.io';
const base = origin + '/burrito/';
const html = (p) => load(read('dist/' + p));
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = dir + '/' + name;
    return statSync(p).isDirectory() ? files(p) : [p];
  });
const pages = files('dist').filter((p) => p.endsWith('.html'));
const ajv = addFormats(new Ajv({ allErrors: true, strict: true }));
ajv.addSchema(json('schema/catalog.schema.json'));
const checkExport = ajv.compile(json('schema/place-export.schema.json'));
const checkGeo = ajv.compile(json('schema/geocodes.schema.json'));

test('static directory exposes every current place without JavaScript, excludes watchlist', () => {
  const $ = html('explore/index.html');
  const ids = $('[data-place-id]')
    .map((_, e) => $(e).attr('data-place-id'))
    .get();
  assert.deepEqual(
    ids,
    catalog.places.filter((p) => p.status !== 'watchlist').map((p) => p.id),
  );
  assert.equal($('[data-place-id][hidden]').length, 0);
});
test('each place preserves all branch addresses, sources and machine-readable links', () => {
  for (const p of catalog.places) {
    const $ = html(`places/${p.id}/index.html`);
    assert.equal($('h1').length, 1);
    assert.equal($('link[rel=canonical]').attr('href'), base + `places/${p.id}/`);
    for (const l of p.locations) {
      assert.equal($('#' + l.id).length, 1);
      assert.ok(
        $('#' + l.id)
          .text()
          .includes(l.address.street_address),
      );
      assert.equal($('#' + l.id + ' .hours tbody tr').length, 7);
    }
    for (const id of p.source_ids) {
      const s = catalog.sources.find((s) => s.id === id);
      assert.ok(
        $('a')
          .toArray()
          .some((e) => $(e).attr('href') === s.url),
        `${p.id} missing source ${id}`,
      );
    }
    for (const ext of ['json', 'md'])
      assert.ok($(`a[href="/burrito/data/places/${p.id}.${ext}"]`).length);
    if (p.status === 'watchlist') assert.match($('.status-note').text(), /Opening unconfirmed/);
  }
});
test('Restaurant structured data does not promote ordering windows, conflicts or closed branches', () => {
  for (const p of catalog.places) {
    const $ = html(`places/${p.id}/index.html`);
    const graph = $('script[type="application/ld+json"]')
      .toArray()
      .flatMap((e) => JSON.parse($(e).text())['@graph'] ?? []);
    const restaurants = graph.filter((e) => e['@type'] === 'Restaurant');
    assert.equal(
      restaurants.length,
      p.locations.filter((l) => l.operating_status === 'listed').length,
    );
    for (const r of restaurants) {
      const l = p.locations.find((l) => r['@id'].endsWith('#' + l.id));
      assert.ok(l);
      assert.equal(r.address.streetAddress, l.address.street_address);
      const publishHours = l.hours.status === 'published' && l.hours.scope === 'restaurant';
      assert.equal('openingHoursSpecification' in r, publishHours);
      if (publishHours) {
        const expected = Object.values(l.hours.weekly).flatMap((w) => w ?? []);
        assert.equal(r.openingHoursSpecification.length, expected.length);
      }
      assert.equal(r.aggregateRating, undefined);
      assert.equal(r.review, undefined);
    }
  }
});
test('JSON exports are schema-valid and exactly preserve records and referenced sources', () => {
  assert.deepEqual(json('dist/data/places.json'), catalog);
  for (const p of catalog.places) {
    const file = `dist/data/places/${p.id}.json`;
    const out = json(file);
    assert.ok(checkExport(out), JSON.stringify(checkExport.errors));
    assert.deepEqual(out.place, p);
    assert.deepEqual(
      out.sources,
      p.source_ids.map((id) => catalog.sources.find((s) => s.id === id)),
    );
    assert.ok(existsSync(resolve(dirname(file), out.$schema)));
    const md = read(`dist/data/places/${p.id}.md`);
    assert.ok(md.includes(base + `places/${p.id}/`));
    for (const l of p.locations) assert.ok(md.includes(l.address.street_address));
  }
});
test('map coordinates validate and refer only to listed catalog addresses', () => {
  assert.ok(checkGeo(geocodes), JSON.stringify(checkGeo.errors));
  assert.deepEqual(json('dist/data/geocodes.json'), geocodes);
  const locations = catalog.places.flatMap((p) => p.locations);
  for (const [id, g] of Object.entries(geocodes.locations)) {
    const l = locations.find((l) => l.id === id);
    assert.ok(l, id);
    assert.equal(l.operating_status, 'listed');
    assert.ok(g.matched_address.includes('SAN FRANCISCO, CA'));
    assert.ok(g.checked_on <= geocodes.checked_on);
    assert.match(g.accuracy_note, /interpolated/);
  }
});
test('all local links, fragments, script and stylesheet paths resolve beneath the Pages base', () => {
  const failures = [];
  for (const file of pages) {
    const $ = load(read(file));
    const pageURL = base + file.slice(5).replace(/index\.html$/, '');
    for (const e of $('a[href],link[href],script[src],img[src]').toArray()) {
      const raw = $(e).attr('href') ?? $(e).attr('src');
      if (!raw || raw.startsWith('data:')) continue;
      const url = new URL(raw, pageURL);
      if (url.origin !== origin) continue;
      if (!url.pathname.startsWith('/burrito/')) {
        failures.push(`${file}: outside base ${raw}`);
        continue;
      }
      let target = 'dist/' + decodeURIComponent(url.pathname.slice('/burrito/'.length));
      if (url.pathname.endsWith('/')) target += 'index.html';
      if (!existsSync(target)) {
        failures.push(`${file}: missing ${raw}`);
        continue;
      }
      if (url.hash && target.endsWith('.html')) {
        const targetDoc = load(read(target));
        if (
          !targetDoc('[id]')
            .toArray()
            .some((e) => targetDoc(e).attr('id') === decodeURIComponent(url.hash.slice(1)))
        )
          failures.push(`${file}: missing fragment ${raw}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});
test('sitemap covers every indexable HTML page, metadata and structured data parse', () => {
  const sitemap = load(read('dist/sitemap.xml'), { xmlMode: true });
  const urls = sitemap('loc')
    .map((_, e) => sitemap(e).text())
    .get();
  assert.equal(new Set(urls).size, urls.length);
  for (const file of pages) {
    const $ = load(read(file));
    assert.equal($('html').attr('lang'), 'en');
    assert.ok($('title').text().length > 10);
    assert.ok($('meta[name=description]').attr('content'));
    assert.ok($('meta[property="og:image"]').attr('content').startsWith(base));
    for (const e of $('script[type="application/ld+json"]').toArray())
      assert.ok(JSON.parse($(e).text())['@context']);
    if (file.endsWith('/404.html')) {
      assert.equal($('meta[name=robots]').attr('content'), 'noindex,follow');
      continue;
    }
    assert.ok(urls.includes($('link[rel=canonical]').attr('href')), file);
  }
  assert.equal(urls.length, pages.length - 1);
  assert.ok(read('dist/llms.txt').includes(base + 'data/places.json'));
});
test('surprise picks use only active catalog entries and keep a no-JS link', () => {
  const expected = catalog.places
    .filter((p) => p.status === 'catalog')
    .map((p) => `/burrito/places/${p.id}/`);
  for (const file of ['index.html', '404.html']) {
    const $ = html(file);
    const picks = JSON.parse($('[data-spin-picks]').text());
    assert.deepEqual(
      picks.map((p) => p.url),
      expected,
    );
    assert.equal($('[data-spin-fallback]').attr('href'), '/burrito/explore/?surprise=1');
  }
});
test('search combines accent-insensitive tokens, neighborhood and style without mutation', () => {
  const input = [
    {
      id: 'a',
      search: 'Taquería Cancún Mission carnitas',
      styles: ['classic-mission'],
      neighborhoods: ['Mission'],
    },
    {
      id: 'b',
      search: 'Cali fries Sunset',
      styles: ['california-style'],
      neighborhoods: ['Outer Sunset'],
    },
  ];
  assert.deepEqual(
    filterPlaces(input, { query: 'cancun TAQUERIA' }).map((p) => p.id),
    ['a'],
  );
  assert.equal(filterPlaces(input, { query: 'carnitas', neighborhood: 'Outer Sunset' }).length, 0);
  assert.deepEqual(
    filterPlaces(input, { style: 'california-style', neighborhood: 'Outer Sunset' }).map(
      (p) => p.id,
    ),
    ['b'],
  );
  assert.equal(filterPlaces(input, {}).length, 2);
  assert.equal(input.length, 2);
});
