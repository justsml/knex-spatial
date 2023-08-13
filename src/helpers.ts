import Knex from 'knex';
import KnexSpatialPlugin from './';

export const db = Knex({
  asyncStackTraces: true,
  compileSqlOnError: true,

  client: 'sqlite3', // Using SQLite because we aren't using a DB here, just emitting the generated SQL
  useNullAsDefault: true,
  connection: {
    filename: ':memory:',
  },
});

KnexSpatialPlugin(db);

export const reApplyPlugin = () => KnexSpatialPlugin(db);
