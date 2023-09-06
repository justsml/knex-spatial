import 'knex';
import { Knex, knex } from 'knex';
import {
  convertShapeToSql,
  isValidShape,
  parseShapeOrColumnToSafeSql,
} from './utils/shapeUtils';
import sqlFunctionBuilder from './utils/functionBuilder';
import {
  metersToUnitMathLiteral,
  unitToMetersMathLiteral,
} from './utils/units';

// Re-export helpers
export {
  sqlFunctionBuilder,
  convertShapeToSql,
  isValidShape,
  parseShapeOrColumnToSafeSql,
};

let _db: Knex;
let _options: PluginOptions;

type PluginOptions = {
  throwOnUndefined?: boolean;
};

/**
 * A format for geography or geometry.
 *
 * Note: Use WKT for geometry, and EWKT for geography since it includes SRID.
 */
type ConvertFormat = 'geojson' | 'text' | 'ewkt' | 'wkt';
const ConvertFormats = ['geojson', 'text', 'ewkt', 'wkt'] as const;

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
 * const selectDistance = selectBinaryFunWrapper('ST_Distance', 'distance');
 * ```
 */
const selectBinaryFunWrapper = (methodName: string, defaultAlias: string) =>
  function whereHelper<
    TRecord extends {} = any,
    TResult extends {} = unknown[],
  >(
    this: Knex.QueryBuilder<TRecord, TResult>,
    leftShapeOrColumn: ShapeOrColumn,
    rightShapeOrColumn: ShapeOrColumn,
    columnAlias = defaultAlias,
    useUnits: Unit = 'meters',
    convertMode: ConvertFormat | undefined = undefined,
  ): Knex.QueryBuilder<TRecord, TResult> {
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs) return this;
    let mathModifier = unitToMetersMathLiteral(useUnits);
    // convert mode and math modifier are mutually exclusive (cannot ST_AsWKT(5))
    // if last arguments is valid convert mode, set convertMode and clear mathModifier
    convertMode = ConvertFormats.includes(arguments[arguments.length - 1])
      ? arguments[arguments.length - 1]
      : convertMode;
    if (convertMode !== undefined) mathModifier = '';
    const fnFragment = `${methodName}(${lhs}, ${rhs})${mathModifier}`;
    const wrappedFragment =
      convertMode && ConvertFormats.includes(convertMode)
        ? `ST_As${convertMode.toUpperCase()}(${fnFragment})`
        : fnFragment;

    return this.select(_db.raw(`${wrappedFragment} as ??`, [columnAlias]));
  };

/**
 * Create a function for 1-arg GIS Functions.
 *
 * Examples include `ST_Area`, `ST_Length`, `ST_Centroid`, etc.
 */
const selectUnaryFunWrapper = (methodName: string, defaultAlias: string) =>
  function whereHelper<
    TRecord extends {} = any,
    TResult extends {} = unknown[],
  >(
    this: Knex.QueryBuilder<TRecord, TResult>,
    shapeOrColumn: ShapeOrColumn,
    columnAlias = defaultAlias,
    useUnits: Unit = 'meters',
    convertMode: ConvertFormat | undefined = undefined,
  ): Knex.QueryBuilder<TRecord, TResult> {
    const mathModifier = unitToMetersMathLiteral(useUnits);
    const lhs = parseShapeOrColumnToSafeSql(shapeOrColumn);
    if (!lhs) return this;
    const fnFragment = `${methodName}(${lhs})${mathModifier}`;
    const wrappedFragment =
      convertMode && ConvertFormats.includes(convertMode)
        ? `ST_As${convertMode.toUpperCase()}(${fnFragment})`
        : fnFragment;

    return this.select(_db.raw(`${wrappedFragment} as ??`, [columnAlias]));
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
    distance?: number | string,
    useUnits: Unit = 'meters',
  ): Knex.QueryBuilder<TRecord, TResult> {
    const mathModifier = unitToMetersMathLiteral(useUnits);
    if (!Operators[operator]) throw new Error(`Invalid operator: ${operator}`);
    const lhs = parseShapeOrColumnToSafeSql(leftShapeOrColumn);
    const rhs = parseShapeOrColumnToSafeSql(rightShapeOrColumn);
    if (!lhs || !rhs || rightShapeOrColumn === undefined) return this;

    if (!distance || Number.isNaN(distance))
      throw new Error(
        'where: ' + methodName + ': Missing expression value (distance)',
      );

    return this.whereRaw(
      `${methodName}(${lhs}, ${rhs}) ${operator} ${Number(
        distance,
      )}${mathModifier}`,
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

const selectArea = selectUnaryFunWrapper('ST_Area', 'area');
const selectCentroid = selectUnaryFunWrapper('ST_Centroid', 'centroid');
const selectConvexHull = selectUnaryFunWrapper('ST_ConvexHull', 'convex_hull');
const selectDifference = selectBinaryFunWrapper('ST_Difference', 'difference');
const selectDistanceSphere = selectBinaryFunWrapper(
  'ST_DistanceSphere',
  'distance_sphere',
);
const selectDistanceSpheroid = selectBinaryFunWrapper(
  'ST_DistanceSpheroid',
  'distance_spheroid',
);
const selectEnvelope = selectUnaryFunWrapper('ST_Envelope', 'envelope');
const selectIntersection = selectBinaryFunWrapper(
  'ST_Intersection',
  'intersection',
);
const selectLength = selectUnaryFunWrapper('ST_Length', 'length');
const selectSymDifference = selectBinaryFunWrapper(
  'ST_SymDifference',
  'sym_difference',
);
const selectUnion = selectBinaryFunWrapper('ST_Union', 'union');

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
  convertMode: ConvertFormat | undefined = undefined,
): Knex.QueryBuilder<TRecord, TResult> {
  if (distance === undefined) return this;
  if (Number.isNaN(distance) || distance == null)
    throw new Error('selectBuffer: Missing distance');
  let wrapperFn = convertMode && ConvertFormats.includes(convertMode) ? `ST_As${convertMode.toUpperCase()}` : undefined;
  const builder = sqlFunctionBuilder(_db);
  const fnExpr = builder('ST_Buffer')
    .arg(columnOrShape)
    .arg(distance)
    .unit(useUnits)
    .wrap(wrapperFn)
    .alias(columnAlias);

  // const wrappedFragment =
  //   convertMode && ConvertFormats.includes(convertMode)
  //     ? `ST_As${convertMode.toUpperCase()}(${fnExpr.toString()})`
  //     : fnExpr.toString();

  return fnExpr._preventBuild ? this : this.select(_db.raw(fnExpr));

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
