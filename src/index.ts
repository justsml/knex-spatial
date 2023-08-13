import "knex";
import { Knex, knex } from "knex";
import { convertShapeToSql, isCoordinatesDefined } from "./shapeUtils";
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
export default function KnexSpatialPlugin(db: Knex, defaultSRID = 4326) {
  try {
    knex.QueryBuilder.extend(
      "selectDistance",
      function selectDistance(
        geoColumnName: string,
        inputShape: ShapeSimple,
        columnAlias = "distance"
      ) {

        return !isCoordinatesDefined(inputShape)
          ? this
          : this.select(
              db.raw(`ST_Distance(??, ${convertShapeToSql(inputShape)}) / 1609.34 AS ??`, [
                geoColumnName,
                columnAlias,
              ])
            );
      }
    );

    knex.QueryBuilder.extend(
      "whereDistanceWithin",
      function whereDistanceWithin(
        geoColumnName: string,
        inputShape: ShapeSimple,
        radius: number
      ) {
        
        return !isCoordinatesDefined(inputShape)
          ? this
          : this.whereRaw(`ST_DWithin(??, ${convertShapeToSql(inputShape)}, ?)`, [
              geoColumnName,
              radius,
            ]);
      }
    );
  } catch (error) {
    /* c8 ignore next 3 */
    if (error.message.includes("Can't extend")) return db;
    throw error;
  }
  return db;
}

declare module "knex" {
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
        inputShape: ShapeSimple,
        columnAlias?: string
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
        inputShape: ShapeSimple,
        radius: number
      ): QueryBuilder<TRecord, TResult>;

      /**
       * Spatial: Filters results outside a given distance in meters.
       *
       * Uses the `ST_Distance` function.
       *
       * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
       */
      whereDistance(
        geoColumnName: string,
        latLonOpts: ExplicitShape
      ): QueryBuilder<TRecord, TResult>;

      /**
       * ST_Equals - Returns TRUE if the given column Geometries are "spatially equal".
       *
       */
      whereEquals(
        geoColumnName: string,
        opts: ExplicitShape
      ): QueryBuilder<TRecord, TResult>;

      /**
       * ST_Disjoint - Returns TRUE if the Geometries do not "spatially intersect".
       * For geography -- tolerance is 0.00001 meters (so any points that close are considered to intersect)
       * For geometry -- tolerance is 0 (must intersect in 1st place)
       * @param geoColumnName
       * @param opts
       * @returns
        */
      whereDisjoint(
        geoColumnName: string,
        opts: ExplicitShape
      ): QueryBuilder<TRecord, TResult>;

      /**
       * ST_Touches - Returns TRUE if the given Geometries "spatially touch". 
       * (i.e. share a common boundary point, but no interior points).
       * 
       */
      whereTouches(
        geoColumnName: string,
        opts: ExplicitShape
      ): QueryBuilder<TRecord, TResult>;

      /**
       * ST_Within - Returns TRUE if the geometry A is completely inside geometry B
       * 
       */
      whereWithin(
        geoColumnName: string,
        opts: ExplicitShape
      ): QueryBuilder<TRecord, TResult>;

        
    }
  }
}

