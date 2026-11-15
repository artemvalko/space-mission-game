// Display formatting helpers. Pure functions, safe to use from engine/ and ui/.

const round = (n, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** Pick a sensible number of decimals for small values. */
export function num(n, digits) {
  if (n == null || Number.isNaN(n)) return '—';
  if (!Number.isFinite(n)) return '∞';
  if (digits == null) digits = Math.abs(n) < 10 && n % 1 !== 0 ? 1 : 0;
  return round(n, digits).toLocaleString('en-US', { maximumFractionDigits: digits });
}

export const kg = (n) => `${num(n)} kg`;
export const watts = (n) => `${num(n)} W`;
export const wh = (n) => `${num(n)} Wh`;
export const gbDay = (n) => `${num(n, n < 1 && n > 0 ? 2 : undefined)} GB/day`;
export const money = (n) => `$${num(n, Math.abs(n) < 10 && n % 1 !== 0 ? 2 : undefined)}M`;
export const months = (n) => `${num(n)} mo`;
export const years = (n) => `${num(n, 1)} yr`;
export const pct = (fraction, digits = 0) => `${num(fraction * 100, digits)}%`;
export const mbps = (n) => `${num(n)} Mbps`;
export const ms = (n) => `${num(n)} m/s`;

/** Signed number for deltas: +40, −12. */
export function signed(n, unitFn = num) {
  if (n === 0) return unitFn(0);
  const sign = n > 0 ? '+' : '−';
  return sign + unitFn(Math.abs(n));
}

/** Formatter by resource unit key (used by the dashboard). */
export const BY_UNIT = {
  kg,
  W: watts,
  Wh: wh,
  'GB/day': gbDay,
  $M: money,
  months,
};
