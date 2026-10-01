// Display formatting. Numbers group with commas, as in DESIGN-SYSTEM ("1,240 kcal"),
// whatever the device locale, so screens and tests read the same everywhere.
const intFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const formatInt = (n: number) => intFormat.format(n);
