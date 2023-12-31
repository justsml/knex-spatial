
export const parseMeasurementSafe = (s: string) => {
  try {
    return parseMeasurement(s);
  } catch (e) {
    return null;
  }
};

/**
 * @public
 * 
 * Parses human-readable measurements. e.g. "1 mile", "100 meters", "1.5 km", etc.
 *
 * ## Example
 *
 * ```js
 * parseMeasurement('1 mile'); // { value: 1, unit: 'miles' }
 */
export function parseMeasurement(distanceString: string): {
  value: number;
  unit: Unit;
} {
  // Note: Don't use symmetric parsing here. `parseFloat` is doing some lift here.
  const value = parseFloat(distanceString);
  const unitString = distanceString.split(/[\d ]+/)[1];
  let unit: Unit = 'meters';
  if (unitString === 'm') unit = 'meters';
  else if (unitString === 'mi') unit = 'miles';
  else if (unitString === 'km') unit = 'kilometers';
  else if (unitString === 'ha') unit = 'hectares';
  else if (unitString === 'ac') unit = 'acres';
  else if (unitString === 'ft') unit = 'feet';
  else if (unitString === 'yd') unit = 'yards';
  else if (unitString === 'in') unit = 'inches';
  else if (unitString.startsWith('mile')) unit = 'miles';
  else if (unitString.startsWith('meter')) unit = 'meters';
  else if (unitString.startsWith('kilometer')) unit = 'kilometers';
  else if (unitString.startsWith('hectare')) unit = 'hectares';
  else if (unitString.startsWith('acre')) unit = 'acres';
  else if (unitString.startsWith('feet')) unit = 'feet';
  else if (unitString.startsWith('yard')) unit = 'yards';
  else if (unitString.startsWith('inch')) unit = 'inches';
  else
    throw new Error(
      `Unknown unit (${unitString}) expression: ${distanceString}`,
    );

  return { value, unit };
}

export function metersToUnitMathLiteral(unit: Unit) {
  switch (unit) {
    case 'meters':
      return '';
    case 'miles':
      return ' / 1609.344';
    case 'kilometers':
      return ' / 1000';
    case 'hectares':
      return ' / 10000';
    case 'acres':
      return ' / 4046.8564224';
    case 'feet':
      return ' / 0.3048';
    case 'yards':
      return ' / 0.9144';
    case 'inches':
      return ' / 0.0254';
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

export function unitToMetersMathLiteral(unit: Unit) {
  switch (unit) {
    case 'meters':
      return '';
    case 'miles':
      return ' * 1609.344';
    case 'kilometers':
      return ' * 1000';
    case 'hectares':
      return ' * 10000';
    case 'acres':
      return ' * 4046.8564224';
    case 'feet':
      return ' * 0.3048';
    case 'yards':
      return ' * 0.9144';
    case 'inches':
      return ' * 0.0254';
    default:
      return '';
  }
}

export const hasUnits = (s: string) =>
  (s = s.toLowerCase()) &&
  (s.includes('mile') ||
    s.includes('meter') ||
    s.includes('kilometer') ||
    s.includes('hectare') ||
    s.includes('acre') ||
    s.includes('feet') ||
    s.includes('yard') ||
    s.includes('inch') ||
    s.endsWith('m') ||
    s.endsWith('mi') ||
    s.endsWith('km') ||
    s.endsWith('ha') ||
    s.endsWith('ac') ||
    s.endsWith('ft') ||
    s.endsWith('yd') ||
    s.endsWith('in'));
