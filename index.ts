import 'knex';
import { Knex, knex } from 'knex';

/**
 * # Knex Full-Text Search Plugin
 *
 * This plugin adds some useful methods to the knex query builder: selectWebSearchRank, whereWebSearch.
 *
 * ## Usage
 *
 * ```ts
 * import Knex from 'knex';
 * import knexFullTextSearch from '../../shared/knexFullTextSearch';
 *
 * export const db = Knex(config);
 * 
 * knexFullTextSearch(db);
 * 
 * const results = await db('table')
 *   .selectWebSearchRank('tsvector_column', 'search query')
 *   .whereWebSearch('tsvector_column', 'search query')
 *   .orderBy('rank', 'desc');
 * ```
 */
export default function knexFullTextSearch(db: Knex) {
  // @ts-expect-error
  if (db['whereDistanceWithinMiles']) return db;

  knex.QueryBuilder.extend(
    'whereWebSearch',
    function whereWebSearch(
      tsVectorColumn: string,
      query: string | null | undefined,
    ) {
      return query === undefined
        ? this
        : this.whereRaw(`?? @@ websearch_to_tsquery('simple', ?)`, [
            tsVectorColumn,
            query,
          ]);
    },
  );
  knex.QueryBuilder.extend(
    'selectWebSearchRank',
    function selectWebSearchRank(
      tsVectorColumn: string,
      query: string | null | undefined,
      columnAlias = 'rank',
    ) {
      return query === undefined
        ? this
        : this.select(
            db.raw(`ts_rank(??, websearch_to_tsquery('simple', ?)) as ??`, [
              tsVectorColumn,
              query,
              columnAlias,
            ]),
          );
    },
  );

  return db;
}

declare module 'knex' {
  namespace Knex {
    interface QueryInterface<TRecord extends {} = any, TResult = any> {

      /** Full-text Search: Queries a tsvector column using postgres' websearch_to_tsquery. */
      whereWebSearch(
        tsVectorColumn: string,
        query: string | null | undefined,
      ): QueryBuilder<TRecord, TResult>;

      /** Full-text Search: Add an FTS search rank column. */
      selectWebSearchRank(
        tsVectorColumn: string,
        query: string | null | undefined,
        columnAlias?: string,
      ): QueryBuilder<TRecord, TResult>;

    }
  }
}