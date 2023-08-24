import { describe, it, expect, beforeAll } from 'vitest';
import { reApplyPlugin, db } from './helpers';
import sql from '@sqltools/formatter';
import dedent from 'dedent-js';

const fmt = (s: string) =>
  sql.format(s, { indent: '  ', reservedWordCase: 'upper', language: 'sql' });

describe('Plugin setup', () => {
  it('should ignore repeated calls to add spatial methods to knex', () => {
    expect(reApplyPlugin).not.toThrow();
  });
});

describe('selectDistance', () => {
  it('should return distance', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128 })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(\`location\`, 'POINT(-104.128 39.87)'::geography) / 1609.34 AS \`distance\`
      FROM \`locations\``,
    );
  });

  it('should ignore distance if undefined input', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      // @ts-expect-error
      .selectDistance('location', { lat: undefined, lon: undefined })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(dedent`
    SELECT \`id\`,
      \`name\`
    FROM \`locations\``);
  });

  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128 })
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(\`location\`, 'POINT(-104.128 39.87)'::geography) / 1609.34 AS \`distance\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });
});

describe('whereDistance', () => {
  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128, radius: 100 })
      .whereDistanceWithin('location', { lat: 39.87, lon: -104.128 }, 100)
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(
          \`location\`,
          ST_Buffer('POINT(-104.128 39.87)'::geography, 100)
        ) / 1609.34 AS \`distance\`
      FROM \`locations\`
      WHERE ST_DWithin(
          \`location\`,
          'POINT(-104.128 39.87)'::geography,
          100
        )
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle undefined input', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .whereDistanceWithin(
        'location',
        // @ts-expect-error
        { lat: undefined, lon: undefined },
        100,
      )
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });
});

describe('selectIntersection', () => {
  it('should return intersection', () => {
    const query = db
      .from('locations')
      .selectIntersection('location', {
        lat: 39.87,
        lon: -104.128,
        radius: 1_000,
      })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`SELECT ST_Intersection(
        \`location\`,
        ST_Buffer('POINT(-104.128 39.87)'::geography, 1000)
      ) AS \`intersection\`
    FROM \`locations\``,
    );
  });
});

// selectBuffer
describe('selectBuffer', () => {
  it('should return buffer', () => {
    const query = db
      .from('locations')
      .selectBuffer({ lat: 39.87, lon: -104.128 }, 1_000)
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      `SELECT ST_Buffer('POINT(-104.128 39.87)'::geography, 1000) AS \`buffer\`
FROM \`locations\``,
    );
  });
});
