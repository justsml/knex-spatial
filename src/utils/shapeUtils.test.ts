import { describe, it, expect } from 'vitest';
import {
  isValidGeography,
  convertShapeToSql,
  // convertToSimpleShape,
  isPoint,
  isPolygon,
  isLine,
  isMultiPolygon,
  isMultiLine,
  isCircle,
  isValidGeometry,
  isValidShape,
  isPointUndefined,
  shapeContainsUndefined,
  parseShapeOrColumnToSafeSql,
} from './shapeUtils';

/* Geography-based fixtures */
const geoPoint = () => ({ lat: 1, lon: -1 });
const geoCircle = () => ({ lat: 1, lon: -1, radius: 420 });
const geoLine = () => [
  { lat: 1, lon: -1 },
  { lat: 2, lon: -2 },
  { lat: 3, lon: -3 },
];
const geoPolygon = () => [
  { lat: 1, lon: -1 },
  { lat: 2, lon: -2 },
  { lat: 3, lon: -3 },
  { lat: 1, lon: -1 },
];
const geoMultiPolygon = () => [
  [
    { lat: 1, lon: -1 },
    { lat: 2, lon: -2 },
    { lat: 3, lon: -3 },
    { lat: 1, lon: -1 },
  ],
  [
    { lat: 1, lon: -1 },
    { lat: 2, lon: -2 },
    { lat: 3, lon: -3 },
    { lat: 1, lon: -1 },
  ],
];
const geoMultiLine = () => [
  [
    { lat: 1, lon: -1 },
    { lat: 2, lon: -2 },
  ],
  [
    { lat: 3, lon: -3 },
    { lat: 4, lon: -4 },
  ],
];

/* Geometry-based fixtures */
const geometryPoint = () => ({ y: 1, x: -1 });
const geometryLine = () => [
  { y: 1, x: -1 },
  { y: 2, x: -2 },
  { y: 3, x: -3 },
];
const geometryPolygon = () => [
  { y: 1, x: -1 },
  { y: 2, x: -2 },
  { y: 3, x: -3 },
  { y: 1, x: -1 },
];
const geometryMultiPolygon = () => [
  [
    { y: 1, x: -1 },
    { y: 2, x: -2 },
    { y: 3, x: -3 },
    { y: 1, x: -1 },
  ],
  [
    { y: 1, x: -1 },
    { y: 2, x: -2 },
    { y: 3, x: -3 },
    { y: 1, x: -1 },
  ],
];
const geometryMultiLine = () => [
  [
    { y: 1, x: -1 },
    { y: 2, x: -2 },
  ],
  [
    { y: 3, x: -3 },
    { y: 4, x: -4 },
  ],
];

describe('handles invalid input', () => {
  it('should handle empty object', () => {
    // @ts-expect-error
    expect(convertShapeToSql({})).toEqual(undefined);
  });
  it('should handle null input', () => {
    // @ts-expect-error
    expect(convertShapeToSql(null)).toEqual(undefined);
  });
  it('should handle undefined input', () => {
    expect(convertShapeToSql(undefined)).toEqual(undefined);
  });
  it('should handle invalid {point}', () => {
    expect(convertShapeToSql(undefined)).toEqual(undefined);
    // @ts-expect-error
    expect(convertShapeToSql({
      lat: undefined,
      lon: 1,
    })).toEqual(undefined);
  });
  it('should detect undefined values', () => {
    expect(isValidGeometry(undefined)).toEqual(false);
    expect(isValidGeometry({ lat: undefined, lon: 1 })).toEqual(false);
    expect(isValidGeometry({ lat: 1, lon: undefined })).toEqual(false);
    expect(isValidGeometry({ lat: 1, lon: 1 })).toEqual(false);
    expect(isValidGeometry({ y: undefined, x: 1 })).toEqual(false);
    expect(isValidGeometry({ y: 1, x: undefined })).toEqual(false);
    expect(isValidGeometry([{ lat: undefined, lon: 1 }])).toEqual(false);
    expect(isValidGeometry([[{ lat: 1, lon: undefined }]])).toEqual(false);
  });
  it('should detect invalid geography', () => {
    expect(isValidGeography({ lat: undefined, lon: 1 })).toEqual(false);
    expect(isValidGeography({ lat: 1, lon: undefined })).toEqual(false);
    expect(isValidGeography({ lat: undefined, lon: undefined })).toEqual(false);
    expect(isValidShape({ lat: undefined, lon: 1 })).toEqual(false);
    expect(isValidShape({ lat: 1, lon: undefined })).toEqual(false);
    expect(isValidShape({ lat: undefined, lon: undefined })).toEqual(false);
    
    expect(isValidShape({ y: undefined, x: 1 })).toEqual(false);
    expect(isValidShape({ y: 1, x: undefined })).toEqual(false);
    expect(isValidShape({ y: undefined, x: undefined })).toEqual(false);
    
    expect(isValidShape([{ y: 1, x: undefined }])).toEqual(false);
    expect(isValidShape([[{ y: 1, x: undefined }]])).toEqual(false);

  })
});

