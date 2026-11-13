# burrito

[![Validate catalog](https://github.com/mldangelo/burrito/actions/workflows/validate.yml/badge.svg)](https://github.com/mldangelo/burrito/actions/workflows/validate.yml)

A sourced catalog of San Francisco burritos: Mission classics, California-style burritos, breakfast, seafood, vegetarian options and neighborhood taquerias across the city.

**[Browse the catalog](CATALOG.md)** · **[JSON data](data/places.json)** · **[JSON Schema](schema/catalog.schema.json)**

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
