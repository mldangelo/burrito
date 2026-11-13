import { places, catalog, placeMarkdown, absolute } from '../../lib/catalog';
export function GET() {
  return new Response(
    `# ${catalog.title}\n\nSnapshot: ${catalog.updated_on}\nCanonical: ${absolute()}\n\n## Interpretation\n\n${catalog.methodology.map((m) => '- ' + m).join('\n')}\n\n---\n\n${places.map(placeMarkdown).join('\n---\n\n')}`,
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  );
}