describe('parseShapeOrColumnToSafeSql', () => {
  it('should parse a boolean expression', () => {
    expect(parseShapeOrColumnToSafeSql(true)).toEqual('true');
  });
});

describe('isPointUndefined', () => {
  it('should detect undefined values', () => {
    expect(isPointUndefined([undefined])).toEqual(false);
    expect(isPointUndefined({ lat: undefined, lon: 1 })).toEqual(true);
    expect(isPointUndefined({ lat: 1, lon: undefined })).toEqual(true);
    expect(isPointUndefined({ lat: 1, lon: 1 })).toEqual(false);
    expect(isPointUndefined({ y: undefined, x: 1 })).toEqual(true);
    expect(isPointUndefined({ y: 1, x: undefined })).toEqual(true);
    expect(isPointUndefined({ y: 1, x: 1 })).toEqual(false);
    expect(isPointUndefined({ radius: undefined})).toEqual(true);
  });
});

// shapeContainsUndefined
describe('shapeContainsUndefined', () => {
  it('should detect undefined values', () => {
    expect(shapeContainsUndefined([undefined])).toEqual(false);
    expect(shapeContainsUndefined({ lat: undefined, lon: 1 })).toEqual(true);
    expect(shapeContainsUndefined({ lat: 1, lon: undefined })).toEqual(true);
    expect(shapeContainsUndefined({ lat: 1, lon: 1 })).toEqual(false);
    expect(shapeContainsUndefined([{ lat: 1, lon: 1 }, { lat: -1, lon: -1 }, { lat: 1, lon: 1 }])).toEqual(false);
    expect(shapeContainsUndefined([[{ lat: 1, lon: 1 }], { lat: -1, lon: -1 }, { lat: 1, lon: 1 }])).toEqual(false);
  });
});

describe('convertShapeToSqlWKT', () => {

  it('should convert a geography point', () => {
    const point = geoPoint();
    const expected = `'POINT(-1 1)'::geography`;
    expect(convertShapeToSql(point)).toEqual(expected);
  });
  it('should convert a geometry point', () => {
    const point = geometryPoint();
    const expected = `'POINT(-1 1)'::geometry`;
    expect(convertShapeToSql(point)).toEqual(expected);
  });

  it('should convert a geography line', () => {
    const line = geoLine();
    const expected = `'LINESTRING(-1 1, -2 2, -3 3)'::geography`;
    expect(convertShapeToSql(line)).toEqual(expected);
  });
  it('should convert a geometry line', () => {
    const line = geometryLine();
    expect(convertShapeToSql(line)).toEqual(
      `'LINESTRING(-1 1, -2 2, -3 3)'::geometry`,
    );
  });
  it('should convert a geography polygon', () => {
    const polygon = geoPolygon();
    expect(convertShapeToSql(polygon)).toEqual(
      `'POLYGON(-1 1, -2 2, -3 3, -1 1)'::geography`,
    );
  });
  it('should convert a geometry polygon', () => {
    const polygon = geometryPolygon();
    const expected = `'POLYGON(-1 1, -2 2, -3 3, -1 1)'::geometry`;
    expect(convertShapeToSql(polygon)).toEqual(expected);
  });
  it('should convert a geography multiPolygon', () => {
    const multiPolygon = geoMultiPolygon();
    const expected = `'MULTIPOLYGON((-1 1, -2 2, -3 3, -1 1), (-1 1, -2 2, -3 3, -1 1))'::geography`;
    expect(convertShapeToSql(multiPolygon)).toEqual(expected);
  });
  it('should convert a geometry multiPolygon', () => {
    const multiPolygon = geometryMultiPolygon();
    expect(convertShapeToSql(multiPolygon)).toEqual(
      `'MULTIPOLYGON((-1 1, -2 2, -3 3, -1 1), (-1 1, -2 2, -3 3, -1 1))'::geometry`,
    );
  });
  it('should convert a geography multiLine', () => {
    const multiLine = geoMultiLine();
    const expected = `'MULTILINESTRING((-1 1, -2 2), (-3 3, -4 4))'::geography`;
    expect(convertShapeToSql(multiLine)).toEqual(expected);
  });
  it('should convert a geometry multiLine', () => {
    const multiLine = geometryMultiLine();
    expect(convertShapeToSql(multiLine)).toEqual(
      `'MULTILINESTRING((-1 1, -2 2), (-3 3, -4 4))'::geometry`,
    );
  });
  it('should convert a circle into a point+buffer', () => {
    const circle = { lat: 1, lon: -1, radius: 100 };
    const expected = `ST_Buffer('POINT(-1 1)'::geography, 100)`;
    expect(convertShapeToSql(circle)).toEqual(expected);
  });

  it('should support SRID values', () => {
    const point = {lat: 1, lon: -1, srid: 4326};
    
    const expected = `'SRID=4326;POINT(-1 1)'::geography`;
    expect(convertShapeToSql(point)).toEqual(expected);
  });

});

