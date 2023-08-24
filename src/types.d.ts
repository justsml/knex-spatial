// type ExplicitShape =
//   | PointShape
//   | CircleShape
//   | LineShape
//   | PolygonShape
//   | MultiPolygonShape
//   | MultiLineShape;

type Shape = (Point | Circle | Line | Polygon | MultiPolygon | MultiLine) & {
  srid?: number;
};

type Point =
  | {
      lat: number;
      lon: number;
    }
  | {
      x: number;
      y: number;
      z?: number;
    };
type Circle =
  | {
      lat: number;
      lon: number;
      radius: number;
    }
  | {
      x: number;
      y: number;
      radius: number;
    };
/** While Line and Polygon are typed the same, the system handles
 * shorthand expressions due to polygons having the same start and end coordinates. */
type Line = Point[];
/** While Line and Polygon are typed the same, the system handles
 * shorthand expressions due to polygons having the same start and end coordinates. */
type Polygon = Point[];
type MultiPolygon = Point[][];
type MultiLine = Point[][];

// type PointShape = {
//   point: Point;
// };
// type CircleShape = {
//   circle: Circle;
// };
// type LineShape = {
//   line: Line;
// };
// type PolygonShape = {
//   polygon: Polygon;
// };
// type MultiPolygonShape = {
//   multiPolygon: MultiPolygon;
// };
// type MultiLineShape = {
//   multiLine: MultiLine;
// };
// /** Note: Currently no '' multi point support. (Indistinguishable from Polygon & LineString.) */
// type MultiPointShape = {
//   multiPoint: Point[];
// }
