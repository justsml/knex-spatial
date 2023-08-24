import 'knex';
import { Knex, knex } from 'knex';
import {
  convertShapeToSql,
  isCircle,
  isValidGeography,
  isValidGeometry,
  isValidShape,
  isValidPoint,
  parseShapeOrColumnToSafeSql,
} from './shapeUtils';

let _db: Knex;
let _options: PluginOptions;

type PluginOptions = {
  throwOnUndefined?: boolean;
};

export default function KnexSpatialPlugin(
  db: Knex,
  options: PluginOptions = {},
) {
  _db = db;
  _options = options;
  try {
    knex.QueryBuilder.extend('selectDistance', selectDistance);
    knex.QueryBuilder.extend('selectBuffer', selectBuffer);
    knex.QueryBuilder.extend('selectIntersection', selectIntersection);
    knex.QueryBuilder.extend('whereDistanceWithin', whereDistanceWithin);
    knex.QueryBuilder.extend('whereDistance', whereDistance);
    knex.QueryBuilder.extend('whereWithin', whereWithin);
    knex.QueryBuilder.extend('whereTouches', whereTouches);
    knex.QueryBuilder.extend('whereContains', whereContains);
    knex.QueryBuilder.extend('whereContainsProperly', whereContainsProperly);
    knex.QueryBuilder.extend('whereCoveredBy', whereCoveredBy);
    knex.QueryBuilder.extend('whereCovers', whereCovers);
    knex.QueryBuilder.extend('whereDisjoint', whereDisjoint);
    knex.QueryBuilder.extend('whereEquals', whereEquals);
    knex.QueryBuilder.extend('whereOverlaps', whereOverlaps);
    knex.QueryBuilder.extend('whereCrosses', whereCrosses);
    knex.QueryBuilder.extend('whereIntersects', whereIntersects);
    knex.QueryBuilder.extend('whereRelateMatch', whereRelateMatch);
  } catch (error) {
    /* c8 ignore next 3 */
    if (error.message.includes(`Can't extend`)) return db;
    throw error;
  }
  return db;
}

/**
 * Expresses a where clause that compares the spatial relationship between two Geometries.
 *
 * @param methodName - a GIS method name (https://postgis.net/docs/manual-3.4/reference.html#idm12252)
 * @returns
 */
const wherePredicateWrapper = (methodName: string) =>
  function whereHelper<
    TRecord extends {} = any,
    TResult extends {} = unknown[],
  >(
    this: Knex.QueryBuilder<TRecord, TResult>,
    leftShapeOrColumn: ShapeOrColumn,
    rightShapeOrColumn: ShapeOrColumn,
  ): Knex.QueryBuilder<TRecord, TResult> {
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs) return this;

    return this.whereRaw(`${methodName}(${lhs}, ${rhs})`);
  };

/**
 * Expresses a where clause that applies an operator against a spatial function.
 *
 * @param methodName - a GIS method name (https://postgis.net/docs/manual-3.4/reference.html#idm12252)
 * @returns
 */
const whereConditionalWrapper = (methodName: string) =>
  function whereHelper<
    TRecord extends {} = any,
    TResult extends {} = unknown[],
  >(
    this: Knex.QueryBuilder<TRecord, TResult>,
    leftShapeOrColumn: ShapeOrColumn,
    rightShapeOrColumn: ShapeOrColumn,
    operator: keyof typeof Operators,
    distance?: number,
    useUnits: Unit = 'miles',
  ): Knex.QueryBuilder<TRecord, TResult> {
    if (!Operators[operator]) throw new Error(`Invalid operator: ${operator}`);
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs) return this;

    if (!distance || Number.isNaN(distance))
      throw new Error(
        'where: ' + methodName + ': Missing expression value (distance)',
      );
    if (useUnits === 'meters') distance = distance * 1609.34;

    return this.whereRaw(
      `${methodName}(${lhs}, ${rhs}) ${operator} ${Number(distance)}`,
    );
  };

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
function selectDistance<
  TRecord extends {} = any,
  TResult extends {} = unknown[],
>(
  this: Knex.QueryBuilder<TRecord, TResult>,
  leftShapeOrColumn: ShapeOrColumn,
  rightShapeOrColumn: ShapeOrColumn,
  columnAlias = 'distance',
  useUnits: Unit = 'miles',
): Knex.QueryBuilder<TRecord, TResult> {
  const divisionModifier = useUnits === 'miles' ? 1609.34 : 1;
  const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
  const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
  if (!lhs || !rhs) return this;

  return this.select(
    _db.raw(`ST_Distance(${lhs}, ${rhs}) / ${divisionModifier} AS ??`, [
      columnAlias,
    ]),
  );
}

function whereDistanceWithin<
  TRecord extends {} = any,
  TResult extends {} = unknown[],
>(
  this: Knex.QueryBuilder<TRecord, TResult>,
  leftShapeOrColumn: ShapeOrColumn,
  rightShapeOrColumn: ShapeOrColumn,
  distanceMeters?: number,
) {
  const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
  const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
  if (!lhs || !rhs) return this;

  if (!distanceMeters)
    throw new Error('whereDistanceWithin: Missing distanceMeters');

  return this.whereRaw(`ST_DWithin(${lhs}, ${rhs}, ${Number(distanceMeters)})`);
}

const whereDistance = whereConditionalWrapper('ST_Distance');

