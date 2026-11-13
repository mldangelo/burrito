import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(new URL('../schema/catalog.schema.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

export function validateCatalog(catalog) {
  if (!validateSchema(catalog)) {
    return validateSchema.errors.map(e => `${e.instancePath || '/'}: ${e.message}`);
  }
  const errors = [];
  const fail = (path, message) => errors.push(`${path}: ${message}`);
  const unique = (values, path) => {
    const seen = new Set();
    for (const value of values) {
      if (seen.has(value)) fail(path, `duplicate ID or value ${value}`);
      seen.add(value);
    }
  };
  unique(catalog.sources.map(s => s.id), 'sources');
  unique(catalog.sources.map(s => s.url), 'source URLs');
  unique(catalog.places.map(p => p.id), 'places');
  unique(catalog.places.flatMap(p => p.locations.map(l => l.id)), 'locations');
  const sources = new Map(catalog.sources.map(s => [s.id, s]));
  const usedSources = new Set();
  const refs = (ids, path) => ids.forEach(id => {
    usedSources.add(id);
    if (!sources.has(id)) fail(path, `unknown source ${id}`);
  });
  const checkDate = (date, path) => {
    if (date > catalog.updated_on) fail(path, 'date is later than catalog updated_on');
  };
  for (const source of catalog.sources) {
    checkDate(source.checked_on, source.id);
    if (source.published_on && source.published_on > source.checked_on) {
      fail(source.id, 'publication date is later than checked_on');
    }
  }
  for (const place of catalog.places) {
    const scope = new Set(place.locations.map(l => l.id));
    refs(place.source_ids, place.id);
    if (!scope.has(place.primary_location_id)) fail(place.id, 'primary location is outside this place');
    const primary = place.locations.find(l => l.id === place.primary_location_id);
    if (place.status !== 'watchlist' && primary?.operating_status !== 'listed') {
      fail(place.id, 'catalog/history primary location must be listed; use watchlist for unconfirmed service');
    }
    if (place.status === 'watchlist' && place.shortlist) fail(place.id, 'watchlist cannot be shortlisted');
    if (place.added_on > place.checked_on) fail(place.id, 'added_on is later than checked_on');
    checkDate(place.checked_on, place.id);
    for (const entry of [...place.reviews, ...place.standout_items, place.vibe]) {
      refs(entry.source_ids, place.id);
      for (const id of entry.location_ids) if (!scope.has(id)) fail(place.id, `location reference ${id} is outside this place`);
      for (const id of entry.source_ids) if (!place.source_ids.includes(id)) fail(place.id, `source ${id} is missing from place source_ids`);
    }
    for (const review of place.reviews) {
      const requiredKinds = {
        burrito_specific_editorial: ['editorial'],
        restaurant_or_taco_editorial: ['editorial'],
        historical_burrito_review: ['editorial', 'archive'],
        historical_significance: ['editorial', 'archive'],
      }[review.evidence];
      if (requiredKinds && !review.source_ids.some(id => requiredKinds.includes(sources.get(id)?.kind))) {
        fail(place.id, `${review.evidence} needs independent editorial or archive evidence`);
      }
    }
    if ((place.vibe.basis === 'unknown') !== (place.vibe.summary === null)) fail(place.id, 'unknown vibe must have null summary, and vice versa');
    if (place.vibe.basis !== 'unknown' && !place.vibe.source_ids.length) fail(place.id, 'vibe needs sources');
    for (const location of place.locations) {
      const path = location.id;
      refs(location.source_ids, path);
      refs(location.hours.source_ids, path + '/hours');
      checkDate(location.checked_on, path);
      checkDate(location.hours.checked_on, path + '/hours');
      for (const id of [...location.source_ids, ...location.hours.source_ids]) {
        if (!place.source_ids.includes(id)) fail(path, `source ${id} is missing from place source_ids`);
      }
      const hours = location.hours;
      const week = Object.values(hours.weekly);
      const knownDays = week.filter(day => day !== null).length;
      if (hours.status === 'published' && knownDays !== 7) fail(path, 'published hours require seven known days');
      if (hours.status === 'partial' && (knownDays === 0 || knownDays === 7)) fail(path, 'partial hours require some known and some unknown days');
      if (hours.status === 'unknown' && knownDays !== 0) fail(path, 'unknown hours must use null for every day');
      if (hours.status !== 'unknown' && !hours.source_ids.length) fail(path, 'reported hours need a source');
      if (hours.status === 'conflicting' && !hours.notes.length) fail(path, 'conflicting hours need an explanation');
      const minute = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const spans = [];
      days.forEach((day, index) => {
        for (const interval of hours.weekly[day] ?? []) {
          const start = minute(interval.opens);
          const end = minute(interval.closes);
          if (interval.closes_next_day !== (end <= start)) fail(path + '/' + day, 'overnight flag does not match opening and closing times');
          const span = [index * 1440 + start, index * 1440 + end + (interval.closes_next_day ? 1440 : 0)];
          spans.push(span);
        }
      });
      // Repeat the week once so Sunday-to-Monday overlaps are checked too.
      const repeated = [...spans, ...spans.map(([a,b]) => [a + 10080, b + 10080])].sort((a,b) => a[0] - b[0]);
      for (let i = 1; i < repeated.length; i++) if (repeated[i][0] < repeated[i-1][1]) fail(path, 'opening intervals overlap');
    }
  }
  catalog.exclusions.forEach(e => refs(e.source_ids, e.name));
  for (const source of catalog.sources) if (!usedSources.has(source.id)) fail(source.id, 'source is not referenced');
  return errors;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const filename = process.argv[2] ?? fileURLToPath(new URL('../data/places.json', import.meta.url));
  try {
    const catalog = JSON.parse(readFileSync(filename, 'utf8'));
    const errors = validateCatalog(catalog);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`Valid: ${catalog.places.length} places, ${catalog.places.reduce((n,p) => n + p.locations.length, 0)} locations, ${catalog.sources.length} sources.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
