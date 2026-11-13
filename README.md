# burrito

[![Build and deploy field guide](https://github.com/mldangelo/burrito/actions/workflows/validate.yml/badge.svg)](https://github.com/mldangelo/burrito/actions/workflows/validate.yml)

A sourced catalog of San Francisco burritos: Mission classics, California-style burritos, breakfast, seafood, vegetarian options and neighborhood taquerias across the city.

**[Open the field guide](https://mldangelo.github.io/burrito/)** · **[Browse the Markdown catalog](CATALOG.md)** · **[JSON data](data/places.json)** · **[JSON Schema](schema/catalog.schema.json)**

The initial research snapshot is **November 13, 2026**: **58 businesses**, including 54 catalog entries, two history stops and two unconfirmed opening/reopening leads. There are 83 location records: 80 listed locations, two announced locations and one former address preserved to identify older reviews. This is a broad curated index, not an exhaustive census or a firsthand tasting ranking.

## Start exploring

| Interest | Places to start |
| --- | --- |
| Classic Mission | [El Farolito](CATALOG.md#el-farolito), [El Metate](CATALOG.md#el-metate), [La Taqueria](CATALOG.md#la-taqueria) |
| California style | [Leo’s](CATALOG.md#leos), [Garaje](CATALOG.md#garaje), [Señor Sisig](CATALOG.md#senor-sisig), [Tacko](CATALOG.md#tacko), [Underdogs](CATALOG.md#underdogs) |
| Outside the Mission | [La Corneta in Glen Park](CATALOG.md#la-corneta), [Don Chuy’s](CATALOG.md#don-chuys), [Hook Fish](CATALOG.md#hook-fish), [El Rancho Grande in the Haight](CATALOG.md#rancho-grande), [Gordo](CATALOG.md#gordo) |
| Breakfast | [Breakfast Little](CATALOG.md#breakfast-little), [Al Carajo](CATALOG.md#al-carajo), [Hazel’s](CATALOG.md#hazels), [Il Canto](CATALOG.md#il-canto) |
| Meat alternatives | [Papalote](CATALOG.md#papalote), [The Little Chihuahua](CATALOG.md#little-chihuahua), [Los Mayas](CATALOG.md#los-mayas) |

These are starting points for comparison. Each entry identifies whether its evidence is a burrito review, broader restaurant coverage, an old tasting or a current menu. A restaurant’s taco reputation is not presented as a burrito verdict.

## What is tracked

| Field | Meaning |
| --- | --- |
| `places[].id` | Stable business identifier; some separately reviewed, similarly named businesses have separate records. |
| `status` | `catalog`, `history` or `watchlist`; watchlist entries are not current recommendations. |
| `styles` | Searchable tags such as `classic-mission`, `california-style`, `breakfast` and `seafood`. |
| `locations` | Branch addresses, neighborhoods, map links, operating status and hours. A street intersection can identify a truck stop. |
| `standout_items` | Suggested orders with their evidence basis, source links and applicable branches. |
| `reviews` | Original brief summaries with explicit evidence labels and branch scope. Publication dates live in the source registry. |
| `vibe` | Source-based description or a labeled interpretation of the venue format; never a claimed firsthand visit. |
| `visit_notes`, `research_gaps` | Useful caveats and concrete missing information. |
| `sources` | Shared source registry: URLs, titles, type, publication date when known and research date. |
| `exclusions` | Stale or unresolved listings deliberately left out, with reasons and sources. |

`primary_location_id` identifies the main destination for a business. Reviews and orders apply only to their `location_ids`. Extra branches do not inherit a reviewed branch’s verdict. For example, Papito’s old Connecticut Street address is retained for historical reviews; the current primary location is on 18th Street.

### Hours and freshness

Schedules use 24-hour local time in `America/Los_Angeles`. A day contains one or more service windows, `[]` for explicitly closed, or `null` for unknown. A Friday window of `10:00`–`02:00` with `closes_next_day: true` ends on Saturday morning. Split lunch/dinner service uses two windows.

`hours.status` is `published`, `partial`, `conflicting` or `unknown`. `hours.scope` distinguishes restaurant hours, kitchen hours, online-ordering windows and truck schedules. **Published means a source supplies a complete week; it does not mean the restaurant was called or visited.** Directory schedules remain labeled through their sources. Holidays, special events and temporary outages are not modeled.

The initial snapshot has 66 complete weekly schedules, nine partial schedules, two unresolved conflicts and six unknown schedules. Those six unknowns are three truck stops, two announced openings and one former address. La Taqueria’s official pages disagree on Friday closing; Cancún’s directory hours conflict. Confirm uncertain hours before a special trip.

`checked_on` means the source was researched on that date. It is distinct from `published_on`; an older review does not establish current quality. `operating_status: listed` means a source currently lists the location, not that the doors are open right now. Missing postal codes and unconfirmed details remain null rather than being guessed.

## Use the data

The canonical file is [data/places.json](data/places.json), validated against [JSON Schema Draft 2020-12](schema/catalog.schema.json). Its relative `$schema` reference works with compatible editors. No API key is required.

```sh
git clone https://github.com/mldangelo/burrito.git
cd burrito
npm ci --ignore-scripts
npm run check
```

The validator checks the schema, unique IDs, source and branch references, review evidence types, date consistency, hours states, overnight flags and overlapping windows. It does not claim to verify restaurant facts or the live availability of source URLs. GitHub Actions runs the checks on pushes and pull requests.

Examples with `jq`:

```sh
# California-style options, excluding unconfirmed openings
jq '.places[] | select(.status != "watchlist") | select(.styles | index("california-style")) | {id, name, standout_items}' data/places.json

# Listed locations outside the Mission
jq '.places[] | .name as $name | .locations[] | select(.area == "outside_mission" and .operating_status == "listed") | {name: $name, address, neighborhood, hours}' data/places.json

# Review evidence for a particular business
jq '.places[] | select(.id == "leos") | .reviews' data/places.json

# Places needing hours research
jq '.places[] | .name as $name | .locations[] | select(.operating_status == "listed" and .hours.status != "published") | {name: $name, address, hours}' data/places.json
```

## Updating the catalog

Edit `data/places.json`, add or update sources, then run:

```sh
npm run build:index
npm run check
```

`CATALOG.md` is generated from the JSON, and CI rejects a stale index. See [CONTRIBUTING.md](CONTRIBUTING.md) for evidence standards and conventional commit examples.

## Field guide and GitHub Pages

The frontend lives in this repository and is generated with Astro. GitHub Actions validates the data, builds the static pages, checks exports and internal links, and deploys the `dist/` artifact to **https://mldangelo.github.io/burrito/** after a successful main-branch build. Pull requests run the same checks without deploying. GitHub Pages uses **GitHub Actions** as its source.

```sh
npm ci --ignore-scripts
ASTRO_TELEMETRY_DISABLED=1 npm run dev
# Open http://localhost:4321/burrito/
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run preview
```

The Astro `site` and `base` settings in `astro.config.mjs` define canonical URLs and the project path. Keep all internal links and asset paths under `/burrito/`. Fonts, original SVG artwork and the social image are served locally. There are no accounts, passport features, analytics or browser storage. Map tiles come from OpenStreetMap only when the map view is opened; the coordinate provenance is documented in [data/GEOCODING.md](data/GEOCODING.md).

The guide includes full static place pages, five curated guides, neighborhood pages, client-side search and filters, and a map of approximate address points. Unknown, conflicting, ordering-only and branch-specific information remain visible.

### Agent and search discovery

- Static semantic HTML and ordinary links expose the complete guide without JavaScript.
- Each page has a canonical URL, descriptive metadata and a social preview.
- JSON-LD describes the website, place lists, listed restaurant branches and downloadable dataset. Only complete restaurant schedules are emitted as restaurant opening hours. No invented ratings, review scores or live availability.
- [`sitemap.xml`](https://mldangelo.github.io/burrito/sitemap.xml) lists canonical HTML pages.
- [`llms.txt`](https://mldangelo.github.io/burrito/llms.txt) provides a reading index and interpretation rules. It is a convenience, not a search-ranking promise or universal crawler standard.
- [`data/places.json`](https://mldangelo.github.io/burrito/data/places.json) is identical to the canonical catalog; its relative schema link resolves on Pages.
- `/burrito/data/places/{id}.json` includes one record and its referenced sources, validated by `schema/place-export.schema.json`; `.md` provides a plain-text equivalent.
- `/burrito/data/catalog.md` provides the complete Markdown export. `/burrito/schema/` publishes all three schemas.

A project-scoped `/burrito/robots.txt` would not control crawlers for the host, so none is published. Crawler directives belong at the origin root; this project uses page-level robots metadata and a linked sitemap. It does not modify another repository or claim control over `mldangelo.github.io/robots.txt`.

### Checks

`npm run check` validates the catalog, confirms the generated Markdown index, builds the guide, and runs the test suite. The web checks cover static discovery, every branch and cited source, JSON exports and schemas, map-record references, structured-data scope, sitemap coverage, base paths and internal links/fragments. Browser QA should also cover search, combined filters, empty/reset behavior, random selection, map/list switching, keyboard use and narrow mobile layouts.
