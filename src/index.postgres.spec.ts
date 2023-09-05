import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './helpers';
import sql from '@sqltools/formatter';
import dedent from 'dedent-js';
import sqlFunctionBuilder from './utils/functionBuilder';
import sqlShape from './utils/sqlUtils';
const sqlFn = sqlFunctionBuilder(db);

// convert knex results to csv
const toCsv = (results: any[]) => {
  if (results.length === 0) return '';
  const headers = Object.keys(results[0]).join(', ');
  const rows = results.map((row) => Object.values(row).join(', '));
  return headers.concat('\n', rows.join('\n'));
};

const sqlShapeHelper = sqlShape(db);

beforeAll(async () => {
  await db.schema.dropTableIfExists('locations');

  await db.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await db.schema.createTable('locations', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.specificType('a_point', 'geography(point, 4326)').comment('a nearby notable location');
    table.specificType('b_point', 'geography(point, 4326)').comment('another nearby notable location');
    table.specificType('location', 'geography(point, 4326)');
  });
  await db('locations').insert([
    {
      name: 'Denver',
      a_point: sqlShapeHelper.toRaw({ lat: 39.92, lon: -105.001 }),
      b_point: sqlShapeHelper.toRaw({ lat: 39.12, lon: -104.895 }),
      location: sqlShapeHelper.toRaw({
        lat: 39.7392,
        lon: -104.9903,
      }),
    },
    {
      name: 'Boulder',
      a_point: sqlShapeHelper.toRaw({ lat: 40.1121, lon: -105.2695 }),
      b_point: sqlShapeHelper.toRaw({ lat: 40.0198, lon: -105.2711 }),
      location: sqlShapeHelper.toRaw({
        lon: -105.2705,
        lat: 40.015,
      }),
    },
    {
      name: 'Colorado Springs',
      a_point: sqlShapeHelper.toRaw({ lat: 38.8349, lon: -104.8124 }),
      b_point: sqlShapeHelper.toRaw({ lat: 38.8344, lon: -104.8242 }),
      location: sqlShapeHelper.toRaw({
        lon: -104.8214,
        lat: 38.8339,
      }),
    },
    {
      name: 'Fort Collins',
      a_point: sqlShapeHelper.toRaw({ lat: 40.5853, lon: -105.0844 }),
      b_point: sqlShapeHelper.toRaw({ lat: 40.5733, lon: -105.0678 }),
      location: sqlShapeHelper.toRaw({
        lon: -105.0844,
        lat: 40.5853,
      }),
    },
    {
      name: 'London',
      a_point: sqlShapeHelper.toRaw({ lat: 51.5105, lon: -0.1289 }),
      b_point: sqlShapeHelper.toRaw({ lat: 51.5501, lon: -0.1269 }),
      location: sqlShapeHelper.toRaw({
        lon: -0.1278,
        lat: 51.5074,
      }),
    },
    {
      name: 'Dublin',
      location: sqlShapeHelper.toRaw({
        lon: -6.2603,
        lat: 53.3498,
      }),
    },
    {
      name: 'Johannesburg',
      location: sqlShapeHelper.toRaw({
        lon: 28.0473,
        lat: -26.2041,
      }),
    },
  ]);
});

