export const SEASONAL_FACTORS: Record<number, number> = {
  2: 1.1,
  3: 1.15,
  4: 1.1,
  6: 1.05,
  7: 1.1,
  8: 1.05,
  11: 1.0,
  0: 1.0,
  1: 1.0,
  5: 1.0,
  9: 1.0,
  10: 1.0,
};

export function getSeasonalFactor(month: number): number {
  return SEASONAL_FACTORS[month] || 1.0;
}

export function getSeasonalNote(month: number): string {
  const notes: Record<number, string> = {
    2: 'Higher electricity usage due to summer AC',
    3: 'Peak summer season - higher electric bill expected',
    4: 'Summer continues - elevated AC costs',
    6: 'Rainy season - potential water bill increase',
    7: 'Monsoon season - expect higher utility costs',
    8: 'Late rainy season - watch for water usage',
    11: 'Holiday season approaching - normal utility usage',
    0: 'Holiday season - normal usage expected',
    1: 'Post-holiday - back to normal patterns',
  };

  return notes[month] || '';
}
