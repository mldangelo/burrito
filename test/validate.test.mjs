import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../scripts/validate.mjs';

const catalog = JSON.parse(readFileSync(new URL('../data/places.json', import.meta.url)));
function rejects(name, mutate, message) {
  test(name, () => {
    const copy = structuredClone(catalog);
    mutate(copy);
    assert.ok(validateCatalog(copy).some(e => e.includes(message)), `Expected ${message}`);
  });
}

test('catalog passes the schema and semantic checks', () => assert.deepEqual(validateCatalog(catalog), []));
rejects('missing address is rejected', c => delete c.places[0].locations[0].address, 'address');
rejects('duplicate place IDs are rejected', c => c.places[1].id = c.places[0].id, 'duplicate');
rejects('unknown evidence source is rejected', c => c.places[0].reviews[0].source_ids.push('src-missing'), 'unknown source');
rejects('reviews cannot refer to another business branch', c => c.places[0].reviews[0].location_ids = [c.places[1].primary_location_id], 'outside this place');
rejects('invalid local clock time is rejected', c => c.places[0].locations[0].hours.weekly.monday[0].opens = '25:00', 'pattern');
rejects('overnight closing must be explicit', c => c.places[0].locations[0].hours.weekly.monday[0].closes_next_day = false, 'overnight');
rejects('unknown is different from closed', c => {
  const h = c.places.find(p => p.id === 'semilla').locations[0].hours;
  h.weekly.monday = [];
}, 'unknown hours');
rejects('published schedules cannot omit a day', c => c.places[0].locations[0].hours.weekly.monday = null, 'seven known days');
rejects('overlapping opening windows are rejected', c => {
  c.places[0].locations[0].hours.weekly.monday.push({ opens:'12:00', closes:'13:00', closes_next_day:false });
}, 'overlap');
rejects('Sunday overnight overlap into Monday is rejected', c => {
  c.places[0].locations[0].hours.weekly.sunday = [{ opens:'22:00', closes:'11:00', closes_next_day:true }];
}, 'overlap');
rejects('watchlist entries cannot enter the shortlist', c => c.places.find(p => p.status === 'watchlist').shortlist = true, 'watchlist');
rejects('a menu is not a critic review', c => {
  for (const s of c.sources) s.kind = 'official';
}, 'independent editorial');
