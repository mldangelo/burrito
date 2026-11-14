# Working on burrito

- Use conventional commits: `feat(data): ...`, `fix(data): ...`, `feat(schema): ...`, `test: ...`, `docs: ...`, `ci: ...`.
- Keep restaurant data in `data/places.json` and validate it against `schema/catalog.schema.json`.
- Run `npm ci --ignore-scripts`, regenerate `CATALOG.md` with `npm run build:index`, and run `npm run check` before committing.
- Add sources for factual changes. Prefer the restaurant for its menu, addresses and hours; use independent reporting for critical judgments.
- A review of tacos or a restaurant is not automatically a review of its burrito. Preserve the coverage label and review date.
- Keep reviews and recommended orders scoped to the location actually covered. Never copy one branch's hours to another without evidence.
- Record unknown values explicitly. For hours, `null` means unknown and `[]` means closed. Do not infer a weekly schedule from an “open now” badge.
- Hours are published schedules, not a real-time promise. Preserve conflicts and distinguish ordering windows from restaurant hours.
- Do not invent ratings, first-hand visits, prices, geographic coordinates, dietary guarantees or atmosphere claims.
- Keep announced, closed and unconfirmed locations out of active recommendation counts.
- Use original concise summaries and source links. Do not copy full reviews or menus.
- Do not add credentials, private personal data, analytics, or unrelated files.

## Field guide

- Keep Pages deployment in this repository. Do not add a separate hosting service or passport/account features.
- Build with `ASTRO_TELEMETRY_DISABLED=1 npm run check`; use `npm run dev` / `npm run preview` for browser review.
- All internal URLs must respect the `/burrito/` base. New indexable routes belong in `src/pages/sitemap.xml.ts`.
- Keep essential content and source links in static HTML. Client-side filters and maps are progressive enhancements.
- Do not emit ordering windows, unknown or conflicting schedules as Restaurant opening hours in JSON-LD.
- Coordinates live separately in `data/geocodes.json`; keep Census provenance and approximate-position notices. See `data/GEOCODING.md`.
- Verify desktop and narrow mobile layouts and the complete primary flow. Stub OSM tiles in automated map checks; do not automate bulk map panning.

- Regenerate the illustrated SVG with `npm run build:map` after catalog, coordinate or map-renderer changes. Preserve DataSF provenance in `data/map/README.md`; numbers on map markers are location counts, never rankings.
