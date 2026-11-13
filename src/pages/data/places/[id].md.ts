import { places, placeMarkdown } from '../../../lib/catalog';
export function getStaticPaths() {
  return places.map((place) => ({ params: { id: place.id }, props: { place } }));
}
export function GET({ props }) {
  return new Response(placeMarkdown(props.place), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
