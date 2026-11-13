# Address coordinates

`geocodes.json` supplies the field guide map separately from the canonical restaurant records. It is validated against `schema/geocodes.schema.json`; its keys must refer to listed location IDs in `places.json`.

The initial snapshot, checked November 13, 2026, contains 73 exact street-address matches from the U.S. Census Bureau Geocoder, benchmark `Public_AR_Current`. One 74-address batch returned 72 exact matches. Al Carajo’s fractional address was separately matched as `3224 1/2 22nd St`; the fraction was preserved. Match acceptance required the same street number/name and San Francisco, CA, with coordinates within the city’s broad bounds. Unit/suite suffixes were removed only for street-level matching.

**Exact address match is not exact positional accuracy.** Census interpolates coordinates along address ranges. A pin is an approximate address location, not a verified entrance, rooftop or confirmation that the business operates there. Six decimal places are storage precision, not an accuracy claim.

Each point retains its submitted/matched address, provider, benchmark, date, TIGER line information, accuracy note and reproducible query URL. The current benchmark can change; later queries may return different coordinates. Do not replace records silently or add guessed coordinates.

Seven listed locations have no accepted point:

- Señor Sisig at 1 Ferry Building and 151 Warriors Way: no match.
- El Gallo Giro at 23rd and Treat, three El Tonayense truck intersections, and Tlaloc by Sydney G. Walton Square: no street-address point attempted.

The two announced openings and Papito’s former closed address are excluded. All unmapped active locations remain accessible in the list and have their existing directions links.

Sources:

- [Census Geocoding API documentation](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html)
- [Census address-range and accuracy limitations](https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/census-geocoder.html)
- [Census government data licensing guidance](https://www2.census.gov/geo/pdfs/maps-data/data/tiger/tgrshp2023/TGRSHP2023_TechDoc.pdf)

Census data are U.S. government works; acknowledge the U.S. Census Bureau without implying endorsement. The map separately credits OpenStreetMap contributors and loads tiles only when a reader opens the map. Follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/); do not prefetch tiles or add offline downloads. Automated browser checks should stub tile responses.
