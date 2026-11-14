// Seeded pseudo-random numbers so a simulation can be replayed exactly
// (same state + same seed = same result; also needed for online multiplayer).

/** mulberry32: tiny, fast 32-bit PRNG. Returns a function () => float in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive. */
export const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/** Random element of an array. */
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/**
 * Fresh seed for a new run. NOT pure — call it in the UI and put the seed
 * into the action, never inside the reducer or engine.
 */
export const newSeed = () => Math.floor(Math.random() * 2 ** 31);
