import { describe, it, expect } from 'vitest';
import fnBuilder from './functionBuilder';
import { db } from '../helpers';

const builder = fnBuilder(db);

describe('sqlFunctionBuilder: Core Methods', () => {
  it('should build a function', () => {
    const fn = builder('ST_Distance').arg('a').arg('b').build();

    expect(fn).toBe('ST_Distance(`a`, `b`)');
  });

  it('should build a function with an alias', () => {
    const fn = builder('ST_Distance')
      .arg('a')
      .arg('b')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Distance(`a`, `b`) AS `distance`');
  });

  it('should build a function with a unit', () => {
    const fn = builder('ST_Distance')
      .arg('point_a')
      .arg('point_b')
      .unit('miles')
      .build();

    expect(fn).toBe('ST_Distance(`point_a`, `point_b`) / 1609.344');
  });

  it('should build a function with a unit', () => {
    const fn = builder('ST_Distance')
      .arg('point_a')
      .arg('point_b')
      .unit('miles')
      .build();

    expect(fn).toBe('ST_Distance(`point_a`, `point_b`) / 1609.344');
  });

  it('should build a function with a unit and an alias', () => {
    const fn = builder('ST_Distance')
      .arg('point_a')
      .arg('point_b')
      .unit('miles')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Distance(`point_a`, `point_b`) / 1609.344 AS \`distance\`');
  });

  it('should support literal arg "5 miles"', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5 miles')
      .unit('miles')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 1609.344) / 1609.344 AS `distance`');
  });

  it('should support literal arg "5m" (meters)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg(5)
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5) AS `distance`');
  });

  it('should support literal arg "5km" (kilometers)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5km')
      .unit('kilometers')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 1000) / 1000 AS `distance`');
  });

  it('should support literal arg "5ft" (feet)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5ft')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 0.3048) AS `distance`');
  });

  it('should support literal arg "5yd" (yards)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5yd')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 0.9144) AS `distance`');
  });

  it('should support literal arg "5in" (inches)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5in')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 0.0254) AS `distance`');
  });

  it('should support literal arg "5mi" (miles)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5mi')
      .unit('miles')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 1609.344) / 1609.344 AS `distance`');
  });

  it('should support literal arg "5ha" (hectares)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5ha')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 10000) AS `distance`');
  });

  it('should support literal arg "5 hectares"', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5 hectares')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 10000) AS `distance`');
  });
  
  it('should support literal arg "5ac" (acres)', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5ac')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5 * 4046.8564224) AS `distance`');
  });

  it('should support literal Shape: Point', () => {
    const fn = builder('ST_Buffer')
      .arg({lat: 1, lon: -1})
      .arg('250mi')
      .unit('meters')
      .alias('distance')
      .build();

    expect(fn).toBe("ST_Buffer('POINT(-1 1)'::geography, 250 * 1609.344) AS `distance`");
  });

  it('should support unit arg "hectares"', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5 meters')
      .unit('hectares')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5) / 10000 AS `distance`');
  });

  it('should support unit arg "acres"', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5 meters')
      .unit('acres')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5) / 4046.8564224 AS `distance`');
  });

  it('should support unit arg "feet"', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5 meters')
      .unit('feet')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5) / 0.3048 AS `distance`');
  });

  it('should support unit arg "yards"', () => {
    const fn = builder('ST_Buffer')
      .arg('point_a')
      .arg('5 meters')
      .unit('yards')
      .alias('distance')
      .build();

    expect(fn).toBe('ST_Buffer(`point_a`, 5) / 0.9144 AS `distance`');
  });

});