describe('containsGeography', () => {
  it('should detect a geo point', () => {
    expect(isValidGeography(geoPoint())).toBe(true);
  });
  it('should detect a geo line string', () => {
    expect(isValidGeography(geoLine())).toBe(true);
  });
  it('should detect an invalid geo coordinate', () => {
    const invalidLine = [
      { y: 1, x: 1 },
      { lat: 2, lon: 2 },
    ];
    expect(isValidGeography(invalidLine)).toBe(false);
  });
  it('should detect a geo polygon', () => {
    expect(isValidGeography(geoPolygon())).toBe(true);
  });
  it('should detect a geo multiPolygon', () => {
    expect(isValidGeography(geoMultiPolygon())).toBe(true);
  });
  it('should detect a geo multiLine', () => {
    expect(isValidGeography(geoMultiLine())).toBe(true);
  });
});

// describe('convertToSimpleShape', () => {
//   it('should convert a point', () => {
//     const point = geoPoint();
//     expect(convertToSimpleShape({ point })).toEqual(point);
//   });
//   it('should convert a line', () => {
//     const line = geoLine();
//     expect(convertToSimpleShape({ line })).toEqual(line);
//   });
//   it('should convert a polygon', () => {
//     const polygon = geoPolygon();
//     expect(convertToSimpleShape({ polygon })).toEqual(polygon);
//   });
//   it('should convert a multiPolygon', () => {
//     const multiPolygon = geoMultiPolygon();
//     expect(convertToSimpleShape({ multiPolygon })).toEqual(multiPolygon);
//   });
//   it('should convert a multiLine', () => {
//     const multiLine = geoMultiLine();
//     expect(convertToSimpleShape({ multiLine })).toEqual(multiLine);
//   });
// });

describe('type guard tests', () => {
  it('is a point', () => {
    expect(isPoint(geoPoint())).toBe(true);
    expect(isPoint(geoCircle())).toBe(false);
  });
  it('is a line', () => {
    expect(isLine(geoLine())).toBe(true);
  });
  it('is a polygon', () => {
    expect(isPolygon(geoPolygon())).toBe(true);
    expect(isMultiPolygon(geoPolygon())).toBe(false);
  });
  it('is a multiPolygon', () => {
    expect(isMultiPolygon(geoMultiPolygon())).toBe(true);
    expect(isPolygon(geoMultiPolygon())).toBe(false);
  });
  it('is a multiLine', () => {
    expect(isMultiLine(geoMultiLine())).toBe(true);
    expect(isLine(geoMultiLine())).toBe(false);
  });
  it('is a circle geography', () => {
    expect(isCircle({ lat: 1, lon: -1, radius: 1 })).toBe(true);
  });
  it('is a circle geometry', () => {
    expect(isCircle({ y: 1, x: -1, radius: 1 })).toBe(true);
  });

  describe('edge cases', () => {
    it('can detect invalid polygon', () => {
      const invalidPolygon = [
        { y: 1, x: 1 },
        { lat: 2, lon: 2 },
      ];
      expect(isPolygon(invalidPolygon)).toBe(false);
    });
    it('can detect empty polygon', () => {
      expect(isPolygon([])).toBe(false);
    });
    it('can detect invalid polygon point array', () => {
      expect(isPolygon([geoPoint()])).toBe(false);
    });
  });
});
