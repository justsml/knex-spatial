# Knex Spatial Plugin

[![CI Status](https://github.com/justsml/knex-spatial/workflows/tests/badge.svg)](https://github.com/justsml/knex-spatial/actions)
[![NPM version](https://img.shields.io/npm/v/knex-spatial-plugin.svg)](https://www.npmjs.com/package/knex-spatial-plugin)
[![GitHub stars](https://img.shields.io/github/stars/justsml/knex-spatial.svg?style=social)](https://github.com/justsml/knex-spatial)

A Knex plugin for easy operations on geometric & geospatial data in Postgres.

A fluent, expressive and natural API design.

- [Get Started](#get-started)
- [Methods](#methods)
  - [`selectDistance`](#selectdistance)
  - [`whereDistance` \& `whereDistanceWithin`](#wheredistance--wheredistancewithin)
  - [`selectArea`](#selectarea)
  - [`selectCentroid`](#selectcentroid)
  - [`selectConvexHull`](#selectconvexhull)
  - [`selectDifference`](#selectdifference)
  - [`selectIntersection`](#selectintersection)
  - [`selectEnvelope`](#selectenvelope)
  - [`selectLength`](#selectlength)
  - [`selectSymDifference`](#selectsymdifference)
  - [`selectUnion`](#selectunion)
  - [`whereContains`](#wherecontains)
  - [`whereContainsProperly`](#wherecontainsproperly)
  - [`whereCovers`](#wherecovers)
  - [`whereCoveredBy`](#wherecoveredby)
  - [`whereCrosses`](#wherecrosses)
  - [`whereDisjoint`](#wheredisjoint)
  - [`whereEquals`](#whereequals)
  - [`whereIntersects`](#whereintersects)
  - [`whereOverlaps`](#whereoverlaps)
  - [`whereRelate`](#whererelate)
  - [`whereTouches`](#wheretouches)
  - [`whereWithin`](#wherewithin)
- [Expressive Shape API](#expressive-shape-api)
  - [Geography Shapes](#geography-shapes)
  - [Geometry Shapes](#geometry-shapes)
  - [Examples](#examples)
- [Powerful Syntax Builder API](#powerful-syntax-builder-api)
- [References](#references)
- [TODO](#todo)


## Get Started

```bash
npm install knex-spatial-plugin
# OR
yarn add knex-spatial-plugin
```

Once installed, add the plugin to your Knex instance:

```ts
import Knex from 'knex';
import KnexSpatialPlugin from 'knex-spatial-plugin';

export const db = Knex(config);

// Simply call the plugin with your Knex instance
KnexSpatialPlugin(db);
```

## Methods

### `selectDistance`

Add a computed column, `distance` (in meters) based on the given `lat` & `lon` values.

Uses the `ST_Distance` function.

**Note:** Intelligently handles `undefined` lat & lon values by returning the query without modification.

```ts
import {db} from './knex';

export function findNearbyLocations({lat, lon}) {
  // Get locations within 10Km of input location, **including** the distance in the results
  return db('locations')
    .select('id', 'name')
    .selectDistance('location', { lat, lon })
    .where('distance', '<', 10000)
    .orderBy('distance');
}
```

```sql
select "id",
  "name",
  ST_Distance ("location", ST_Point (-104.128, 39.87)) / 1609.344 AS "distance"
from "locations"
where "distance" < 10000
order by "distance" asc
```

```tsv
id  name    distance
1   Denver  0
2   Boulder 38.5
```

### `whereDistance` & `whereDistanceWithin`

Include only results within a given radius in meters.

Uses the `ST_Distance` & `ST_DWithin` function.

**Note:** Intelligently handles `undefined` lat & lon values by returning the query without modification.

```ts
export function findNearbyLocations({lat, lon}) {
  // Get locations within 10Km of input location, without including the distance in the results
  return db('locations')
    .select('id', 'name')
    .whereDistanceWithin('location', { lat, lon, radius: 10000 })
}
```

<!-- 
selectArea
selectCentroid
selectConvexHull
selectEnvelope
selectLength
-->

### `selectArea`

```ts
db('world_countries')
  .select('country_name')
  .selectArea('country_border', 'area_in_meters');
// SELECT "country_name",
//   ST_Area("country_border") AS "area_in_meters"
// FROM "world_countries";
```

|`country_name`|`area_in_meters`|
|---|---|
|England|130,279,000,000|
|Ireland|70,278,000,000|
|South Africa|1,221,037,630,000|
|United States|9,147,420,000,000|

```ts
db('world_countries')
  .select('country_name')
  .selectArea('country_border', 'area_in_km2', 'kilometers');
// SELECT "country_name",
//   ST_Area("country_border") * 1000 AS "area_in_km2"
// FROM "world_countries";
```

|`country_name`|`area_in_km2`|
|---|---|
|England|130,279,000|
|Ireland|70,278,000|
|South Africa|1,221,037,630|
|United States|9,147,420,000|

```ts
db('world_countries')
  .select('country_name')
  .selectArea('country_border', 'area_in_miles', 'miles')
  .orderBy('area_in_miles', 'desc');

// SELECT "country_name",
//   ST_Area("country_border") * 1609.344 AS "area_in_miles"
// FROM "world_countries"
// ORDER BY "area_in_miles" DESC;
```

|`country_name`|`area_in_miles`|
|---|---|
|United States|5,650,000|
|South Africa|754,000|
|England|80,700.8|
|Ireland|43,500.5|

### `selectCentroid`

```ts
db('world_countries')
  .select('country_name')
  .selectCentroid('country_border', 'centroid');
// SELECT "country_name",
//   ST_Centroid("country_border") AS "centroid"
// FROM "world_countries";
```

|`country_name`|`centroid`|
|---|---|
|England|`POINT(-1.474054 52.795479)`|
|Ireland|`POINT(-8.137935 53.175503)`|
|South Africa|`POINT(25.083901 -29.000341)`|
|United States|`POINT(-112.599438 45.705628)`|

### `selectConvexHull`

```ts
db('world_countries')
  .select('country_name')
  .selectConvexHull('country_border', 'convex_hull');
// SELECT "country_name",
//   ST_ConvexHull("country_border") AS "convex_hull"
// FROM "world_countries";
```

|`country_name`|`convex_hull`|
|---|---|
|England|`POLYGON((-5.270157 50.056137,-5.270157 55.811741,1.762726 55.811741,1.762726 50.056137,-5.270157 50.056137))`|
|Ireland|`POLYGON((-10.4786 51.4457,-10.4786 55.3878,-5.3319 55.3878,-5.3319 51.4457,-10.4786 51.4457))`|
|South Africa|`POLYGON((16.344976 -34.819168,16.344976 -22.125026,32.895474 -22.125026,32.895474 -34.819168,16.344976 -34.819168))`|
|United States|`POLYGON((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967))`|

### `selectDifference`

```ts
db('world_countries')
  .select('country_name')
  .selectDifference('country_border', { lat: 39.87, lon: -104.128, radius: '10mi' }, 'difference')
  .where({ country_name: 'United States' });
// SELECT "country_name",
//   ST_Difference("country_border", ST_Buffer('Point(-104.128, 39.87)'::geography, 1609.344 * 10)) AS "difference"
// FROM "world_countries"
// WHERE "country_name" = 'United States';
```

|`country_name`|`difference`|
|---|---|
|United States|`MULTIPOLYGON(((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967)))`|


### `selectIntersection`

```ts
db('world_countries')
  .select('country_name')
  .selectIntersection('country_border', { lat: 39.87, lon: -104.128, radius: '10mi' }, 'intersection')
  .where({ country_name: 'United States' });
// SELECT "country_name",
//   ST_Intersection("country_border", ST_Buffer('Point(-104.128, 39.87)'::geography, 1609.344 * 10)) AS "intersection"
// FROM "world_countries"
// WHERE "country_name" = 'United States';
```

|`country_name`|`intersection`|
|---|---|
|United States|`MULTIPOLYGON(((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967)))`|

### `selectEnvelope`

```ts
db('world_countries')
  .select('country_name')
  .selectEnvelope('country_border', 'envelope');
// SELECT "country_name",
//   ST_Envelope("country_border") AS "envelope"
// FROM "world_countries";
```

|`country_name`|`envelope`|
|---|---|
|England|`POLYGON((-5.270157 50.056137,-5.270157 55.811741,1.762726 55.811741,1.762726 50.056137,-5.270157 50.056137))`|
|Ireland|`POLYGON((-10.4786 51.4457,-10.4786 55.3878,-5.3319 55.3878,-5.3319 51.4457,-10.4786 51.4457))`|
|South Africa|`POLYGON((16.344976 -34.819168,16.344976 -22.125026,32.895474 -22.125026,32.895474 -34.819168,16.344976 -34.819168))`|
|United States|`POLYGON((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967))`|

### `selectLength`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_miles', 'miles');
// SELECT "country_name",
//   ST_Length("country_border") * 1609.344 AS "border_in_miles"
// FROM "world_countries";
```

|`country_name`|`border_in_miles`|
|---|---|
|England|2,795|
|Ireland|2,000|
|South Africa|4,000|
|United States|13,000|

### `selectSymDifference`

```ts
db('world_countries')
  .select('country_name')
  .selectSymDifference('country_border', { lat: 39.87, lon: -104.128, radius: '10mi' }, 'sym_difference')
  .where({ country_name: 'United States' });
// SELECT "country_name",
//   ST_SymDifference("country_border", ST_Buffer('Point(-104.128, 39.87)'::geography, 1609.344 * 10)) AS "sym_difference"
// FROM "world_countries"
// WHERE "country_name" = 'United States';
```

|`country_name`|`sym_difference`|
|---|---|
|United States|`MULTIPOLYGON(((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967)))`|

### `selectUnion`

```ts
db('world_countries')
  .select('country_name')
  .selectUnion('country_border', [{lat: 39.87, lon: -104.128}, {lat: 39.17, lon: -104.92}, {lat: 39.25, lon: -105.01}, {lat: 39.87, lon: -104.128}],  'union')
  .where({ country_name: 'England' });
// SELECT "country_name",
//   ST_Union("country_border") AS "union"
// FROM "world_countries"
// WHERE "country_name" = 'England';
```

### `whereContains`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_miles', 'miles');
  .whereContains('country_border', { lat: 39.87, lon: -104.128 })
// SELECT "country_name",
//   ST_Length("country_border") * 1609.344 AS "border_in_miles"
// FROM "world_countries"
// WHERE ST_Contains("country_border", ST_Point(-104.128, 39.87));
```

|`country_name`|`border_in_miles`|
|---|---|
|United States|13,000|

### `whereContainsProperly`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereContainsProperly('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1609.344 AS "border_in_miles"
// FROM "world_countries"
// WHERE ST_ContainsProperly("country_border", ST_Point(-104.128, 39.87));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereCovers`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereCovers('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Covers("country_border", ST_Point(-104.128, 39.87));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereCoveredBy`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereCoveredBy('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_CoveredBy("country_border", ST_Point(-104.128, 39.87));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereCrosses`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereCrosses('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Crosses("country_border", ST_Point(-104.128, 39.87));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereDisjoint`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereDisjoint('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Disjoint("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

|`country_name`|`border_in_km`|
|---|---|
|England|2,795|
|Ireland|2,000|
|United States|13,000|

### `whereEquals`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereEquals('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Equals("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereIntersects`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereIntersects('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Intersects("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereOverlaps`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereOverlaps('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Overlaps("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereRelate`

```ts
db('world_countries')
  .select('country_name')
  .whereRelate('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' }, 'nineElementMatrix')
// SELECT "country_name",
// FROM "world_countries"
// WHERE ST_Relate("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

|`country_name`|
|---|
|South Africa|

### `whereTouches`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereTouches('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") * 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Touches("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

|`country_name`|`border_in_km`|
|---|---|
|South Africa|4,000|

### `whereWithin`

```ts
db('world_countries')
  .select('country_name')
  .whereWithin('country_border', { lat: -26.2041, lon: 28.0473, radius: '100km' })
// SELECT "country_name",
// FROM "world_countries"
// WHERE ST_Within("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 100 * 1000));
```

|`country_name`|
|---|
|South Africa|

## Expressive Shape API

It's easy to define shapes using plain JS objects using the helper method `convertShapeToSql`

### Geography Shapes

- `POINT`: `{ lat: number, lon: number }`
- `CIRCLE`: `{ lat: number, lon: number, radius: number }`
- `LINE`: `[{ lat: number, lon: number }, ...]` (2+ points, cannot begin & end with the same point)
- `POLYGON`: `[{ lat: number, lon: number }, ...]` (first & last point must be the same)
- `MULTIPOLYGON`: `[ [{ lat: number, lon: number }, ...], ...]` (array of polygons)
- `MULTILINE`: `[ [{ lat: number, lon: number }, ...], ...]` (array of lines)

### Geometry Shapes

- `POINT`: `{ x: number, y: number }`
- `CIRCLE`: `{ x: number, y: number, radius: number }`
- `LINE`: `[{ x: number, y: number }, ...]` (2+ points, cannot begin & end with the same point)
- `POLYGON`: `[{ x: number, y: number }, ...]` (first & last point must be the same)
- `MULTIPOLYGON`: `[ [{ x: number, y: number }, ...], ...]` (array of polygons)
- `MULTILINE`: `[ [{ x: number, y: number }, ...], ...]` (array of lines)

### Examples

```ts
import { convertShapeToSql } from 'knex-spatial-plugin';

convertShapeToSql({ lat: 39.87, lon: -104.128 }); // => 'POINT(-104.128, 39.87)'::geography
convertShapeToSql({ lat: 39.87, lon: -104.128, srid: 4326 }); // => 'SRID=4326;POINT(-104.128, 39.87)'::geography
convertShapeToSql({ x: 39.87, y: -104.128 }); // => 'POINT(-104.128, 39.87)'::geometry
convertShapeToSql({ lat: 39.87, lon: -104.128, radius: 1000 }); // => ST_Buffer('POINT(-104.128, 39.87)'::geography, 1000)

convertShapeToSql([{ lat: 39.87, lon: -104.128 }, { lat: 39.87, lon: -104.128 }]); // => 'LINESTRING(-104.128 39.87, -104.128 39.87)'::geography
```

## Powerful Syntax Builder API

- Supports any form of SQL Function.
- Supports aggregate functions like `Count()`, `Min()`, and `Sum()`.
  - `builder('COUNT').arg('id').wrap('min')` => `min(COUNT('id'))`
- Auto-magically converts natural language measurements into the correct unit.
  - Works for both input values (Desired unit -> Base unit) and for output expressions (Base unit -> Desired unit.)
  - `5 miles` => `8046.72` (meters)
  - `builder('ST_Length').arg('a_line_string').unit('acres')` => `ST_Length('a_line_string') / 4046.86`
- Auto-magically converts JS objects into WKT (Well-Known Text) strings. `{x: 1, y: 2}` => `POINT(1 2)`

```ts
import {sqlFunctionBuilder} from 'knex-spatial-plugin';

const builder = sqlFunctionBuilder(db);

builder('ST_Distance')
  .arg('point')
  .arg({lat: 39.87, lon: -104.128})
  .alias('distance')
  .build();
// => ST_Distance("point", ST_Point(-104.128, 39.87)) AS "distance"

builder('ST_DWithin')
  .arg('polygon_column')
  .arg({lat: 39.87, lon: -104.128})
  .arg('5 miles')
  .build();
// => ST_DWithin("polygon_column", ST_Point(-104.128, 39.87), 8046.72)
```

See the [tests for more examples.](./src/utils/functionBuilder.test.ts)

## References

- [PostGIS Reference](https://postgis.net/docs/ST_Distance.html)
- [Knex Query Builder](https://knexjs.org/#Builder)

## TODO

- [ ] Add Schema Builder methods
- [x] Add tests
- [x] Add more methods.
- [x] Add more docs
- [x] Add more examples
- [x] Build simple WKT Builder (tried using [`knex-postgis`](https://github.com/jfgodoy/knex-postgis), too verbose.)
