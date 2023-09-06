import { describe, it, expect } from "vitest";
import { parseMeasurement, unitToMetersMathLiteral } from "./units";

describe("parseMeasurement", () => {

  it("should throw on invalid unit: 'boop'", () => {
    expect(() => parseMeasurement("1 boop")).toThrow();
  });

  it("should handle shorthand unit: 'm'", () => {
    expect(parseMeasurement("1 m")).toEqual({ value: 1, unit: "meters" });
  });

  it("should handle unit: 'kilometer'", () => {
    expect(parseMeasurement("1 kilometer")).toEqual({ value: 1, unit: "kilometers" });
  });

});

describe('unitToMetersMathLiteral', () => {
  it('should handle invalid input', () => {
    // @ts-expect-error
    expect(unitToMetersMathLiteral('invalid')).toBe('');
  })
})