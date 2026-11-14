import type { Activity } from '../types';

const FIT_EPOCH = 631065600; // 1989-12-31T00:00:00Z em segundos Unix
const SESSION_MSG = 18;
const SPORTS: Record<number, Activity['sport']> = { 1: 'run', 2: 'bike', 5: 'swim', 4: 'str', 10: 'str' };

/**
 * Lê as mensagens de sessão (resumo) de um ficheiro FIT de relógio ou ciclocomputador.
 * Um ficheiro multidesporto (triatlo) devolve uma atividade por segmento.
 */
export function parseFIT(buf: ArrayBuffer): Activity[] {
  const dv = new DataView(buf);
  const headerSize = dv.getUint8(0), dataSize = dv.getUint32(4, true);
  const magic = String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11));
  if (magic !== '.FIT') throw new Error('não é um ficheiro FIT');
  const end = Math.min(headerSize + dataSize, dv.byteLength);
  const defs: Record<number, { g: number; le: boolean; fields: [number, number, number][]; devSize: number }> = {};
  const out: Record<number, number | null>[] = [];
  let p = headerSize;

  const read = (at: number, size: number, type: number, le: boolean): number | null => {
    const invalid = (v: number, inv: number) => (v === inv ? null : v);
    if ((type === 0 || type === 2 || type === 10 || type === 13) && size === 1) return invalid(dv.getUint8(at), 0xff);
    if ((type === 4 || type === 11) && size === 2) return invalid(dv.getUint16(at, le), 0xffff);
    if ((type === 6 || type === 12) && size === 4) return invalid(dv.getUint32(at, le), 0xffffffff);
    if (type === 3 && size === 2) return dv.getInt16(at, le);
    if (type === 5 && size === 4) return dv.getInt32(at, le);
    return null;
  };

  while (p < end) {
    const h = dv.getUint8(p++);
    const isDefinition = !(h & 0x80) && (h & 0x40);
    if (isDefinition) {
      const local = h & 15, hasDev = h & 0x20;
      p++; // reservado
      const le = dv.getUint8(p++) === 0;
      const g = dv.getUint16(p, le); p += 2;
      const n = dv.getUint8(p++);
      const fields: [number, number, number][] = [];
      for (let i = 0; i < n; i++) { fields.push([dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2) & 31]); p += 3; }
      let devSize = 0;
      if (hasDev) { const nd = dv.getUint8(p++); for (let i = 0; i < nd; i++) { devSize += dv.getUint8(p + 1); p += 3; } }
      defs[local] = { g, le, fields, devSize };
    } else {
      // cabeçalho normal ou de timestamp comprimido
      const local = h & 0x80 ? (h >> 5) & 3 : h & 15;
      const d = defs[local];
      if (!d) throw new Error('FIT inválido');
      const rec: Record<number, number | null> = {};
      for (const [num, size, type] of d.fields) { rec[num] = read(p, size, type, d.le); p += size; }
      p += d.devSize;
      if (d.g === SESSION_MSG) out.push(rec);
    }
  }
  if (!out.length) throw new Error('FIT sem resumo de sessão');
  return out.map(r => ({
    sport: SPORTS[r[5] ?? -1] ?? 'other',
    start: r[2] != null ? (r[2] + FIT_EPOCH) * 1000 : null,
    sec: (r[7] ?? r[8] ?? 0) / 1000,
    km: (r[9] ?? 0) / 100000,
    hr: r[16] ?? null
  }));
}
