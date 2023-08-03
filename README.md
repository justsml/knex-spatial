# Knex Spatial Plugin

A Knex plugin for easy operations on geometric & geospatial data in Postgres.

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
}
```

### `whereDistanceWithin`

Include only results within a given radius in meters.

Uses the `ST_DWithin` function.

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

## References

- [PostGIS Reference](https://postgis.net/docs/ST_Distance.html)
- [Knex Query Builder](https://knexjs.org/#Builder)