describe('selectDistance', async () => {
  it('should return distance', async () => {
    const results = await db
      .from('locations')
      .select('id', 'name')
      .selectDistance(
        'location',
        { lat: 39.87, lon: -104.128 },
        'distance',
        'miles',
      )
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      id, name, distance
      1, Denver, 46.76364343556754
      2, Boulder, 61.49208742434806
      3, Colorado Springs, 80.54810033585734
      4, Fort Collins, 70.66702320273974
      5, London, 4661.361410293635
      6, Dublin, 4375.31609420101
      7, Johannesburg, 9548.97453837791`,
    );
  });

  it('should ignore distance if undefined input', async () => {
    const results = db
      .from('locations')
      .select('id', 'name')
      // @ts-expect-error
      .selectDistance('location', { lat: undefined, lon: undefined })
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`
    SELECT \`id\`,
      \`name\`
    FROM \`locations\``);
  });

  it('should include & sort on distance in query', async () => {
    const results = db
      .from('locations')
      .select('id', 'name')
      .selectDistance(
        'location',
        { lat: 39.87, lon: -104.128 },
        'distance',
        'miles',
      )
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(\`location\`, 'POINT(-104.128 39.87)'::geography) / 1609.344 AS \`distance\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should include & sort on distance in query', async () => {
    const results = db
      .from('locations')
      .selectDistance(
        'location',
        { lat: 39.87, lon: -104.128 },
        'distance',
        'meters',
      )
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT ST_Distance(\`location\`, 'POINT(-104.128 39.87)'::geography) AS \`distance\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });
});

describe('selectBuffer', async () => {
  it('should return buffer on shape', async () => {
    const results = db
      .from('locations')
      .selectBuffer({ lat: 39.87, lon: -104.128 }, 1_000, 'meters')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT ST_Buffer('POINT(-104.128 39.87)'::geography, 1000) AS \`buffer\`
      FROM \`locations\``,
    );
  });

  it('should return buffer using miles', async () => {
    const results = db
      .from('locations')
      .selectBuffer({ lat: 39.87, lon: -104.128 }, '10mi')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT ST_Buffer(
          'POINT(-104.128 39.87)'::geography,
          10 * 1609.344
        ) AS \`buffer\`
      FROM \`locations\``,
    );
  });

  it('should return buffer on column', async () => {
    const results = db
      .from('locations')
      .selectBuffer('location', 1_000, 'meters')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT ST_Buffer(\`location\`, 1000) AS \`buffer\`
      FROM \`locations\``,
    );
  });

  it('should return buffer in miles', async () => {
    const results = db
      .from('locations')
      .selectBuffer('location', '1000 miles', 'miles')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT ST_Buffer(\`location\`, 1000 * 1609.344) / 1609.344 AS \`buffer\`
      FROM \`locations\``,
    );
  });

  it('should return buffer on column', async () => {
    const results = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectBuffer('location', undefined)
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\``,
    );
  });

  it('should ignore invalid shape', async () => {
    const results = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectBuffer({ lat: undefined, lon: -1 }, 1_000)
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\``,
    );
  });
});

describe.only('whereDistance', async () => {
  it('should include & sort on distance in query', async () => {
    const results = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128, radius: '100 km' }, 'distance')
      .whereDistance('location', { lat: 39.87, lon: -104.128 }, '<=', 10000)
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(
          \`location\`,
          ST_Buffer('POINT(-104.128 39.87)'::geography, 100)
        ) AS \`distance\`
      FROM \`locations\`
      WHERE ST_Distance(\`location\`, 'POINT(-104.128 39.87)'::geography) <= 100
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should compute distance w/ 2 columns', async () => {
    const results = db
      .from('locations')
      .select('id')
      .selectDistance('location', 'a_point', 'distance', 'miles')
      .orderBy('distance', 'desc')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      id, distance
      7, 
      6, 
      1, 12.486675747658673
      2, 6.69957384995377
      3, 0.4904467100880856
      5, 0.2195016917079257
      4, 0`,
    );
  });

  it('should handle invalid distance arg', async () => {
    const badQuery = () =>
      db
        .from('locations')
        .whereDistance(
          'location',
          { lat: 39.87, lon: -104.128 },
          '<=',
          undefined,
        )
        .then((data) => data);

    expect(badQuery).toThrow();
  });

  it('should handle invalid operator arg', async () => {
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
        .then((data) => data);

    expect(badQuery).toThrow();
  });

  it('should ignore undefined args', async () => {
    const results = db
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
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle distance in meters', async () => {
    const results = db
      .from('locations')
      .select('id')
      .selectDistance('location', 'a_point', 'distance', 'meters')
      .whereDistance('location', 'a_point', '<=', 100, 'meters')
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      id, distance
      4, 0`
      );
  });
});

describe('whereDistanceWithin', async () => {
  it('should include & sort on distance in query', async () => {
    const results = db
      .from('locations')
      .select('id', 'name')
      .selectDistance(
        'location',
        { lat: 39.87, lon: -104.128, radius: 100 },
        'distance',
        'meters',
      )
      .whereDistanceWithin(
        'location',
        { lat: 39.87, lon: -104.128 },
        100,
        'meters',
      )
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`,
        ST_Distance(
          \`location\`,
          ST_Buffer('POINT(-104.128 39.87)'::geography, 100)
        ) AS \`distance\`
      FROM \`locations\`
      WHERE ST_DWithin(
          \`location\`,
          'POINT(-104.128 39.87)'::geography,
          100
        )
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should ignore bad shape', async () => {
    const results = db
      .from('locations')
      .select('id', 'name')
      .whereDistanceWithin(
        'location',
        // @ts-expect-error
        { lat: undefined, lon: undefined },
        100,
      )
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`,
        \`name\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should ignore undefined args', async () => {
    const results = db
      .from('locations')
      .select('id')
      .whereDistanceWithin(
        'location',
        // @ts-expect-error
        undefined,
        100,
      )
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle 2 named columns', async () => {
    const results = db
      .from('locations')
      .select('id')
      .whereDistanceWithin('a_location', 'a_point', 100, 'meters')
      .orderBy('distance')
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`
      SELECT \`id\`
      FROM \`locations\`
      WHERE ST_DWithin(\`a_location\`, \`a_point\`, 100)
      ORDER BY \`distance\` ASC`,
    );
  });

  it('should handle invalid distance arg', async () => {
    const badQuery = () =>
      db
        .from('locations')
        .select('id')
        .whereDistanceWithin('a_location', 'a_point', undefined)
        .then((data) => data);

    expect(badQuery).toThrow();
  });
});

