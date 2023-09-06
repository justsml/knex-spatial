# Knex Spatial Plugin

[![CI Status](https://github.com/justsml/knex-spatial/workflows/tests/badge.svg)](https://github.com/justsml/knex-spatial/actions)
[![NPM version](https://img.shields.io/npm/v/knex-spatial-plugin.svg)](https://www.npmjs.com/package/knex-spatial-plugin)
[![GitHub stars](https://img.shields.io/github/stars/justsml/knex-spatial.svg?style=social)](https://github.com/justsml/knex-spatial)

A Knex plugin for easy operations on geometric & geospatial data in Postgres.

Featuring a fluent, expressive and natural API design.

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
  - [`convertShapeToSql` Usage](#convertshapetosql-usage)
  - [Shape Object Syntax Examples](#shape-object-syntax-examples)
  - [Geography Shapes in JSON](#geography-shapes-in-json)
- [SQL Function Syntax Builder API](#sql-function-syntax-builder-api)
  - [`sqlFunctionBuilder`](#sqlfunctionbuilder)
  - [Example](#example)
  - [Knex Query Builder Example](#knex-query-builder-example)
- [References](#references)
- [TODO](#todo)
- [Dev Notes](#dev-notes)
  - [Unit Helpers](#unit-helpers)

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
import { db } from './knex';

export function findNearbyLocations({ lat, lon }) {
  // Get locations within 10Km of input location, **including** the distance in the results
  return db('locations')
    .select('id', 'name')
    .selectDistance('location', { lat, lon })
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

```tsv
id  name    distance
1   Denver  0
2   Boulder 38.5
```

Uses the `ST_Distance` & `ST_DWithin` function.

**Note:** Intelligently handles `undefined` lat & lon values by returning the query without modification.

```ts
export function findNearbyLocations({ lat, lon }) {
  // Get locations within 10Km of input location, without including the distance in the results
  return db('locations')
    .select('id', 'name')
    .whereDistanceWithin('location', { lat, lon, radius: 10000 });
}
```

### `selectArea`

```ts
db('world_countries')
  .select('country_name')
  .selectArea('country_border', 'area_in_meters');
// SELECT "country_name",
//   ST_Area("country_border") AS "area_in_meters"
// FROM "world_countries";
```

| `country_name` | `area_in_meters`  |
| -------------- | ----------------- |
| England        | 130,279,000,000   |
| Ireland        | 70,278,000,000    |
| South Africa   | 1,221,037,630,000 |
| United States  | 9,147,420,000,000 |

```ts
db('world_countries')
  .select('country_name')
  .selectArea('country_border', 'area_in_km2', 'kilometers');
// SELECT "country_name",
//   ST_Area("country_border") / 1000 AS "area_in_km2"
// FROM "world_countries";
```

| `country_name` | `area_in_km2` |
| -------------- | ------------- |
| England        | 130,279,000   |
| Ireland        | 70,278,000    |
| South Africa   | 1,221,037,630 |
| United States  | 9,147,420,000 |

```ts
db('world_countries')
  .select('country_name')
  .selectArea('country_border', 'area_in_miles', 'miles')
  .orderBy('area_in_miles', 'desc');

// SELECT "country_name",
//   ST_Area("country_border") / 1609.344 AS "area_in_miles"
// FROM "world_countries"
// ORDER BY "area_in_miles" DESC;
```

| `country_name` | `area_in_miles` |
| -------------- | --------------- |
| United States  | 5,650,000       |
| South Africa   | 754,000         |
| England        | 80,700.8        |
| Ireland        | 43,500.5        |

### `selectCentroid`

```ts
db('world_countries')
  .select('country_name')
  .selectCentroid('country_border', 'centroid');
// SELECT "country_name",
//   ST_Centroid("country_border") AS "centroid"
// FROM "world_countries";
```

| `country_name` | `centroid`                     |
| -------------- | ------------------------------ |
| England        | `POINT(-1.474054 52.795479)`   |
| Ireland        | `POINT(-8.137935 53.175503)`   |
| South Africa   | `POINT(25.083901 -29.000341)`  |
| United States  | `POINT(-112.599438 45.705628)` |

### `selectConvexHull`

```ts
db('world_countries')
  .select('country_name')
  .selectConvexHull('country_border', 'convex_hull');
// SELECT "country_name",
//   ST_ConvexHull("country_border") AS "convex_hull"
// FROM "world_countries";
```

| `country_name` | `convex_hull`                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| England        | `POLYGON((-5.270157 50.056137,-5.270157 55.811741,1.762726 55.811741,1.762726 50.056137,-5.270157 50.056137))`           |
| Ireland        | `POLYGON((-10.4786 51.4457,-10.4786 55.3878,-5.3319 55.3878,-5.3319 51.4457,-10.4786 51.4457))`                          |
| South Africa   | `POLYGON((16.344976 -34.819168,16.344976 -22.125026,32.895474 -22.125026,32.895474 -34.819168,16.344976 -34.819168))`    |
| United States  | `POLYGON((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967))` |

### `selectDifference`

```ts
db('world_countries')
  .select('country_name')
  .selectDifference(
    'country_border',
    { lat: 39.87, lon: -104.128, radius: '10mi' },
    'difference',
  )
  .where({ country_name: 'United States' });
// SELECT "country_name",
//   ST_Difference("country_border", ST_Buffer('Point(-104.128, 39.87)'::geography, 10 * 1609.344)) AS "difference"
// FROM "world_countries"
// WHERE "country_name" = 'United States';
```

| `country_name` | `difference`                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| United States  | `MULTIPOLYGON(((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967)))` |

### `selectIntersection`

```ts
db('world_countries')
  .select('country_name')
  .selectIntersection(
    'country_border',
    { lat: 39.87, lon: -104.128, radius: '10mi' },
    'intersection',
  )
  .where({ country_name: 'United States' });
// SELECT "country_name",
//   ST_Intersection("country_border", ST_Buffer('Point(-104.128, 39.87)'::geography, 10 * 1609.344)) AS "intersection"
// FROM "world_countries"
// WHERE "country_name" = 'United States';
```

| `country_name` | `intersection`                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| United States  | `MULTIPOLYGON(((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967)))` |

### `selectEnvelope`

```ts
db('world_countries')
  .select('country_name')
  .selectEnvelope('country_border', 'envelope');
// SELECT "country_name",
//   ST_Envelope("country_border") AS "envelope"
// FROM "world_countries";
```

| `country_name` | `envelope`                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| England        | `POLYGON((-5.270157 50.056137,-5.270157 55.811741,1.762726 55.811741,1.762726 50.056137,-5.270157 50.056137))`           |
| Ireland        | `POLYGON((-10.4786 51.4457,-10.4786 55.3878,-5.3319 55.3878,-5.3319 51.4457,-10.4786 51.4457))`                          |
| South Africa   | `POLYGON((16.344976 -34.819168,16.344976 -22.125026,32.895474 -22.125026,32.895474 -34.819168,16.344976 -34.819168))`    |
| United States  | `POLYGON((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967))` |

### `selectLength`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_miles', 'miles');
// SELECT "country_name",
//   ST_Length("country_border") / 1609.344 AS "border_in_miles"
// FROM "world_countries";
```

| `country_name` | `border_in_miles` |
| -------------- | ----------------- |
| England        | 2,795             |
| Ireland        | 2,000             |
| South Africa   | 4,000             |
| United States  | 13,000            |

### `selectSymDifference`

```ts
db('world_countries')
  .select('country_name')
  .selectSymDifference(
    'country_border',
    { lat: 39.87, lon: -104.128, radius: '10mi' },
    'sym_difference',
  )
  .where({ country_name: 'United States' });
// SELECT "country_name",
//   ST_SymDifference("country_border", ST_Buffer('Point(-104.128, 39.87)'::geography, 10 * 1609.344)) AS "sym_difference"
// FROM "world_countries"
// WHERE "country_name" = 'United States';
```

| `country_name` | `sym_difference`                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| United States  | `MULTIPOLYGON(((-124.731422 24.955967,-124.731422 49.371735,-66.969849 49.371735,-66.969849 24.955967,-124.731422 24.955967)))` |

### `selectUnion`

```ts
db('world_countries')
  .select('country_name')
  .selectUnion(
    'country_border',
    [
      { lat: 39.87, lon: -104.128 },
      { lat: 39.17, lon: -104.92 },
      { lat: 39.25, lon: -105.01 },
      { lat: 39.87, lon: -104.128 },
    ],
    'union',
  )
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
//   ST_Length("country_border") / 1609.344 AS "border_in_miles"
// FROM "world_countries"
// WHERE ST_Contains("country_border", ST_Point(-104.128, 39.87));
```

| `country_name` | `border_in_miles` |
| -------------- | ----------------- |
| United States  | 13,000            |

### `whereContainsProperly`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereContainsProperly('country_border', { lat: -1.474054, lon: 52.795479, radius: '1km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_ContainsProperly("country_border", ST_Buffer('Point(-1.474054, 52.795479)'::geography, 1000));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| England        | 2,795          |

### `whereCovers`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereCovers('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Covers("country_border", ST_Point(-104.128, 39.87));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereCoveredBy`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereCoveredBy('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_CoveredBy("country_border", ST_Point(-104.128, 39.87));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereCrosses`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereCrosses('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Crosses("country_border", ST_Point(-104.128, 39.87));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereDisjoint`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereDisjoint('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Disjoint("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| England        | 2,795          |
| Ireland        | 2,000          |
| United States  | 13,000         |

### `whereEquals`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereEquals('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Equals("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereIntersects`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereIntersects('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Intersects("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereOverlaps`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereOverlaps('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Overlaps("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereRelate`

```ts
db('world_countries')
  .select('country_name')
  .whereRelate(
    'country_border',
    { lat: -26.2041, lon: 28.0473, radius: '10km' },
    'nineElementMatrix',
  );
// SELECT "country_name",
// FROM "world_countries"
// WHERE ST_Relate("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

| `country_name` |
| -------------- |
| South Africa   |

### `whereTouches`

```ts
db('world_countries')
  .select('country_name')
  .selectLength('country_border', 'border_in_km', 'kilometers');
  .whereTouches('country_border', { lat: -26.2041, lon: 28.0473, radius: '10km' })
// SELECT "country_name",
//   ST_Length("country_border") / 1000 AS "border_in_km"
// FROM "world_countries"
// WHERE ST_Touches("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 10000));
```

| `country_name` | `border_in_km` |
| -------------- | -------------- |
| South Africa   | 4,000          |

### `whereWithin`

```ts
db('world_countries').select('country_name').whereWithin('country_border', {
  lat: -26.2041,
  lon: 28.0473,
  radius: '100km',
});
// SELECT "country_name",
// FROM "world_countries"
// WHERE ST_Within("country_border", ST_Buffer('Point(-26.2041, 28.0473)'::geography, 100 * 1000));
```

| `country_name` |
| -------------- |
| South Africa   |

## Expressive Shape API

`Knex-Spatial` makes it easy to define shapes **using plain JS objects**.

All methods that accept a shape argument can be passed a JS object, and it will be converted to the correct SQL syntax.

If you want to stand-alone convert a shape to SQL, you can do so using the helper method `convertShapeToSql`. (**Note:** Advanced use-case.)

### `convertShapeToSql` Usage

```ts
import { convertShapeToSql } from 'knex-spatial-plugin';

convertShapeToSql({ lat: 39.87, lon: -104.128 });
// => 'POINT(-104.128 39.87)'::geography
```

### Shape Object Syntax Examples

```ts
{ lat: 39.87, lon: -104.128, srid: 4326 }
// => 'SRID=4326;POINT(-104.128 39.87)'::geography
{ x: 39.87, y: -104.128 }
// => 'POINT(-104.128 39.87)'::geometry
{ lat: 39.87, lon: -104.128, radius: 1000 }
// => ST_Buffer('POINT(-104.128 39.87)'::geography, 1000)
{ lat: 39.87, lon: -104.128, radius: '1.5 mile' }
// => ST_Buffer('POINT(-104.128 39.87)'::geography, 1.5 * 1609.344)
[{ lat: 39.87, lon: -104.128 }, { lat: 39.87, lon: -104.128 }]
// => 'LINESTRING(-104.128 39.87, -104.128 39.87)'::geography
[{ lat: 39.87, lon: -104.128 }, { lat: 39.87, lon: -104.128 }, { lat: 39.87, lon: -104.128 }]
// => 'POLYGON((-104.128 39.87, -104.128 39.87, -104.128 39.87))'::geography
```

### Geography Shapes in JSON

**Note:** For _geometry_ shapes, use the `x` & `y` properties instead of `lat` & `lon` (as with _geography_.)

- `POINT`: `{ lat: number, lon: number }`
- `CIRCLE`: `{ lat: number, lon: number, radius: number }`
- `LINE`: `[{ lat: number, lon: number }, ...]` (2+ points, cannot begin & end with the same point)
- `POLYGON`: `[{ lat: number, lon: number }, ...]` (first & last point must be the same)
- `MULTIPOLYGON`: `[ [{ lat: number, lon: number }, ...], ...]` (array of polygons)
- `MULTILINE`: `[ [{ lat: number, lon: number }, ...], ...]` (array of lines)

## SQL Function Syntax Builder API

`Knex-Spatial` provides a powerful SQL syntax builder API. It's designed to keep ORM code as simple & similar to SQL as possible.

### `sqlFunctionBuilder`

- Supports any form of SQL Function.
- Supports aggregate functions like `Count()`, `Min()`, and `Sum()`.
  - `builder('COUNT').arg('id').wrap('min')` => `min(COUNT('id'))`
- Auto-magically converts natural language measurements into the correct unit.
  - Works for both input values (Desired unit -> Base unit) and for output expressions (Base unit -> Desired unit.)
  - `5 miles` => `8046.72` (meters)
  - `builder('ST_Length').arg('a_line_string').unit('acres')` => `ST_Length('a_line_string') / 4046.86`
- Auto-magically converts JS objects into WKT (Well-Known Text) strings. `{x: 1, y: 2}` => `POINT(1 2)`

### Example

```ts
import { sqlFunctionBuilder } from 'knex-spatial-plugin';

const sqlFn = sqlFunctionBuilder(db);

sqlFn('ST_Distance')
  .arg('point')
  .arg({ lat: 39.87, lon: -104.128 })
  .alias('distance')
  .build();
// => ST_Distance("point", 'Point(-104.128 39.87)'::geography) AS "distance"

sqlFn('ST_DWithin')
  .arg('polygon_column')
  .arg({ lat: 39.87, lon: -104.128 })
  .arg('5 miles')
  .toString(); // Alias for .build()
// => ST_DWithin("polygon_column", 'Point(-104.128 39.87)'::geography, 5 * 1609.344)
```

### Knex Query Builder Example

Use the `sqlFunctionBuilder`'s native `Knex.Raw` support to easily build complex SQL expressions:

```ts
db('locations')
  .select('name')
  .select(
    sqlFn('ST_Distance')
      .arg('location')
      .arg({ lat: 39.87, lon: -104.128 })
      .alias('distance')
      .unit('miles')
      .toRaw(),
  )
  .where(
    sqlFn('ST_DWithin')
      .arg('location')
      .arg({ lat: 39.87, lon: -104.128 })
      .arg('65 miles')
      .toRaw(),
  )
  .orderBy('distance');
// SELECT "name",
//   ST_Distance("location", 'Point(-104.128 39.87)'::geography) / 1609.344 AS "distance"
// FROM "locations"
// WHERE ST_DWithin("location", 'Point(-104.128 39.87)'::geography, 5 * 1609.344)
// ORDER BY "distance" ASC
```

| `name`           | `distance` |
| ---------------- | ---------- |
| Denver           | 0          |
| Boulder          | 38.5       |
| Colorado Springs | 60.5       |

```ts
db('locations')
  .select('name')
  .select(sqlFn('ST_Y').arg('location').alias('latY').toRaw())
  .select(sqlFn('ST_X').arg('location').alias('lonX').toRaw());
// SELECT "name",
//   ST_Y("location") AS "latY",
//   ST_X("location") AS "lonX"
// FROM "locations";
```

| `name`       | `latY`   | `lonX`   |
| ------------ | -------- | -------- |
| Denver       | 39.87    | -104.128 |
| Las Vegas    | 36.17    | -115.14  |
| Johannesburg | -26.2041 | 28.0473  |
| Dublin       | 53.3498  | -6.2603  |
| London       | 51.5074  | -0.1278  |
| D.C.         | 38.9072  | -77.0369 |

See the [tests for more examples.](./src/utils/functionBuilder.test.ts)

## References

- [PostGIS Reference](https://postgis.net/docs/ST_Distance.html)
- [Knex Query Builder](https://knexjs.org/#Builder)

## TODO

- [ ] Add Schema Builder methods
- [ ] Convert 'legacy' syntax builder code to use `sqlFunctionBuilder`.
- [x] Add tests
- [x] Add more methods.
- [x] Add more docs
- [x] Add more examples
- [x] Intuitive Shape Builder (tried using [`knex-postgis`](https://github.com/jfgodoy/knex-postgis), verbose like SQL syntax.)
- [ ] Add 'transformer' wrapper fn support for `ST_AsText`, `ST_asGeoJSON`, `ST_AsEWKT`. (Include `ST_AsBinary`?)

## Dev Notes

This project evolved from a narrowly scoped helper - with these initial goals:

- **_Find nearby things, sort by distance._**
- Follow Knex' API design as closely as possible (builder AKA chainable methods)
- Use natural language for measurements (e.g. `5 miles` instead of `8046.72` meters)

After some initial positive feedback, I got asked to support all the PostGIS methods.
There were 2 divergent paths I could take:

1. Focus on flexible & fluent support for "common" cases.
   - For example, a buffered version of a shape column: `.selectBuffer('area', '0.1km')`
   - Add computed distance to `SELECT`: `.selectDistance('location', { lat, lon })`
   - Filter by distance `WHERE`: `.whereDistanceWithin('location', { lat, lon, radius: '10km' })`
   - Cons: This limits nested or fancy expression patterns.
2. Build one standalone module meant to plug wherever `knex` `raw` is supported - somewhat like `knex-postgis`' design.
   - Then afterward add `.select*()` and `.where*()` style-helpers.
   - A funny thing happened on the way to building #1, I realized I needed a SQL function builder anyway.

Turns out my attempt at a shortcut - by building a SQL fragment/template-based approach - was a little shortsighted. I ended up building an [SQL builder anyway.](./src/utils/functionBuilder.ts) Might include `knex-postgis` after all... TBD.

| So, why didn't you build on top of `knex-postgis`?

I may still do so.

**For now, I prioritized a fluent API over 1:1 SQL syntax support.**

I really enjoy Knex' API design, and I wanted to extend it in such a way that - dare I say - improved on native SQL OGC syntax. (It appears `knex-postgis` primary goal is supporting SQL syntax faithfully 1:1, which they do fabulously.)

I looked into extending their API so you could chain things in a possibly friendlier way. It felt like I was compromising their API design goals.

```ts
// To generate: ST_AsText(ST_Centroid('geom'))
// knex-postgis API is very close to the SQL it represents 1:1
st.asText(st.centroid('geom'))
  // However, I'd prefer a more 'fluent' API extended into knex.
  .selectCentroid('geom', 'ST_AsText');
// Perhaps using `functionBuilder` like so:
builder('ST_Centroid').arg('geom').wrap('ST_asText');
```

```ts
// Compare the knex-postgis example:
let q = db
  .select('id', st.asText(st.centroid('geom')).as('centroid'))
  .from('geometries');
q = db
   .select('id')
   .selectCentroid('geom', 'asText')
   .from('geometries');

// => SELECT "id", ST_AsText(ST_Centroid("geom")) AS "centroid" FROM "geometries"
st.geomFromText('Point(0 0)', 4326);
```

### Unit Helpers

As for the helpers around `units`, some notes:

- Yes, I am aware units is a far more complicated topic than this. I don't personally care about historical or nautical units, I just want to be able to use natural language for common measurements. (PRs welcome of course.)
- I had trouble using the most popular units conversion library on NPM. One thing I was initially trying to handle was European denoted numbers, like `1.234.567,12 km` (swapped comma & decimal points.) I decided locale support was out of scope - at least until v3.
