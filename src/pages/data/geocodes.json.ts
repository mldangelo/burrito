import geocodes from '../../../data/geocodes.json';
export function GET() {
  return new Response(JSON.stringify(geocodes, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
