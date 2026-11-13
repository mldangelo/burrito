import { places, catalog, sourceMap, absolute } from '../../../lib/catalog';
export function getStaticPaths() {
  return places.map((place) => ({ params: { id: place.id }, props: { place } }));
}
export function GET({ props }) {
  const { place } = props;
  return new Response(
    JSON.stringify(
      {
        $schema: '../../schema/place-export.schema.json',
        schema_version: catalog.schema_version,
        canonical_url: absolute(`places/${place.id}/`),
        updated_on: place.checked_on,
        methodology: catalog.methodology,
        place,
        sources: place.source_ids.map((id) => sourceMap.get(id)),
      },
      null,
      2,
    ) + '\n',
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
