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
      .selectDistance('location', { lat: 39.87, lon: -104.128 }, 'distance', 'miles')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance("location", 'POINT(-104.128 39.87)'::geography) / 1609.344 AS \`distance\`
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
      .selectDistance('location', { lat: 39.87, lon: -104.128 }, 'distance', 'miles')
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance("location", 'POINT(-104.128 39.87)'::geography) / 1609.344 AS \`distance\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .selectDistance(
        'location',
        { lat: 39.87, lon: -104.128 },
        'distance',
        'meters',
      )
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT ST_Distance("location", 'POINT(-104.128 39.87)'::geography) AS \`distance\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });
});

describe('selectBuffer', () => {
  it('should return buffer on shape', () => {
    const query = db
      .from('locations')
      .selectBuffer({ lat: 39.87, lon: -104.128 }, 1_000, 'meters')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT ST_Buffer('POINT(-104.128 39.87)'::geography, 1000) AS buffer
      FROM \`locations\``,
    );
  });

  it('should return buffer using miles', () => {
    const query = db
      .from('locations')
      .selectBuffer({ lat: 39.87, lon: -104.128 }, '10mi')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT ST_Buffer(
          'POINT(-104.128 39.87)'::geography,
          10 * 1609.344
        ) AS buffer
      FROM \`locations\``,
    );
  });

  it('should return buffer on column', () => {
    const query = db
      .from('locations')
      .selectBuffer('location', 1_000, 'meters')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT ST_Buffer("location", 1000) AS buffer
      FROM \`locations\``,
    );
  });

  it('should return buffer in miles', () => {
    const query = db
      .from('locations')
      .selectBuffer('location', '1000 miles', 'miles')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT ST_Buffer("location", 1000 * 1609.344) / 1609.344 AS buffer
      FROM \`locations\``,
    );
  });

  it('should return buffer on column', () => {
    const query = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectBuffer('location', undefined)
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\``,
    );
  });

  it('should ignore invalid shape', () => {
    const query = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectBuffer({ lat: undefined, lon: -1 }, 1_000)
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\``,
    );
  });
});

describe('whereDistance', () => {
  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128, radius: 100 })
      .whereDistance('location', { lat: 39.87, lon: -104.128 }, '<=', 100)
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(
          "location",
          ST_Buffer('POINT(-104.128 39.87)'::geography, 100)
        ) AS \`distance\`
      FROM \`locations\`
      WHERE ST_Distance("location", 'POINT(-104.128 39.87)'::geography) <= 100
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should compute distance w/ 2 columns', () => {
    const query = db
      .from('locations')
      .select('id')
      .selectDistance('location', 'a_point', 'distance', 'miles')
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        ST_Distance("location", "a_point") / 1609.344 AS \`distance\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle invalid distance arg', () => {
    const badQuery = () =>
      db
        .from('locations')
        .whereDistance(
          'location',
          { lat: 39.87, lon: -104.128 },
          '<=',
          undefined,
        )
        .toSQL()
        .toNative();

    expect(badQuery).toThrow();
  });

  it('should handle invalid operator arg', () => {
    const badQuery = () =>
      db
        .from('locations')
        .whereDistance(
          'location',
          { lat: 39.87, lon: -104.128 },
          // @ts-expect-error
          '>>>',
          undefined,
        )
        .toSQL()
        .toNative();

    expect(badQuery).toThrow();
  });

  it('should ignore undefined args', () => {
    const query = db
      .from('locations')
      .select('id')
      .whereDistance(
        'location',
        // @ts-expect-error
        undefined,
        '>=',
        100,
      )
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle distance in meters', () => {
    const query = db
      .from('locations')
      .select('id')
      .whereDistance('location', 'a_point', '<=', 100, 'meters')
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      WHERE ST_Distance("location", "a_point") <= 100
      ORDER BY \`distance\` ASC`,
    );
  });
});

