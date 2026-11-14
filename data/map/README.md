# Field map geography

The SVG map uses the official **SF Find Neighborhoods** dataset published by San Francisco Planning through DataSF.

- Dataset: https://data.sf.gov/d/gfpk-269f
- GeoJSON: https://data.sf.gov/resource/gfpk-269f.geojson?$limit=200
- Metadata: https://data.sf.gov/api/views/gfpk-269f.json
- Retrieved: November 13, 2026. Source rows last updated October 17, 2023.
- License in the publisher metadata: **Public Domain U.S. Government** (`USGOV_WORKS`).

The source describes general neighborhood reference areas originally defined for SF Find in 2006, not hard boundaries. The checked-in GeoJSON retains all 117 source features, their names and polygon geometry. Coordinates are rounded to six decimal places; unrelated source link properties are omitted. No road geometry or restaurant coordinates are derived from neighborhood boundaries.

The renderer excludes Treasure Island and Yerba Buena Island to frame the main peninsula, where all currently matched catalog addresses lie. Green fills identify the source features named Presidio National Park, Golden Gate Park, Lincoln Park / Ft. Miley, McLaren Park and Candlestick Point SRA. They are reference areas, not a comprehensive park inventory. Water waves and the compass are decorative.

`src/lib/map.mjs` applies a north-up local equirectangular projection with longitude scaled by cos(37.76°). All restaurant positions come from `data/geocodes.json`; see `data/GEOCODING.md` for their Census provenance and interpolation limitations. Nearby positions are grouped by repeatedly merging the closest overlapping marker pair until each marker has five drawing units of clear space. Group markers use the members’ mean position; points are never nudged to artificial coordinates. Groups reflect the drawing scale, not official neighborhood membership or a fixed walking distance. Counts represent branch locations, not ratings or rankings. A marker links to its single branch or a complete group listing. No unconfirmed openings, former addresses, or guessed coordinates enter the map.

Run `npm run build:map` after changing data or rendering code. The SVG is checked into `public/maps/sf-burrito-map.svg` so it is available as a standalone, self-contained vector file. `npm run check:map` rejects a stale generated asset. Building and checking require no network requests for map geography or tiles.
