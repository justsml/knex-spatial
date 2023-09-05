import Knex from 'knex';
import KnexSpatialPlugin from './';

/* c8 ignore next */
const testMode = process.env.TEST_MODE === 'pg' ? 'pg' : 'sqlite3';
let connection: any =
  /* c8 ignore next */
  testMode === 'pg'
    ? /* c8 ignore next */
      'postgres://postgres:postgres@127.0.0.1:25432/postgres'
    : {
        filename: ':memory:',
      };

export const db = Knex({
  asyncStackTraces: true,
  compileSqlOnError: true,
  client: testMode, // Using SQLite because we aren't using a DB here, just emitting the generated SQL
  useNullAsDefault: true,
  connection,
});

KnexSpatialPlugin(db);

export const reApplyPlugin = () => KnexSpatialPlugin(db);
