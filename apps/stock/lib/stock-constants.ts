/** Number of sliding windows per stock sparkline (28 × 6h = 7 days + 1). */
export const WINDOW_COUNT = 28+1;

/** Step between windows in hours. */
export const STEP_HOURS = 6;

/** Width of each window in hours (24h increments). */
export const WINDOW_HOURS = 24;

/** Divisor for the market index to keep values readable. */
export const INDEX_FACTOR = 1000;

/** Number of top stocks to average per window when computing the market index. */
export const INDEX_SIZE = 100;

// Derived constants
export const SIX_HOURS_MS = STEP_HOURS * 3600 * 1000;

/** Total lookback in hours: spans all windows plus a 24h safety margin for findNearest. */
export const TOTAL_LOOKBACK_HOURS =
	WINDOW_COUNT * STEP_HOURS + WINDOW_HOURS + 24;

/** Floors a timestamp to the nearest 6-hour grid boundary. */
export function snapToGrid(ts: number): Date {
	return new Date(Math.floor(ts / SIX_HOURS_MS) * SIX_HOURS_MS);
}
