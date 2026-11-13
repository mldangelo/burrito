import catalog from '../../../schema/catalog.schema.json';
import geocodes from '../../../schema/geocodes.schema.json';
import place from '../../../schema/place-export.schema.json';
export function getStaticPaths() {
  return [
    { name: 'catalog.schema', schema: catalog },
    { name: 'geocodes.schema', schema: geocodes },
    { name: 'place-export.schema', schema: place },
  ].map(({ name, schema }) => ({ params: { name }, props: { schema } }));
}
export function GET({ props }) {
  return new Response(JSON.stringify(props.schema, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/schema+json; charset=utf-8' },
  });
}
