import 'knex';
import { Knex, knex } from 'knex';
import {
  convertShapeToSql,
  isValidShape,
  parseShapeOrColumnToSafeSql,
} from './utils/shapeUtils';
import sqlFunctionBuilder from './utils/functionBuilder';
import { metersToUnitMathLiteral, unitToMetersMathLiteral } from './utils/units';

// Re-export helpers
export { sqlFunctionBuilder, convertShapeToSql, isValidShape, parseShapeOrColumnToSafeSql };

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
    knex.QueryBuilder.extend('selectArea', selectArea);
    knex.QueryBuilder.extend('selectBuffer', selectBuffer);
    knex.QueryBuilder.extend('selectCentroid', selectCentroid);
    knex.QueryBuilder.extend('selectConvexHull', selectConvexHull);
    knex.QueryBuilder.extend('selectDifference', selectDifference);
    knex.QueryBuilder.extend('selectDistance', selectDistance);
    knex.QueryBuilder.extend('selectDistanceSphere', selectDistanceSphere);
    knex.QueryBuilder.extend('selectDistanceSpheroid', selectDistanceSpheroid);
    knex.QueryBuilder.extend('selectEnvelope', selectEnvelope);
    knex.QueryBuilder.extend('selectIntersection', selectIntersection);
    knex.QueryBuilder.extend('selectLength', selectLength);
    knex.QueryBuilder.extend('selectSymDifference', selectSymDifference);
    knex.QueryBuilder.extend('selectUnion', selectUnion);

    knex.QueryBuilder.extend('whereContains', whereContains);
    knex.QueryBuilder.extend('whereContainsProperly', whereContainsProperly);
    knex.QueryBuilder.extend('whereCoveredBy', whereCoveredBy);
    knex.QueryBuilder.extend('whereCovers', whereCovers);
    knex.QueryBuilder.extend('whereCrosses', whereCrosses);
    knex.QueryBuilder.extend('whereDisjoint', whereDisjoint);
    knex.QueryBuilder.extend('whereDistance', whereDistance);
    knex.QueryBuilder.extend('whereDistanceWithin', whereDistanceWithin);
    knex.QueryBuilder.extend('whereEquals', whereEquals);
    knex.QueryBuilder.extend('whereIntersects', whereIntersects);
    knex.QueryBuilder.extend('whereOverlaps', whereOverlaps);
    knex.QueryBuilder.extend('whereRelate', whereRelate);
    knex.QueryBuilder.extend('whereTouches', whereTouches);
    knex.QueryBuilder.extend('whereWithin', whereWithin);
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
    useUnits: Unit = 'meters',
  ): Knex.QueryBuilder<TRecord, TResult> {
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs) return this;
    const mathModifier = unitToMetersMathLiteral(useUnits);
    return this.select(
      _db.raw(`${methodName}(${lhs}, ${rhs})${mathModifier} as ??`, [
        columnAlias,
      ]),
    );
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
    useUnits: Unit = 'meters',
  ): Knex.QueryBuilder<TRecord, TResult> {
    const lhs = parseShapeOrColumnToSafeSql(shapeOrColumn);
    if (!lhs) return this;
    const mathModifier = unitToMetersMathLiteral(useUnits);

    return this.select(
      _db.raw(`${methodName}(${lhs})${mathModifier} as ??`, [columnAlias]),
    );
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
    useUnits: Unit = 'meters',
  ): Knex.QueryBuilder<TRecord, TResult> {
    if (!Operators[operator]) throw new Error(`Invalid operator: ${operator}`);
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs) return this;

    if (!distance || Number.isNaN(distance))
      throw new Error(
        'where: ' + methodName + ': Missing expression value (distance)',
      );
    // if (useUnits === 'meters') distance = distance * 1609.34;

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
  useUnits: Unit = 'meters',
): Knex.QueryBuilder<TRecord, TResult> {
  const mathModifier = metersToUnitMathLiteral(useUnits);

  const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
  const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
  if (!lhs || !rhs) return this;

  return this.select(
    _db.raw(`ST_Distance(${lhs}, ${rhs})${mathModifier} AS ??`, [columnAlias]),
  );
}

function whereDistanceWithin<
  TRecord extends {} = any,
  TResult extends {} = unknown[],
>(
  this: Knex.QueryBuilder<TRecord, TResult>,
  leftShapeOrColumn: ShapeOrColumn,
  rightShapeOrColumn: ShapeOrColumn,
  distance?: number,
  useUnits: Unit = 'meters',
) {
  const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
  const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
  const mathModifier = metersToUnitMathLiteral(useUnits);
  if (!lhs || !rhs) return this;

  if (!distance || Number.isNaN(distance))
    throw new Error('whereDistanceWithin: Missing distance');

  return this.whereRaw(
    `ST_DWithin(${lhs}, ${rhs}, ${Number(distance)}${mathModifier})`,
  );
}

