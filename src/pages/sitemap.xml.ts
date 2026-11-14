import { places, neighborhoods, slug, absolute, catalog } from '../lib/catalog';
import { guides } from '../lib/guides';
export const routes = [
  '',
  'explore/',
  'map/',
  'guides/',
  'neighborhoods/',
  'about/',
  'data/',
  ...places.map((p) => `places/${p.id}/`),
  ...guides.map((g) => `guides/${g.id}/`),
  ...neighborhoods.map((n) => `neighborhoods/${slug(n)}/`),
];
export function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((r) => `<url><loc>${absolute(r)}</loc><lastmod>${catalog.updated_on}</lastmod></url>`).join('')}</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
