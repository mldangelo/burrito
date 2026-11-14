import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { renderMap } from '../src/lib/map.mjs';
const read = async (file) =>
  JSON.parse(await readFile(new URL('../' + file, import.meta.url), 'utf8'));
const [catalog, geocodes, geography] = await Promise.all(
  ['data/places.json', 'data/geocodes.json', 'data/map/neighborhoods.geojson'].map(read),
);
const svg = renderMap(catalog, geocodes, geography);
const output = new URL('../public/maps/sf-burrito-map.svg', import.meta.url);
if (process.argv.includes('--check')) {
  let existing = '';
  try {
    existing = await readFile(output, 'utf8');
  } catch {}
  if (existing !== svg) {
    console.error('SVG map is stale. Run npm run build:map.');
    process.exitCode = 1;
  } else console.log('SVG map is current.');
} else {
  await mkdir(new URL('../public/maps/', import.meta.url), { recursive: true });
  await writeFile(output, svg);
  console.log('Generated public/maps/sf-burrito-map.svg.');
}
