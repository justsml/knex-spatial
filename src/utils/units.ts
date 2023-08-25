
export function convertFromUnitToMeters(value: number, units: Unit) {
  switch (units) {
    case 'meters':
      return value;
    case 'miles':
      return value * 1609.344;
    case 'kilometers':
      return value * 1000;
    case 'hectares':
      return value * 10000;
    case 'acres':
      return value * 4046.8564224;
    case 'feet':
      return value * 0.3048;
    case 'yards':
      return value * 0.9144;
    case 'inches':
      return value * 0.0254;
    default:
      throw new Error(`Unknown unit: ${units}`);
  }
}

export function convertFromMetersToUnit(value: number, units: Unit) {
  switch (units) {
    case 'meters':
      return value;
    case 'miles':
      return value / 1609.344;
    case 'kilometers':
      return value / 1000;
    case 'hectares':
      return value / 10000;
    case 'acres':
      return value / 4046.8564224;
    case 'feet':
      return value / 0.3048;
    case 'yards':
      return value / 0.9144;
    case 'inches':
      return value / 0.0254;
    default:
      throw new Error(`Unknown unit: ${units}`);
  }
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