describe('whereDistanceWithin', () => {
  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128, radius: 100 }, 'distance', 'meters')
      .whereDistanceWithin('location', { lat: 39.87, lon: -104.128 }, 100, 'meters')
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(
          "location",
          ST_Buffer('POINT(-104.128 39.87)'::geography, 100)
        ) AS \`distance\`
      FROM \`locations\`
      WHERE ST_DWithin(
          "location",
          'POINT(-104.128 39.87)'::geography,
          100
        )
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should ignore bad shape', () => {
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

  it('should ignore undefined args', () => {
    const query = db
      .from('locations')
      .select('id')
      .whereDistanceWithin(
        'location',
        // @ts-expect-error
        undefined,
        100,
      )
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle 2 named columns', () => {
    const query = db
      .from('locations')
      .select('id')
      .whereDistanceWithin('a_location', 'a_point', 100, 'meters')
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      WHERE ST_DWithin("a_location", "a_point", 100)
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle invalid distance arg', () => {
    const badQuery = () =>
      db
        .from('locations')
        .select('id')
        .whereDistanceWithin('a_location', 'a_point', undefined)
        .toSQL()
        .toNative();

    expect(badQuery).toThrow();
  });
});

describe('selectIntersection', () => {
  it('should return intersection w/ column & shape', () => {
    const query = db
      .from('locations')
      .selectIntersection('location', {
        lat: 39.87,
        lon: -104.128,
      })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(dedent`
    SELECT ST_Intersection("location", 'POINT(-104.128 39.87)'::geography) AS \`intersection\`
    FROM \`locations\``);
  });

  it('should return intersection w/ shape & shape', () => {
    const query = db
      .from('locations')
      .selectIntersection(
        { lat: 39, lon: -105, radius: 500 },
        {
          lat: 39.87,
          lon: -104.128,
          radius: 1_000,
        },
      )
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(
      dedent`SELECT ST_Intersection(
        ST_Buffer('POINT(-105 39)'::geography, 500),
        ST_Buffer('POINT(-104.128 39.87)'::geography, 1000)
      ) AS \`intersection\`
    FROM \`locations\``,
    );
  });

  it('should ignore invalid shapes', () => {
    const query = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectIntersection('location', {
        lat: undefined,
        lon: -104.128,
        radius: 1_000,
      })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(dedent`SELECT \`id\`
  FROM \`locations\``);
  });
});

describe('selectArea', () => {
  it('should return area w/ column', () => {
    const query = db
      .from('locations')
      .select('id')
      .selectArea('location')
      .toSQL()
      .toNative();
      
    expect(fmt(query.sql)).toBe(dedent`
    SELECT \`id\`,
      ST_Area("location") AS \`area\`
    FROM \`locations\``);
  });

  it('should return area w/ column', () => {
    const query = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectArea({radius: undefined})
      .toSQL()
      .toNative();
      
    expect(fmt(query.sql)).toBe(dedent`
    SELECT \`id\`
    FROM \`locations\``);
  });

});

describe('whereContains', () => {
  it('handles column & shape', () => {
    const query = db
      .from('locations')
      .select('id')
      .whereContains('location', {
        lat: 39.87,
        lon: -104.128,
      })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(dedent`
    SELECT \`id\`
    FROM \`locations\`
    WHERE ST_Contains("location", 'POINT(-104.128 39.87)'::geography)`);
  });

  it('handles invalid shape', () => {
    const query = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .whereContains('location', {
        lat: undefined,
        lon: -104.128,
      })
      .toSQL()
      .toNative();

    expect(fmt(query.sql)).toBe(dedent`
    SELECT \`id\`
    FROM \`locations\``);
  });
});

describe('selectBuffer', () => {
  it('should throw in invalid distance', () => {
    expect(() => db
      .from('locations')
      .select('id')
      .selectBuffer('location', NaN)
      .toSQL()
      .toNative()
    ).toThrow();
  });
});