describe('selectIntersection', async () => {
  it('should return intersection w/ column & shape', async () => {
    const results = db
      .from('locations')
      .selectIntersection('location', {
        lat: 39.87,
        lon: -104.128,
      })
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`
    SELECT ST_Intersection(\`location\`, 'POINT(-104.128 39.87)'::geography) AS \`intersection\`
    FROM \`locations\``);
  });

  it('should return intersection w/ shape & shape', async () => {
    const results = db
      .from('locations')
      .selectIntersection(
        { lat: 39, lon: -105, radius: 500 },
        {
          lat: 39.87,
          lon: -104.128,
          radius: 1_000,
        },
      )
      .then((data) => data);

    expect(toCsv(await results)).toBe(
      dedent`SELECT ST_Intersection(
        ST_Buffer('POINT(-105 39)'::geography, 500),
        ST_Buffer('POINT(-104.128 39.87)'::geography, 1000)
      ) AS \`intersection\`
    FROM \`locations\``,
    );
  });

  it('should ignore invalid shapes', async () => {
    const results = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectIntersection('location', {
        lat: undefined,
        lon: -104.128,
        radius: 1_000,
      })
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`SELECT \`id\`
  FROM \`locations\``);
  });
});

describe('selectArea', async () => {
  it('should return area w/ column', async () => {
    const results = db
      .from('locations')
      .select('id')
      .selectArea('location')
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`
    SELECT \`id\`,
      ST_Area(\`location\`) AS \`area\`
    FROM \`locations\``);
  });

  it('should return area w/ column', async () => {
    const results = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .selectArea({ radius: undefined })
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`
    SELECT \`id\`
    FROM \`locations\``);
  });
});

describe('whereContains', async () => {
  it('handles column & shape', async () => {
    const results = db
      .from('locations')
      .select('id')
      .whereContains('location', {
        lat: 39.87,
        lon: -104.128,
      })
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`
    SELECT \`id\`
    FROM \`locations\`
    WHERE ST_Contains(\`location\`, 'POINT(-104.128 39.87)'::geography)`);
  });

  it('handles invalid shape', async () => {
    const results = db
      .from('locations')
      .select('id')
      // @ts-expect-error
      .whereContains('location', {
        lat: undefined,
        lon: -104.128,
      })
      .then((data) => data);

    expect(toCsv(await results)).toBe(dedent`
    SELECT \`id\`
    FROM \`locations\``);
  });
});

describe('selectBuffer', async () => {
  it('should throw in invalid distance', async () => {
    expect(() =>
      db
        .from('locations')
        .select('id')
        .selectBuffer('location', NaN)
        .toSQL()
        .toNative(),
    ).toThrow();
  });
});
