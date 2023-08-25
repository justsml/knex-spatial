import knex, { Knex } from 'knex';
import { parseShapeOrColumnToSafeSql } from './shapeUtils';
import { convertFromUnitToMeters, metersToUnitMathLiteral } from './units';

function fnBuilder(db: Knex) {
  const helpers = {
    oneArg: (
      methodName: string,
      shapeOrColumn: ShapeColumnOrLiteral,
    ): Knex.Raw =>
      db.raw(`${methodName}(${parseShapeOrColumnToSafeSql(shapeOrColumn)})`),
    twoArg: (
      methodName: string,
      left: ShapeOrColumn,
      right: ShapeColumnOrLiteral,
    ) =>
      db.raw(
        `${methodName}(${parseShapeOrColumnToSafeSql(
          left,
        )}, ${parseShapeOrColumnToSafeSql(right)})`,
      ),
    threeArg: (
      methodName: string,
      left: ShapeOrColumn,
      right: ShapeOrColumn,
      thirdArg: ShapeColumnOrLiteral,
    ) =>
      db.raw(
        `${methodName}(${parseShapeOrColumnToSafeSql(
          left,
        )}, ${parseShapeOrColumnToSafeSql(
          right,
        )}, ${parseShapeOrColumnToSafeSql(thirdArg)})`,
      ),

    thirdArgIsDistance: (
      methodName: string,
      left: ShapeOrColumn,
      right: ShapeOrColumn,
      thirdArg: number,
      unit: Unit,
    ) =>
      helpers.threeArg(
        methodName,
        left,
        right,
        convertFromUnitToMeters(Number(thirdArg), unit),
      ),

    secondArgIsDistance: (
      methodName: string,
      left: ShapeOrColumn,
      secondArg: number,
      unit: Unit,
    ) =>
      helpers.twoArg(
        methodName,
        left,
        convertFromUnitToMeters(Number(secondArg), unit),
      ),

    applyUnitToExpression: (rawSql: Knex.Raw, unit: Unit) =>
      rawSql.toSQL().toNative().sql + metersToUnitMathLiteral(unit),
    applyAliasToExpression: (rawSql: Knex.Raw, alias: string) =>
      rawSql.toSQL().toNative().sql + ` AS ${alias}`,
    applyAliasAndUnitToExpression: (
      rawSql: Knex.Raw,
      alias: string,
      unit: Unit,
    ) =>
      rawSql.toSQL().toNative().sql +
      metersToUnitMathLiteral(unit) +
      ` AS ${alias}`,
  };
  return helpers;
}
