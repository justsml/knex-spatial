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
 * Create a function for 2-arg GIS Functions.
 * 
 * Examples include `ST_Distance`, `ST_Intersection`, `ST_DWithin`, etc.
 * 
 * ## Example 
 * ```ts
 * const selectDistance = selectBinaryFunctionColumnWrapper('ST_Distance', 'distance');
 * ```
 */
const selectBinaryFunctionColumnWrapper = (
  methodName: string,
  defaultAlias: string,
) =>
  function whereHelper<
    TRecord extends {} = any,
    TResult extends {} = unknown[],
  >(
    this: Knex.QueryBuilder<TRecord, TResult>,
    leftShapeOrColumn: ShapeOrColumn,
    rightShapeOrColumn: ShapeOrColumn,
    columnAlias = defaultAlias,
    useUnits: Unit | 'NA' = 'NA',
  ): Knex.QueryBuilder<TRecord, TResult> {
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs) return this;
    const mathModifier = useUnits === 'miles' ? ' * 1609.34' : '';
    return this.select(`${methodName}(${lhs}, ${rhs})${mathModifier} as ${columnAlias}`);
  };

/**
 * Create a function for 1-arg GIS Functions.
 * 
 * Examples include `ST_Area`, `ST_Length`, `ST_Centroid`, etc.
 */
const selectUnaryFunctionColumnWrapper = (
  methodName: string,
  defaultAlias: string,
) =>
  function whereHelper<
    TRecord extends {} = any,
    TResult extends {} = unknown[],
  >(
    this: Knex.QueryBuilder<TRecord, TResult>,
    shapeOrColumn: ShapeOrColumn,
    columnAlias = defaultAlias,
    useUnits: Unit | 'NA' = 'NA',
  ): Knex.QueryBuilder<TRecord, TResult> {
    const lhs = parseShapeOrColumnToSafeSql(shapeOrColumn);
    if (!lhs) return this;
    const mathModifier =
      useUnits === 'NA' ? '' : useUnits === 'miles' ? ' * 1609.34' : ' * 1';
    return this.select(`${methodName}(${lhs})${mathModifier} as ${columnAlias}`);
  };

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
