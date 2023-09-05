import { Knex } from "knex";
import { convertShapeToSql } from "..";

export default function sqlShape(db: Knex) {
  return new SqlShape(db);
}

export class SqlShape {
  private _db: Knex<any, any[]>;
  constructor(
    db: Knex
  ) {
    this._db = db;
  }

  toRaw(shape: Shape): Knex.Raw {
    return this._db.raw(`${convertShapeToSql(shape)}`);
  }
}
