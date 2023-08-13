import { describe, it, expect, beforeAll } from 'vitest';
import { reApplyPlugin, db } from './helpers';
import { knex } from 'knex';

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

    expect(query.sql).toBe(
      "select `id`, `name`, ST_Distance(`location`, 'POINT(-104.128 39.87)'::geography) / 1609.34 AS `distance` from `locations`",
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

    expect(query.sql).toBe('select `id`, `name` from `locations`');
  });

  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128 })
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(query.sql).toBe(
      "select `id`, `name`, ST_Distance(`location`, 'POINT(-104.128 39.87)'::geography) / 1609.34 AS `distance` from `locations` order by `distance` asc",
    );
  });
});

describe('whereDistance', () => {
  it('should include & sort on distance in query', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .selectDistance('location', { lat: 39.87, lon: -104.128, radius: 100 })
      .whereDistanceWithin(
        'location',
        { lat: 39.87, lon: -104.128, radius: 100 },
        100,
      )
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(query.sql).toBe(
      "select `id`, `name`, ST_Distance(`location`, ST_Buffer('POINT(-104.128 39.87)'::geography, 100)) / 1609.34 AS `distance` from `locations` where ST_DWithin(`location`, ST_Buffer('POINT(-104.128 39.87)'::geography, 100), ?) order by `distance` asc",
    );
  });

  it('should handle undefined input', () => {
    const query = db
      .from('locations')
      .select('id', 'name')
      .whereDistanceWithin(
        'location',
        // @ts-expect-error
        { lat: undefined, lon: -104.128, radius: 100 },
        100,
      )
      .orderBy('distance')
      .toSQL()
      .toNative();

    expect(query.sql).toBe(
      "select `id`, `name` from `locations` order by `distance` asc",
    );
  });
});
