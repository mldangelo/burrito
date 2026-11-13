# Contributing

Start with `data/places.json`. The schema is in `schema/catalog.schema.json`; `CATALOG.md` is generated and should not be edited directly.

## Adding or correcting a place

1. Check the exact SF branch, address and current service status. Prefer the operator for menus and hours. An ordering platform is evidence of its own ordering schedule, not necessarily the dining room’s schedule.
2. Add sources with stable URLs and the date you actually checked them. Preserve publication dates when established; use null otherwise. Use short original summaries, not copied reviews or menu descriptions.
3. Label review evidence honestly. Burrito criticism, taco/restaurant coverage, historical tastings and menu-only leads are different. Do not infer a burrito score from a restaurant rating.
4. Keep suggested orders, reviews and vibes scoped to the branch actually supported. Label venue-format inferences; use an unknown vibe if evidence is insufficient.
5. Use `null` for an unknown day, `[]` for a confirmed closure and `closes_next_day` for overnight service. Do not turn an “open now” badge into a weekly schedule. Preserve material source conflicts in notes.
6. Keep uncertain openings in `watchlist`. If a business moves, update the primary location and retain an old address only when needed to explain historical evidence. A temporary platform outage does not prove the business closed.
7. Add concrete research gaps instead of inventing missing information. Current prices, personal ratings, geographic coordinates and dietary guarantees are not part of this initial dataset.

Keep business, location and source IDs stable once published. Add a new source ID for a different URL; reused sources belong in the shared registry. Update `checked_on` only for records actually reviewed and advance root `updated_on` as needed. New fields require a schema change and documentation.

## Validate

Requires Node.js 22 or newer.

```sh
npm ci --ignore-scripts
npm run build:index
npm run check
```

Schema validation is supplemented by reference checks, date checks and schedule semantics. Tests cover real error classes such as unknown-versus-closed days, incorrect overnight flags, cross-business branch references and overlapping hours. The generated index must match the data.

## Conventional commits

Use a type and a concise description; use a scope when helpful:

```text
feat(data): add a reviewed Richmond burrito stop
fix(data): correct Papito's current address
fix(data): update Sunday hours with an official source
feat(schema): add a sourced price field
test: reject overlapping overnight hours
docs: explain evidence labels
ci: update catalog validation workflow
```

Mention changed facts and their supporting sources in the pull request. Report checks actually run. Avoid unrelated formatting changes, private information and generated research scratch files.
