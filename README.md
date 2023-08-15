# Knex Spatial Plugin

[![CI Status](https://github.com/justsml/knex-spatial/workflows/tests/badge.svg)](https://github.com/justsml/knex-spatial/actions)
[![NPM version](https://img.shields.io/npm/v/knex-spatial-plugin.svg)](https://www.npmjs.com/package/knex-spatial-plugin)
[![GitHub stars](https://img.shields.io/github/stars/justsml/knex-spatial.svg?style=social)](https://github.com/justsml/knex-spatial)

A Knex plugin for easy operations on geometric & geospatial data in Postgres.

A fluent, expressive and natural API design.

- Auto-complete-friendly builder for common geometry & geography shapes.
- `select*` and `where*` prefixed methods simplify common operations.

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
select
    "id",
    "name",
    ST_Distance ("location", ST_Point (-104.128, 39.87)) / 1609.34 AS "distance"
from
    "locations"
where
    "distance" < 10000
order by
    "distance" asc
```

```tsv
id  name    distance
1   Denver  0
2   Boulder 38.5
```

### `whereDistance`

Include results within a given radius in meters.

Uses the `ST_Distance` & `ST_DWithin` function.

**Note:** Intelligently handles `undefined` lat & lon values by returning the query without modification.

```ts
import {db} from './knex';

export function findNearbyLocations({lat, lon}) {
  // Get locations within 10Km of input location, without including the distance in the results
  return db('locations')
    .select('id', 'name')
    .whereDistanceWithin('location', { lat, lon, radius: 10000 })
}
```

```sql
select
    "id",
    "name"
from
    "locations"
where
    "distance" < 10000
```

```tsv
id  name
1   Denver
2   Boulder
```

## References

- [PostGIS Reference](https://postgis.net/docs/ST_Distance.html)
- [Knex Query Builder](https://knexjs.org/#Builder)

## TODO

- [ ] Add tests
- [ ] Add more methods
  - [ ] Build simple WKT Builder (tried using [`knex-postgis`](https://github.com/jfgodoy/knex-postgis), too verbose.)
- [ ] Add more docs
- [ ] Add more examples
