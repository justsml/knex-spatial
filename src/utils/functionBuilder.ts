import { Knex } from 'knex';
import { isValidShape, parseShapeOrColumnToSafeSql, shapeContainsUndefined } from './shapeUtils';
import { hasUnits, metersToUnitMathLiteral, parseHumanMeasurement, unitToMetersMathLiteral } from './units';
import { safeColumn } from './escaping';

export default function sqlFunctionBuilder(db: Knex) {
  return (name?: string) => new SqlFunctionBuilder(db).name(name!);
}

class SqlFunctionBuilder {
  private _db: Knex;
  private _name: string;
  private _arguments: any[]; // TODO: Use Knex.Raw instead of any
  private _unit: Unit;
  private _alias: string;

  /** Indicates an invalid state was encountered, do not emit broken fragments of SQL */
  _preventBuild: boolean = false;

  // Advanced
  private _aggregateFns: string[];

  constructor(
    db: Knex
  ) {
    this._db = db;
    this._name = '';
    this._arguments = [];
    this._unit = 'meters';
    this._alias = '';
    this._aggregateFns = [];
  }

  name(_name: string) {
    this._name = _name;
    return this;
  }

  arg(_arg: ShapeColumnOrLiteral, unit: undefined | Unit = undefined): SqlFunctionBuilder {
    if (shapeContainsUndefined(_arg) || _arg === undefined) {
      this._preventBuild = true;
      return this;
    }

    const isShape = isValidShape(_arg);
    let sqlExpr = parseShapeOrColumnToSafeSql(_arg);

    if (unit) {
      // verify how we can convert shape/Column expression to safe sql
      if (typeof _arg === 'string') {
        this._arguments.push(this._db.raw(`??${unitToMetersMathLiteral(unit)}`, [_arg]));
      } else if (typeof _arg === 'number') {
        this._arguments.push(`${_arg}${unitToMetersMathLiteral(unit)}`);
      } else if (isShape) {
        this._arguments.push(sqlExpr + unitToMetersMathLiteral(unit));
      } else {
        throw new Error(`Invalid argument: ${_arg}, or Generated expression: ${sqlExpr}`);
      }
    } else {
      // check for human readable unit suffix
      if (typeof _arg === 'string') {
        const isHumanReadableUnit = hasUnits(_arg);
        if (isHumanReadableUnit) {
          const {value, unit} = parseHumanMeasurement(_arg);
          this._arguments.push(`${value}${unitToMetersMathLiteral(unit)}`);
          return this;
        }
      } else if (typeof _arg === 'number') {
        this._arguments.push(_arg);
        return this;
      }
      this._arguments.push(sqlExpr);
    }
    return this;
  }

  alias(_alias: string) {
    this._alias = _alias;
    return this;
  }

  unit(_unit: Unit) {
    this._unit = _unit;
    return this;
  }

  wrap(aggregateFn: string) {
    this._aggregateFns.push(aggregateFn);
    return this;
  }

  build() {
    if (this._preventBuild) return '';
    const { _db, _name, _arguments, _unit, _alias, _aggregateFns } = this;
    const fn = _db.raw(`${_name}(${_arguments.join(', ')})`);
    const fnWithUnit = `${fn}${metersToUnitMathLiteral(_unit)}`;
    const aggFns = _aggregateFns.reduce((acc, fn) => `${fn}(${acc})`, fnWithUnit)
    const fnColumnExpression = _alias ? `${aggFns} AS ${safeColumn(_alias)}` : fnWithUnit;
    return fnColumnExpression;
  }

  toString() {
    return this.build();
  }

  /**
   * # *Danger* - internal use only!
   * 
   * TODO: Make this a 'private' (maybe with symbol) method?
   */
  toRaw() {
    return this._db.raw(this.build());
  }
}
