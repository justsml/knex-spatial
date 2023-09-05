type ShapeOrColumn = Shape | string;

type ShapeColumnOrLiteral = Shape | string | number | boolean;

type Unit = 'meters' | 'miles' | 'kilometers' | 'hectares' | 'acres' | 'feet' | 'yards' | 'inches'

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
      radius: number | string;
    }
  | {
      x: number;
      y: number;
      radius: number | string;
    };
/** While Line and Polygon are typed the same, the system handles
 * shorthand expressions due to polygons having the same start and end coordinates. */
type Line = Point[];
/** While Line and Polygon are typed the same, the system handles
 * shorthand expressions due to polygons having the same start and end coordinates. */
type Polygon = Point[];
type MultiPolygon = Point[][];
type MultiLine = Point[][];
