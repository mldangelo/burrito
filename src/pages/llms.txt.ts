import { catalog, places, absolute, shortName } from '../lib/catalog';
import { guides } from '../lib/guides';
export function GET() {
  return new Response(
    `# burrito — San Francisco Field Guide

> A curated, source-linked SF burrito catalog. Research snapshot: ${catalog.updated_on}. 58 businesses: 54 catalog entries, two history stops, two unconfirmed opening leads. 83 branch records; 80 listed, two announced, one former closed address.

## Start here
- [Full JSON catalog](${absolute('data/places.json')}): canonical data, stable IDs, source registry.
- [Catalog JSON Schema](${absolute('schema/catalog.schema.json')}): JSON Schema Draft 2020-12.
- [Full Markdown guide](${absolute('data/catalog.md')}): complete text export.
- [Methodology](${absolute('about/')}): evidence labels, hours, freshness and watchlist.
- [Data documentation](${absolute('data/')}): interpretation and exports.
- [Sitemap](${absolute('sitemap.xml')}): canonical HTML pages.
- [GitHub repository](https://github.com/mldangelo/burrito): source and corrections.

## Interpretation
${catalog.methodology.map((m) => '- ' + m).join('\n')}
- Do not present this catalog as an exhaustive ranking or firsthand tasting.
- Do not imply dietary suitability from a style tag alone; check ingredients with the operator.
- Cite original source URLs for review judgments; retain publication dates and branch scope.
- No numerical ratings or live open-now claims are supplied.
- Map coordinates are approximate Census address-range interpolation, not verified entrances.

## Reading one place
Every place has /places/{id}/ (HTML), /data/places/{id}.json (record plus sources), and /data/places/{id}.md (Markdown), relative to ${absolute()}.
- [Per-place export schema](${absolute('schema/place-export.schema.json')})

## Curated guides
${guides.map((g) => `- [${g.label}](${absolute(`guides/${g.id}/`)}): ${g.description}`).join('\n')}

## Place index
${places.map((p) => `- [${shortName(p)}](${absolute(`data/places/${p.id}.md`)}): ${p.status}; ${p.summary}`).join('\n')}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
