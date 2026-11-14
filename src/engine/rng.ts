// Todo o acaso do jogo passa por aqui, para que testes e simulações possam usar uma semente fixa.
let gen: () => number = Math.random;

export const random = (): number => gen();

/** Gerador mulberry32: rápido e reproduzível. */
export function setSeed(seed: number): void {
  let a = seed >>> 0;
  gen = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useMathRandom(): void {
  gen = Math.random;
}

export const rnd = (a: number, b: number): number => a + random() * (b - a);
export const pick = <T>(a: readonly T[]): T => a[Math.floor(random() * a.length)];
export const gauss = (): number => {
  let u = 0, v = 0;
  while (!u) u = random();
  while (!v) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
export const shuffle = <T>(a: readonly T[]): T[] =>
  a.map(x => [random(), x] as const).sort((p, q) => p[0] - q[0]).map(p => p[1]);
