import { Knex } from 'knex';
import { isValidShape, parseShapeOrColumnToSafeSql } from './shapeUtils';
import { hasUnits, metersToUnitMathLiteral, parseHumanNumber, unitToMetersMathLiteral } from './units';
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

  // arg(_arg: ShapeColumnOrLiteral): ThisType<SqlFunctionBuilder>;
  arg(_arg: ShapeColumnOrLiteral, unit: undefined | Unit = undefined): SqlFunctionBuilder {
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
          const {value, unit} = parseHumanNumber(_arg);
          this._arguments.push(`${value}${unitToMetersMathLiteral(unit)}`);
          return this;
        }
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
    const { _db, _name, _arguments, _unit, _alias, _aggregateFns } = this;
    if (_arguments[0] === undefined) return ''; // throw new Error('Invalid argument provided to SqlFunctionBuilder');
    const fn = _db.raw(`${_name}(${_arguments.join(', ')})`);
    const fnWithUnit = `${fn}${metersToUnitMathLiteral(_unit)}`;
    const fnColumnExpression = _alias ? `${fnWithUnit} AS ${safeColumn(_alias)}` : fnWithUnit;
    return _aggregateFns.reduce((acc, fn) => `${fn}(${acc})`, fnColumnExpression);
  }
}

// function fnBuilder(db: Knex) {
//   const helpers = {
//     oneArg: (
//       methodName: string,
//       shapeOrColumn: ShapeColumnOrLiteral,
//     ): Knex.Raw =>
//       db.raw(`${methodName}(${parseShapeOrColumnToSafeSql(shapeOrColumn)})`),
//     twoArg: (
//       methodName: string,
//       left: ShapeOrColumn,
//       right: ShapeColumnOrLiteral,
//     ) =>
//       db.raw(
//         `${methodName}(${parseShapeOrColumnToSafeSql(
//           left,
//         )}, ${parseShapeOrColumnToSafeSql(right)})`,
//       ),
//     threeArg: (
//       methodName: string,
//       left: ShapeOrColumn,
//       right: ShapeOrColumn,
//       thirdArg: ShapeColumnOrLiteral,
//     ) =>
//       db.raw(
//         `${methodName}(${parseShapeOrColumnToSafeSql(
//           left,
//         )}, ${parseShapeOrColumnToSafeSql(
//           right,
//         )}, ${parseShapeOrColumnToSafeSql(thirdArg)})`,
//       ),

//     thirdArgIsDistance: (
//       methodName: string,
//       left: ShapeOrColumn,
//       right: ShapeOrColumn,
//       thirdArg: number,
//       unit: Unit,
//     ) =>
//       helpers.threeArg(
//         methodName,
//         left,
//         right,
//         convertFromUnitToMeters(Number(thirdArg), unit),
//       ),

//     secondArgIsDistance: (
//       methodName: string,
//       left: ShapeOrColumn,
//       secondArg: number,
//       unit: Unit,
//     ) =>
//       helpers.twoArg(
//         methodName,
//         left,
//         convertFromUnitToMeters(Number(secondArg), unit),
//       ),

//     applyUnitToExpression: (rawSql: Knex.Raw, unit: Unit) =>
//       rawSql.toSQL().toNative().sql + metersToUnitMathLiteral(unit),
//     applyAliasToExpression: (rawSql: Knex.Raw, alias: string) =>
//       rawSql.toSQL().toNative().sql + ` AS ${alias}`,
//     applyAliasAndUnitToExpression: (
//       rawSql: Knex.Raw,
//       alias: string,
//       unit: Unit,
//     ) =>
//       rawSql.toSQL().toNative().sql +
//       metersToUnitMathLiteral(unit) +
//       ` AS ${alias}`,
//   };
//   return helpers;
// }
