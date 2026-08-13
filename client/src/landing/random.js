/**
 * Small seeded PRNG (mulberry32).
 *
 * Decorative scatter — particles, drop positions — needs to look random but be
 * stable: a pure generator keeps the layout identical across re-renders and
 * reloads, and keeps render functions free of side effects.
 */
export function createRandom(seed = 1) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
