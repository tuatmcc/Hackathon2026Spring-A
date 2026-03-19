const UINT32_RANGE = 0x1_0000_0000;
const DEFAULT_SEED = 0x6d2b79f5;

export type RandomSource = () => number;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    return DEFAULT_SEED;
  }

  return (Math.trunc(seed) >>> 0) || DEFAULT_SEED;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = normalizeSeed(seed);

  return () => {
    state = (state + DEFAULT_SEED) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function deriveSeed(seed: number, stream: number): number {
  const base = normalizeSeed(seed);
  const channel = normalizeSeed(stream);
  let mixed = (base ^ Math.imul(channel, 0x9e3779b1)) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x85ebca6b) >>> 0;
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, 0xc2b2ae35) >>> 0;
  mixed ^= mixed >>> 16;

  return mixed || DEFAULT_SEED;
}

export function createShuffledIndices(
  size: number,
  seed: number,
): Uint32Array {
  const indices = Uint32Array.from({ length: size }, (_, index) => index);
  const random = createSeededRandom(seed);

  for (let index = size - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    const nextValue = indices[index];
    indices[index] = indices[swapIndex] ?? index;
    indices[swapIndex] = nextValue ?? swapIndex;
  }

  return indices;
}
