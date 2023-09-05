console.warn(`TODO: Make safeSql() more robust!`);
export const safeSql = (s: string) => s.replace(/[']+/gm, '\'');
export const safeColumn = (s: string) => `'` + safeSql(s) + `'`;


/** Tagged template literal fn */
export const saferSql = (strings: TemplateStringsArray, ...values: any[]) =>
  strings.reduce(
    (acc, str, i) => acc + safeSql(str) + (values[i] || ''),
    '',
  );
  // Example usage of safer:
  // const sql = safer`SELECT * FROM ${tableName} WHERE ${columnName} = ${columnValue}`;
// a template literal tag for escaping SQL primitive values
// const safev = (strings: TemplateStringsArray, ...values: any[]) =>
//   strings.reduce(
//     (acc, str, i) => acc + str + _db.raw('?', [values[i]]),
//     '',
//   );

