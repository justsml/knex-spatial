type ExplicitShape =
  | PointShape
  | CircleShape
  | LineShape
  | PolygonShape
  | MultiPolygonShape
  | MultiLineShape;

type ShapeSimple =
  | PointSimple
  | CircleSimple
  | LineSimple
  | PolygonSimple
  | MultiPolygonSimple
  | MultiLineSimple;

type PointSimple =
  | {
      lat: number;
      lon: number;
    }
  | {
      x: number;
      y: number;
      z?: number;
    };
type CircleSimple =
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
/** While LineSimple and PolygonSimple are typed the same, the system handles
 * shorthand expressions due to polygons having the same start and end coordinates. */
type LineSimple = Array<PointSimple>;
/** While LineSimple and PolygonSimple are typed the same, the system handles
 * shorthand expressions due to polygons having the same start and end coordinates. */
type PolygonSimple = Array<PointSimple>;
type MultiPolygonSimple = Array<PolygonSimple>;
type MultiLineSimple = Array<LineSimple>;


type PointShape = {
  point: PointSimple;
};
type CircleShape = {
  circle: CircleSimple;
};
type LineShape = {
  line: LineSimple;
};
type PolygonShape = {
  polygon: PolygonSimple;
};
type MultiPolygonShape = {
  multiPolygon: MultiPolygonSimple;
};
type MultiLineShape = {
  multiLine: MultiLineSimple;
};
/** Note: Currently no 'simple' multi point support. (Indistinguishable from Polygon & LineString.) */
type MultiPointShape = {
  multiPoint: PointSimple[];
}