/*
| Equals | Equals( geom1 Geometry , geom2 Geometry ) : Integer ST_Equals( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments. TRUE if g1 and g2 are equal |
| Disjoint | Disjoint( geom1 Geometry , geom2 Geometry ) : Integer ST_Disjoint( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments. TRUE if the intersection of g1 and g2 is the empty set |
| Touches | Touches( geom1 Geometry , geom2 Geometry ) : Integer ST_Touches( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments. TRUE if the only Points in common between g1 and g2 lie in the union of the boundaries of g1 and g2 |
| Within | Within( geom1 Geometry , geom2 Geometry ) : Integer ST_Within( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments. TRUE if g1 is completely contained in g2 |
| Overlaps | Overlaps( geom1 Geometry , geom2 Geometry ) : Integer ST_Overlaps( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments. TRUE if the intersection of g1 and g2 results in a value of the same dimension as g1 and g2 that is different from both g1 and g2 |
| Crosses | Crosses( geom1 Geometry , geom2 Geometry ) : Integer ST_Crosses( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments. TRUE if the intersection of g1 and g2 results in a value whose dimension is less than the maximum dimension of g1 and g2 and the intersection value includes Points interior to both g1 and g2, and the intersection value is not equal to either g1 or g2 |
| Intersects | Intersects( geom1 Geometry , geom2 Geometry ) : Integer ST_Intersects( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments; convenience predicate: TRUE if the intersection of g1 and g2 is not empty |
| Contains | Contains( geom1 Geometry , geom2 Geometry ) : Integer ST_Contains( geom1 Geometry , geom2 Geometry ) : Integer | X | GEOS | The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments; convenience predicate: TRUE if g2 is completely contained in g1 |
| Relate | OGC canonical signature Relate( geom1 Geometry , geom2 Geometry , patternMatrix String ) : Integer ST_Relate( geom1 Geometry , geom2 Geometry , patternMatrix Text ) : Integer | X | GEOS | For more informations about patternMatrix interpretation please read: DE-9IM The return type is Integer, with a return value of 1 for TRUE, 0 for FALSE, and –1 for UNKNOWN when called with NULL arguments; returns TRUE if the spatial relationship specified by the patternMatrix holds. |
| Intersection | Intersection( geom1 Geometry , geom2 Geometry ) : Geometry ST_Intersection( geom1 Geometry , geom2 Geometry ) : Geometry | X | GEOS | return a geometric object that is the intersection of geometric objects geom1 and geom2 |
| Difference | Difference( geom1 Geometry , geom2 Geometry ) : Geometry ST_Difference( geom1 Geometry , geom2 Geometry ) : Geometry | X | GEOS | return a geometric object that is the closure of the set difference of geom1 and geom2 |
| Union | ST_Union( geom1 Geometry , geom2 Geometry ) : Geometry  | X | GEOS | return a geometric object that is the set union of geom1 and geom2. OpenGis name for this function is Union(), but it conflicts with an SQLite reserved keyword|
| Buffer | Buffer( geom Geometry , dist Double precision [ , quadrantsegments Integer ] ) : Geometry ST_Buffer( geom Geometry , dist Double precision [ , quadrantsegments Integer ] ) : Geometry | X | GEOS | return a geometric object defined by buffering a distance around the geom, where dist is in the distance units for the Spatial Reference of geom. the optional quadrantsegments argument specifies the number of segments used to approximate a quarter circle (default is 30). |
| ConvexHull | ConvexHull( geom Geometry ) : Geometry ST_ConvexHull( geom Geometry ) : Geometry | X | GEOS | return a geometric object that is the convex hull of geom |
*/
// | SymDifference | SymDifference( geom1 Geometry , geom2 Geometry ) : Geometry ST_SymDifference( geom1 Geometry , geom2 Geometry ) : Geometry | X | GEOS | return a geometric object that is the closure of the set symmetric difference of geom1 and geom2 (logical XOR of space) |

/*
Add `selectEquals` and `whereEquals` method using ST_Equals
Add `selectDisjoint` and `whereDisjoint` method using ST_Disjoint
Add `selectTouches` and `whereTouches` method using ST_Touches
Add `selectWithin` and `whereWithin` method using ST_Within
Add `selectOverlaps` and `whereOverlaps` method using ST_Overlaps
Add `selectCrosses` and `whereCrosses` method using ST_Crosses
Add `selectIntersects` and `whereIntersects` method using ST_Intersects
Add `selectContains` and `whereContains` method using ST_Contains
Add `selectRelate` and `whereRelate` method using ST_Relate
Add `selectIntersection` and `whereIntersection` method using ST_Intersection
Add `selectDifference` and `whereDifference` method using ST_Difference
Add `selectUnion` and `whereUnion` method using ST_Union
Add `selectBuffer` and `whereBuffer` method using ST_Buffer
Add `selectConvexHull` and `whereConvexHull` method using ST_ConvexHull
*/