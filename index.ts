import 'knex';
import { Knex, knex } from 'knex';

/**
 * # Knex Geospatial Plugin
 *
 * This plugin adds some useful methods to the knex query builder.
 *
 * ## Usage
 *
 * ```ts
 * import Knex from 'knex';
 * import KnexSpatialPlugin from 'knex-spatial-plugin';
 *
 * export const db = Knex(config);
 * KnexSpatialPlugin(db);
 * ```
 * 
 * ## Methods
 * 
 * ### `selectDistance`
 * 
 * Add a computed column, `distance` (in meters) based off a given lat & lon.
 * 
 * Uses the `ST_Distance` function.
 * 
 * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
 * 
 * ```ts
 * import {db} from './knex';
 * 
 * export function findNearbyLocations({lat, lon}) {
 *   // Get locations within 10Km of input location
 *   return db('locations')
 *     .select('id', 'name')
 *     .selectDistance('location', { lat, lon })
 *     .where('distance', '<', 10000)
 * }
 * ```
 * 
 * ### `whereDistanceWithin`
 * 
 * Spatial: Filters results outside a given radius in meters.
 * 
 * Uses the `ST_DWithin` function.
 * 
 * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
 * 
 * ```ts
 * import {db} from './knex';
 * 
 * export function findNearbyLocations({lat, lon}) {
 *  // Get locations within 10Km of input location
 * return db('locations')
 *  .select('id', 'name')
 * .whereDistanceWithin('location', { lat, lon, radius: 10000 })
 * }
 * ```
 * 
 * ## References
 * 
 * - [PostGIS Reference](https://postgis.net/docs/ST_Distance.html)
 * - [Knex Query Builder](https://knexjs.org/#Builder)
 */
export default function knexGeospatial(db: Knex) {
  try {
    knex.QueryBuilder.extend(
      'selectDistance',
      function selectDistance(
        geoColumnName: string,
        latLonOpts: { lat: number | undefined; lon: number | undefined },
        columnAlias = 'distance',
      ) {
        const { lat, lon } = latLonOpts;
  
        return lat === undefined || lon === undefined
          ? this
          : this.select(
              db.raw('ST_Distance(??, ST_Point(?, ?)) / 1609.34 AS ??', [
                geoColumnName,
                lon,
                lat,
                columnAlias,
              ]),
            );
      },
    );
  
    knex.QueryBuilder.extend(
      'whereDistanceWith',
      function whereDistanceWith(
        geoColumnName: string,
        latLonOpts: {
          lat?: number | undefined;
          lon?: number | undefined;
          radius?: number | undefined;
        } = {},
      ) {
        const { lat, lon, radius } = latLonOpts;
  
        return lat === undefined || lon === undefined || radius === undefined
          ? this
          : this.whereRaw(`ST_DWithin(??, ST_Point(?, ?), ?)`, [
              geoColumnName,
              lon,
              lat,
              radius,
            ]);
      },
    );

  } catch (error) {
    console.error(error);
  }

  return db;
}

declare module 'knex' {
  namespace Knex {
    export interface QueryInterface<TRecord extends {} = any, TResult = any> {

      /**
       * Add a computed column, `distance` (in meters) based off a given lat & lon.
       *
       * Uses the `ST_Distance` function.
       * 
       * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
       */
      selectDistance(
        geoColumnName: string,
        latLonOpts: { lat: number | undefined; lon: number | undefined },
        columnAlias?: string,
      ): QueryBuilder<TRecord, TResult>;

      /**
       * Spatial: Filters results outside a given radius in meters.
       * 
       * Uses the `ST_DWithin` function.
       * 
       * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
       */
      whereDistanceWithin(
        geoColumnName: string,
        latLonOpts: {
          lat: number | undefined;
          lon: number | undefined;
          radius: number | undefined;
        },
      ): QueryBuilder<TRecord, TResult>;
    }
  }
}