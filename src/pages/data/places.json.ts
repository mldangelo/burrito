import { catalog } from '../../lib/catalog';
export function GET() {
  return new Response(JSON.stringify(catalog, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
