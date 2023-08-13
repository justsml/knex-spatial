/**
 *
 */
export function convertShapeToSql(
  s: ExplicitShape | ShapeSimple | undefined,
): string | undefined {
  if (!s) return undefined;
  let shape = !isExplicitShape(s) ? convertToExplicitShape(s) : s;
  if (!shape) return undefined;
  let simple = convertToSimpleShape(shape);
  if (!simple) return undefined;
  const isGeo = isValidGeography(simple);
  const castType = isGeo ? 'geography' : 'geometry';

  if (isCircle(simple)) {
    const c = simple;
    return `ST_Buffer('POINT(${getX(c)} ${getY(c)})'::${castType}, ${
      c.radius
    })`;
  }

  if (isPoint(simple))
    return `'POINT(${getX(simple)} ${getY(simple)})'::${castType}`;

  if (isMultiPolygon(simple))
    return `'MULTIPOLYGON(${simple
      .map((p) => `(${p.map((p) => `${getX(p)} ${getY(p)}`).join(', ')})`)
      .join(', ')})'::${castType}`;
  if (isPolygon(simple))
    return `'POLYGON(${simple
      .map((p) => `${getX(p)} ${getY(p)}`)
      .join(', ')})'::${castType}`;
  if (isMultiLine(simple))
    return `'MULTILINESTRING(${simple
      // @ts-expect-error
      .map((p) => `(${p.map((p) => `${getX(p)} ${getY(p)}`).join(', ')})`)
      .join(', ')})'::${castType}`;
  if (isLine(simple))
    return `'LINESTRING(${simple
      // @ts-expect-error
      .map((p) => `${getX(p)} ${getY(p)}`)
      .join(', ')})'::${castType}`;
}

export const isValidGeography = (p: ShapeSimple): boolean =>
  Array.isArray(p)
    ? (p as any[]).every((x: PointSimple | PointSimple[]) =>
        Array.isArray(x) ? isValidGeography(x) : isValidLatLon(x),
      )
    : isValidLatLon(p);

export const isCoordinatesDefined = (p: ShapeSimple): boolean =>
  p == null
    ? false
    : Array.isArray(p)
    ? (p as any[]).every((x: PointSimple | PointSimple[]) =>
        Array.isArray(x) ? isValidGeography(x) : isValidCoordinates(x),
      )
    : isValidCoordinates(p);

const isValidLatLon = (p: ShapeSimple) =>
  'lat' in p && 'lon' in p && p.lat !== undefined && p.lon !== undefined;
const isValidXY = (p: ShapeSimple) =>
  'x' in p && 'y' in p && p.x !== undefined && p.y !== undefined;
const isValidCoordinates = (p: ShapeSimple) => isValidLatLon(p) || isValidXY(p);

const isExplicitShape = (shape: any): shape is ExplicitShape =>
  shape != null &&
  ['point', 'circle', 'line', 'polygon', 'multiPolygon', 'multiLine'].some(
    (key) => key in shape,
  );

export function convertToSimpleShape(
  shape: ExplicitShape,
): ShapeSimple | undefined {
  if ('point' in shape && isPoint(shape.point)) return shape.point;
  if ('circle' in shape && isCircle(shape.circle)) return shape.circle;
  if ('line' in shape && isLine(shape.line)) return shape.line;
  if ('polygon' in shape && isPolygon(shape.polygon)) return shape.polygon;
  if ('multiPolygon' in shape && isMultiPolygon(shape.multiPolygon))
    return shape.multiPolygon;
  if ('multiLine' in shape && isMultiLine(shape.multiLine))
    return shape.multiLine;
  // if ('multiPoint' in shape && isMultiLine(shape.multiPoint)) return shape.multiPoint;
}
export function convertToExplicitShape(
  shape: ShapeSimple,
): ExplicitShape | undefined {
  if (isCircle(shape)) return { circle: shape };
  if (isPoint(shape)) return { point: shape };
  if (isLine(shape)) return { line: shape };
  if (isPolygon(shape)) return { polygon: shape };
  if (isMultiPolygon(shape)) return { multiPolygon: shape };
  if (isMultiLine(shape)) return { multiLine: shape };
  // if ('multiPoint' in shape && isMultiLine(shape.multiPoint)) return shape.multiPoint;
}

const getX = (p: PointSimple) => ('x' in p ? p.x : p.lon);
const getY = (p: PointSimple) => ('y' in p ? p.y : p.lat);
/**
 * **Note:** Shorthand arrays of Points may look like either Lines or Polygons.
 * The system detects a Polygon when Points[] have the same start and end coordinates. */
function isPointListPolygon(points: PointSimple[]): boolean | undefined {
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
export const isPoint = (s: unknown): s is PointSimple =>
  s instanceof Object &&
  (!('radius' in s) || s.radius === undefined) &&
  (('lat' in s && 'lon' in s && s.lat !== undefined && s.lon !== undefined) ||
    ('x' in s && 'y' in s && s.x !== undefined && s.y !== undefined));

/** Circle Type Guard */
export const isCircle = (s: unknown): s is CircleSimple =>
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
export const isPolygon = (s: unknown): s is PolygonSimple =>
  Array.isArray(s) && s.every(isPoint) && isPointListPolygon(s) === true;

/** Line Type Guard */
export const isLine = (s: unknown): s is LineSimple =>
  Array.isArray(s) &&
  s.every(isPoint) &&
  isPointListPolygon(s) === false &&
  s.length >= 2;

/** MultiLine Type Guard */
export const isMultiLine = (s: unknown): s is MultiLineSimple =>
  Array.isArray(s) && s.every(isLine);

/** MultiPolygon Type Guard */
export const isMultiPolygon = (s: unknown): s is MultiPolygonSimple =>
  Array.isArray(s) && s.every(isPolygon);
