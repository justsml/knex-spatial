
/**
 * Utility functions for working with PostGIS shapes & columns.
 * @param shapeOrColumn 
 * @returns 
 */
export function parseShapeOrColumnToSafeSql(
  shapeOrColumn: ShapeOrColumn | undefined,
): string | undefined {
  if (typeof shapeOrColumn === 'string') return '`' + shapeOrColumn.replace(/[`"]+/gm, '') + '`';
  return convertShapeToSql(shapeOrColumn);
}
/**
 * A helper for generating Well-known Text (WKT) for working with PostGIS shapes.
 */
export function convertShapeToSql(s: Shape | undefined): string | undefined {
  if (!s) return undefined;
  const srid = s.srid ? `SRID=${Number(s.srid)};` : '';
  const isGeography = isValidGeography(s);
  const castType = isGeography ? 'geography' : 'geometry';

  if (isCircle(s)) {
    const c = s;
    return `ST_Buffer('${srid}POINT(${getX(c)} ${getY(c)})'::${castType}, ${
      c.radius
    })`;
  }

  if (isPoint(s)) return `'${srid}POINT(${getX(s)} ${getY(s)})'::${castType}`;

  if (isMultiPolygon(s))
    return `'${srid}MULTIPOLYGON(${s
      .map((p) => `(${p.map((p) => `${getX(p)} ${getY(p)}`).join(', ')})`)
      .join(', ')})'::${castType}`;
  if (isPolygon(s))
    return `'${srid}POLYGON(${s
      .map((p) => `${getX(p)} ${getY(p)}`)
      .join(', ')})'::${castType}`;
  if (isMultiLine(s))
    return `'${srid}MULTILINESTRING(${s
      // @ts-expect-error
      .map((p) => `(${p.map((p) => `${getX(p)} ${getY(p)}`).join(', ')})`)
      .join(', ')})'::${castType}`;
  if (isLine(s))
    return `'${srid}LINESTRING(${s
      // @ts-expect-error
      .map((p) => `${getX(p)} ${getY(p)}`)
      .join(', ')})'::${castType}`;
}

export const isValidShape = (p: unknown): boolean =>
  Array.isArray(p)
    ? (p as any[]).every((inner: Point | Point[]) =>
        Array.isArray(inner) ? inner.every(isValidPoint) : isValidPoint(inner),
      )
    : isValidPoint(p);
export const isValidGeography = (p: unknown): boolean =>
  Array.isArray(p)
    ? (p as any[]).every((inner: Point | Point[]) =>
        Array.isArray(inner)
          ? inner.every(isValidLatLon)
          : isValidLatLon(inner),
      )
    : isValidLatLon(p);

export const isValidGeometry = (p: unknown): boolean =>
  p == null
    ? false
    : Array.isArray(p)
    ? (p as any[]).every((inner: Point | Point[]) =>
        Array.isArray(inner) ? inner.every(isValidXY) : isValidXY(inner),
      )
    : isValidXY(p);

const isValidLatLon = (p: unknown) =>
  p != null &&
  typeof p === 'object' &&
  'lat' in p &&
  'lon' in p &&
  p.lat !== undefined &&
  p.lon !== undefined;
const isValidXY = (p: unknown) =>
  p != null &&
  typeof p === 'object' &&
  'x' in p &&
  'y' in p &&
  p.x !== undefined &&
  p.y !== undefined;

export const isValidPoint = (p: unknown) => isValidLatLon(p) || isValidXY(p);

// const isExplicitShape = (shape: any): shape is ExplicitShape =>
//   shape != null &&
//   ['point', 'circle', 'line', 'polygon', 'multiPolygon', 'multiLine'].some(
//     (key) => key in shape,
//   );

// export function convertToShape(
//   shape: ExplicitShape,
// ): Shape | undefined {
//   if ('point' in shape && isPoint(shape.point)) return shape.point;
//   if ('circle' in shape && isCircle(shape.circle)) return shape.circle;
//   if ('line' in shape && isLine(shape.line)) return shape.line;
//   if ('polygon' in shape && isPolygon(shape.polygon)) return shape.polygon;
//   if ('multiPolygon' in shape && isMultiPolygon(shape.multiPolygon))
//     return shape.multiPolygon;
//   if ('multiLine' in shape && isMultiLine(shape.multiLine))
//     return shape.multiLine;
//   // if ('multiPoint' in shape && isMultiLine(shape.multiPoint)) return shape.multiPoint;
// }
// export function convertToExplicitShape(
//   shape: Shape,
// ): ExplicitShape | undefined {
//   if (isCircle(shape)) return { circle: shape };
//   if (isPoint(shape)) return { point: shape };
//   if (isLine(shape)) return { line: shape };
//   if (isPolygon(shape)) return { polygon: shape };
//   if (isMultiPolygon(shape)) return { multiPolygon: shape };
//   if (isMultiLine(shape)) return { multiLine: shape };
//   // if ('multiPoint' in shape && isMultiLine(shape.multiPoint)) return shape.multiPoint;
// }

const getX = (p: Point) => ('x' in p ? p.x : p.lon);
const getY = (p: Point) => ('y' in p ? p.y : p.lat);
/**
 * **Note:** Shorthand arrays of Points may look like either Lines or Polygons.
 * The system detects a Polygon when Points[] have the same start and end coordinates. */
function isClosedLine(points: Point[]): boolean | undefined {
  if (points.length === 0) return undefined; // Undefined, do not apply
  if (points.length === 1) return false; // Nope, a 1 Point array
  if (points.length === 2) return false; // A 2 Point LineString

  const first = points[0];
  const last = points[points.length - 1];
  const firstX = 'x' in first ? first.x : first.lon;
  const firstY = 'y' in first ? first.y : first.lat;
  const lastX = 'x' in last ? last.x : last.lon;
  const lastY = 'y' in last ? last.y : last.lat;

  return firstX === lastX && firstY === lastY;
}
/** Point Type Guard */
export const isPoint = (s: unknown): s is Point =>
  s instanceof Object &&
  (!('radius' in s) || s.radius === undefined) &&
  (('lat' in s && 'lon' in s && s.lat !== undefined && s.lon !== undefined) ||
    ('x' in s && 'y' in s && s.x !== undefined && s.y !== undefined));

/** Circle Type Guard */
export const isCircle = (s: unknown): s is Circle =>
  s instanceof Object &&
  (('lat' in s &&
    'lon' in s &&
    'radius' in s &&
    s.lat !== undefined &&
    s.lon !== undefined) ||
    ('x' in s &&
      'y' in s &&
      'radius' in s &&
      s.x !== undefined &&
      s.y !== undefined)) &&
  s.radius !== undefined;

/** Polygon Type Guard */
export const isPolygon = (s: unknown): s is Polygon =>
  Array.isArray(s) && s.every(isPoint) && isClosedLine(s) === true;

/** Line Type Guard */
export const isLine = (s: unknown): s is Line =>
  Array.isArray(s) &&
  s.every(isPoint) &&
  isClosedLine(s) === false &&
  s.length >= 2;

/** MultiLine Type Guard */
export const isMultiLine = (s: unknown): s is MultiLine =>
  Array.isArray(s) && s.every(isLine);

/** MultiPolygon Type Guard */
export const isMultiPolygon = (s: unknown): s is MultiPolygon =>
  Array.isArray(s) && s.every(isPolygon);
