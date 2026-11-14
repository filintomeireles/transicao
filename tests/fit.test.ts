import { describe, expect, it } from 'vitest';
import { parseFIT } from '../src/engine';

const u32 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];

/** Ficheiro FIT mínimo com mensagens de sessão (18): início, desporto, tempo, distância, FC. */
function buildFit(sessions: [number, number, number, number, number][], compressed = false): ArrayBuffer {
  const fields = [[2, 4, 0x86], [5, 1, 0x00], [7, 4, 0x86], [9, 4, 0x86], [16, 1, 0x02]];
  const recs: number[] = [0x40, 0, 0, 18, 0, fields.length, ...fields.flat()];
  for (const [st, sp, el, dist, hr] of sessions) recs.push(compressed ? 0x80 | 3 : 0x00, ...u32(st), sp, ...u32(el), ...u32(dist), hr);
  const header = [14, 0x20, 0x08, 0x08, ...u32(recs.length), 46, 70, 73, 84, 0, 0];
  return new Uint8Array([...header, ...recs, 0, 0]).buffer;
}

describe('parseFIT', () => {
  const t0 = Math.floor(Date.parse('2026-09-12T17:02:36Z') / 1000) - 631065600;

  it('lê um triatlo multidesporto como três atividades', () => {
    const acts = parseFIT(buildFit([[t0, 5, 2477000, 165430, 150], [t0 + 2600, 2, 4239000, 3950800, 158], [t0 + 6900, 1, 2671000, 980900, 166]]));
    expect(acts.map(a => a.sport)).toEqual(['swim', 'bike', 'run']);
    expect(acts[0].start).toBe(Date.parse('2026-09-12T17:02:36Z'));
    expect(acts[1].km).toBeCloseTo(39.508, 3);
    expect(acts[2].sec).toBe(2671);
    expect(acts[2].hr).toBe(166);
  });

  it('aceita cabeçalhos de timestamp comprimido', () => {
    const acts = parseFIT(buildFit([[t0, 1, 600000, 200000, 0xff]], true));
    expect(acts).toHaveLength(1);
    expect(acts[0]).toMatchObject({ sport: 'run', sec: 600, km: 2, hr: null });
  });

  it('recusa ficheiros que não são FIT', () => {
    expect(() => parseFIT(new Uint8Array(20).buffer)).toThrow('não é um ficheiro FIT');
  });
});