const selectArea = selectUnaryFunctionColumnWrapper('ST_Area', 'area');
const selectCentroid = selectUnaryFunctionColumnWrapper('ST_Centroid', 'centroid',);
const selectConvexHull = selectUnaryFunctionColumnWrapper('ST_ConvexHull', 'convex_hull',);
const selectDifference = selectBinaryFunctionColumnWrapper('ST_Difference', 'difference');
const selectDistanceSphere = selectBinaryFunctionColumnWrapper('ST_DistanceSphere', 'distance_sphere');
const selectDistanceSpheroid = selectBinaryFunctionColumnWrapper('ST_DistanceSpheroid', 'distance_spheroid');
const selectEnvelope = selectUnaryFunctionColumnWrapper('ST_Envelope', 'envelope',);
const selectIntersection = selectBinaryFunctionColumnWrapper('ST_Intersection', 'intersection');
const selectLength = selectUnaryFunctionColumnWrapper('ST_Length', 'length');
const selectSymDifference = selectBinaryFunctionColumnWrapper('ST_SymDifference', 'sym_difference');
const selectUnion = selectBinaryFunctionColumnWrapper('ST_Union', 'union');

const whereContains = wherePredicateWrapper('ST_Contains');
const whereContainsProperly = wherePredicateWrapper('ST_ContainsProperly');
const whereCoveredBy = wherePredicateWrapper('ST_CoveredBy');
const whereCovers = wherePredicateWrapper('ST_Covers');
const whereCrosses = wherePredicateWrapper('ST_Crosses');
const whereDisjoint = wherePredicateWrapper('ST_Disjoint');
const whereDistance = whereConditionalWrapper('ST_Distance');
const whereEquals = wherePredicateWrapper('ST_Equals');
const whereIntersects = wherePredicateWrapper('ST_Intersects');
const whereOverlaps = wherePredicateWrapper('ST_Overlaps');
const whereRelate = wherePredicateWrapper('ST_Relate');
const whereTouches = wherePredicateWrapper('ST_Touches');
const whereWithin = wherePredicateWrapper('ST_Within');

function selectBuffer<TRecord extends {} = any, TResult extends {} = unknown[]>(
  this: Knex.QueryBuilder<TRecord, TResult>,
  columnOrShape: string | Shape,
  distance: number | string,
  useUnits: Unit = 'meters',
  columnAlias = 'buffer',
): Knex.QueryBuilder<TRecord, TResult> {
  if (distance === undefined) return this;
  if (Number.isNaN(distance) || distance == null)
    throw new Error('selectBuffer: Missing distance');
  const builder = sqlFunctionBuilder(_db);
  const fnExpr = builder('ST_Buffer')
    .arg(columnOrShape)
    .arg(distance)
    .unit(useUnits)
    .alias(columnAlias);

  return fnExpr._preventBuild ? this : this.select(_db.raw(fnExpr.build()));

  // return this;
}

// function selectIntersection<
//   TRecord extends {} = any,
//   TResult extends {} = unknown[],
// >(
//   this: Knex.QueryBuilder<TRecord, TResult>,
//   columnOrShape: string | Shape,
//   inputShape?: Shape,
//   columnAlias = 'intersection',
// ): Knex.QueryBuilder<TRecord, TResult> {
//   if (typeof columnOrShape === 'string' && isValidShape(inputShape)) {
//     return this.select(
//       _db.raw(`ST_Intersection(??, ${convertShapeToSql(inputShape)}) as ??`, [
//         columnOrShape,
//         columnAlias,
//       ]),
//     );
//   }
//   if (isValidShape(columnOrShape) && isValidShape(inputShape)) {
//     return this.select(
//       _db.raw(
//         `ST_Intersection(${convertShapeToSql(
//           columnOrShape,
//         )}, ${convertShapeToSql(inputShape)}) as ??`,
//         [columnAlias],
//       ),
//     );
//   }
//   return this;
// }

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
      whereRelate: typeof whereRelate;

      /**
       * ST_Within - Returns TRUE if the geometry A is completely inside geometry B
       */
      whereWithin: typeof whereWithin;

      selectArea: typeof selectArea;
      selectLength: typeof selectLength;
      selectCentroid: typeof selectCentroid;
      selectEnvelope: typeof selectEnvelope;
      selectConvexHull: typeof selectConvexHull;
      selectDifference: typeof selectDifference;
      selectSymDifference: typeof selectSymDifference;
      selectUnion: typeof selectUnion;
      selectDistanceSpheroid: typeof selectDistanceSpheroid;
      selectDistanceSphere: typeof selectDistanceSphere;

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