const whereTouches = wherePredicateWrapper('ST_Touches');
const whereWithin = wherePredicateWrapper('ST_Within');
const whereContains = wherePredicateWrapper('ST_Contains');
const whereContainsProperly = wherePredicateWrapper('ST_ContainsProperly');
const whereCoveredBy = wherePredicateWrapper('ST_CoveredBy');
const whereCovers = wherePredicateWrapper('ST_Covers');
const whereDisjoint = wherePredicateWrapper('ST_Disjoint');
const whereEquals = wherePredicateWrapper('ST_Equals');
const whereOverlaps = wherePredicateWrapper('ST_Overlaps');
const whereCrosses = wherePredicateWrapper('ST_Crosses');
const whereIntersects = wherePredicateWrapper('ST_Intersects');
const whereRelateMatch = wherePredicateWrapper('ST_RelateMatch');

// function whereTouches<TRecord extends {} = any, TResult extends {} = unknown[]>(
//   this: Knex.QueryBuilder<TRecord, TResult>,
//   geoColumnName: string,
//   inputShape: Shape,
// ) {
//   if (!isValidGeometry(inputShape) || !isValidGeography(inputShape))
//     return this;

//   return this.whereRaw(`ST_Touches(??, ${convertShapeToSql(inputShape)})`, [
//     geoColumnName,
//   ]);
// }

function selectBuffer<TRecord extends {} = any, TResult extends {} = unknown[]>(
  this: Knex.QueryBuilder<TRecord, TResult>,
  columnOrShape: string | Shape,
  distance: number,
  columnAlias = 'buffer',
): Knex.QueryBuilder<TRecord, TResult> {
  if (Number.isNaN(distance) || distance == null) return this;
  if (typeof columnOrShape === 'string') {
    return this.select(
      _db.raw(`ST_Buffer(??, ${Number(distance)}) as ??`, [
        columnOrShape,
        columnAlias,
      ]),
    );
  }
  // console.log('selectBuffer', columnOrShape, distance, columnAlias);
  if (isValidShape(columnOrShape)) {
    return this.select(
      _db.raw(
        `ST_Buffer(${convertShapeToSql(columnOrShape)}, ${Number(
          distance,
        )}) as ??`,
        [columnAlias],
      ),
    );
  }
  return this;
}

function selectIntersection<
  TRecord extends {} = any,
  TResult extends {} = unknown[],
>(
  this: Knex.QueryBuilder<TRecord, TResult>,
  columnOrShape: string | Shape,
  inputShape?: Shape,
  columnAlias = 'intersection',
): Knex.QueryBuilder<TRecord, TResult> {
  if (typeof columnOrShape === 'string' && isValidShape(inputShape)) {
    return this.select(
      _db.raw(`ST_Intersection(??, ${convertShapeToSql(inputShape)}) as ??`, [
        columnOrShape,
        columnAlias,
      ]),
    );
  }
  if (isValidShape(columnOrShape) && isValidShape(inputShape)) {
    return this.select(
      _db.raw(
        `ST_Intersection(${convertShapeToSql(
          columnOrShape,
        )}, ${convertShapeToSql(inputShape)}) as ??`,
        [columnAlias],
      ),
    );
  }
  return this;
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
      selectDistance: typeof selectDistance;
      // (
      //   geoColumnName: string,
      //   inputShape: Shape,
      //   columnAlias?: string
      // ): QueryBuilder<TRecord, TResult>;

      /**
       * Spatial: Filters results outside a given radius in meters.
       *
       * Uses the `ST_DWithin` function.
       *
       * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
       */
      whereDistanceWithin: typeof whereDistanceWithin;

      /**
       * Spatial: Filters results outside a given distance in meters.
       *
       * Uses the `ST_Distance` function.
       *
       * Note: Intelligently handles `undefined` lat & lon values by returning the query without modification.
       */
      whereDistance: typeof whereDistance;

      /**
       * ST_Equals - Returns TRUE if the given column Geometries are "spatially equal".
       *
       */
      whereEquals: typeof whereEquals;

      /**
       * ST_Disjoint - Returns TRUE if the Geometries do not "spatially intersect".
       * For geography -- tolerance is 0.00001 meters (so any points that close are considered to intersect)
       * For geometry -- tolerance is 0 (must intersect in 1st place)
       * @param geoColumnName
       * @param opts
       * @returns
       */
      whereDisjoint: typeof whereDisjoint;

      /**
       * ST_Touches - Returns TRUE if the given Geometries "spatially touch".
       * (i.e. share a common boundary point, but no interior points).
       *
       */
      whereTouches: typeof whereTouches;

      whereContains: typeof whereContains;
      whereContainsProperly: typeof whereContainsProperly;
      whereCoveredBy: typeof whereCoveredBy;
      whereCovers: typeof whereCovers;
      whereOverlaps: typeof whereOverlaps;
      whereCrosses: typeof whereCrosses;
      whereIntersects: typeof whereIntersects;
      whereRelateMatch: typeof whereRelateMatch;

      /**
       * ST_Within - Returns TRUE if the geometry A is completely inside geometry B
       */
      whereWithin: typeof whereWithin;

      /**
       * selectBuffer - Returns a geometry that represents all points whose distance from this Geometry is less than or equal to distance.
       */
      selectBuffer: typeof selectBuffer;

      selectIntersection: typeof selectIntersection;
    }
  }
}
/** Sql Operator Map */
const Operators = {
  '=': '=',
  '!=': '<>',
  '>': '>',
  '>=': '>=',
  '<': '<',
  '<=': '<=',
  '<>': '<>',
  '!==': '<>',
  '==': '=',
  '===': '=',
};

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
