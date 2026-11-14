import { SESS } from '../data';
import { clamp } from '../format';
import type { Activity, Attrs, SessionKey } from '../types';
import { parseFIT } from './fit';
import { parseGPX, parseTCX } from './xml';

/** Lê ficheiros FIT, GPX e TCX. Atividades curtas (menos de 1 min) ou de desporto desconhecido ficam de fora. */
export async function readFiles(files: File[]): Promise<{ acts: Activity[]; errs: string[] }> {
  const acts: Activity[] = [], errs: string[] = [];
  for (const f of files) {
    const ext = f.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'fit') acts.push(...parseFIT(await f.arrayBuffer()));
      else if (ext === 'gpx') acts.push(...parseGPX(await f.text()));
      else if (ext === 'tcx') acts.push(...parseTCX(await f.text()));
      else errs.push(`${f.name}: formato não suportado`);
    } catch (e) {
      errs.push(`${f.name}: ${(e as Error).message}`);
    }
  }
  return { acts: acts.filter(a => a.sec > 60 && a.sport !== 'other'), errs };
}

/** Converte uma atividade real na sessão equivalente do jogo, pela intensidade (FC ou ritmo). */
export function classify(act: Activity, a: Attrs, age: number | null): SessionKey | null {
  const min = act.sec / 60, hrmax = age ? 208 - 0.7 * age : 188, kmh = act.km / (act.sec / 3600);
  if (act.sport === 'swim') return min >= 40 || act.km >= 2 ? 'swimEnd' : 'swimTec';
  if (act.sport === 'str') return 'str';
  if (act.sport === 'bike') {
    const raceSpeed = 43 - (90 - (0.7 * a.bikePow + 0.3 * a.bikeEnd)) * 0.31;
    const hard = act.hr ? act.hr >= 0.82 * hrmax : kmh >= raceSpeed * 0.95;
    return hard && min < 110 ? 'bikeInt' : 'bikeZ2';
  }
  if (act.sport === 'run') {
    const racePace = 185 + (90 - (0.6 * a.runSpd + 0.4 * a.runEnd)) * 4.7;
    const hard = act.hr ? act.hr >= 0.85 * hrmax : act.sec / act.km <= racePace * 1.1;
    return hard ? 'runInt' : 'runZ2';
  }
  return null;
}

/** Proporção entre a duração real e a duração de referência da sessão (limita a carga de treinos muito longos). */
export const loadRatio = (act: Activity, k: SessionKey): number => clamp(act.sec / 60 / SESS[k].min, 0.4, 2.5);

export interface ImportSummary {
  a: Attrs;
  ctl: number;
  fatigue: number;
  n: number;
  sports: { run: number; bike: number; swim: number };
  errs?: string[];
  sample?: boolean;
}

/** Calibra um atleta novo a partir de várias semanas de treinos reais. */
export function attrsFromActs(acts: Activity[]): ImportSummary {
  const runs = acts.filter(a => a.sport === 'run' && a.km >= 3);
  const rides = acts.filter(a => a.sport === 'bike' && a.km >= 15);
  const swims = acts.filter(a => a.sport === 'swim' && a.km > 0);
  const a: Attrs = { swimTec: 30, swimEnd: 30, bikePow: 40, bikeEnd: 40, runSpd: 45, runEnd: 45, trans: 42, str: 36, mental: 60 };
  if (runs.length) {
    const best = Math.min(...runs.map(r => r.sec / r.km)) * 0.92; // ritmo de treino → ritmo de prova
    a.runSpd = clamp(90 - (best - 185) / 4.7, 15, 92);
    a.runEnd = clamp(30 + Math.max(...runs.map(r => r.km)) * 1.1, 15, 92);
  }
  if (rides.length) {
    const best = Math.max(...rides.map(r => r.km / (r.sec / 3600)));
    a.bikePow = clamp(90 - (43 - best * 1.03) / 0.31, 15, 92);
    a.bikeEnd = clamp(30 + Math.max(...rides.map(r => r.km)) * 0.2, 15, 92);
  }
  if (swims.length) {
    const best = Math.min(...swims.map(s => s.sec / (s.km * 10)));
    a.swimTec = clamp(90 - (best - 70) / 1.35, 10, 92);
    a.swimEnd = clamp(25 + Math.max(...swims.map(s => s.km)) * 10, 10, 92);
  }
  a.str = clamp(36 + acts.filter(x => x.sport === 'str').length, 20, 80);
  for (const k of Object.keys(a) as (keyof Attrs)[]) a[k] = Math.round(a[k]);

  const starts = acts.map(x => x.start).filter((x): x is number => x != null);
  const weeks = starts.length ? Math.max(1, (Math.max(...starts) - Math.min(...starts)) / 6048e5) : 4;
  const loadOf = (x: Activity) => { const k = classify(x, a, null); return k ? SESS[k].load * loadRatio(x, k) : 0; };
  const total = acts.reduce((s, x) => s + loadOf(x), 0);
  const last = starts.length ? Math.max(...starts) : 0;
  const recent = acts.filter(x => x.start && last - x.start < 6048e5).reduce((s, x) => s + loadOf(x), 0);
  return {
    a,
    ctl: clamp(total / weeks, 120, 600),
    fatigue: clamp(recent * 0.12, 10, 70),
    n: acts.length,
    sports: { run: runs.length, bike: rides.length, swim: swims.length }
  };
}

/** Seis semanas de treinos de exemplo, para quem quer experimentar sem ficheiros. */
export function sampleActs(now = Date.now()): Activity[] {
  const day = 864e5, list: Activity[] = [];
  for (let w = 0; w < 6; w++) {
    const b = now - w * 7 * day;
    list.push(
      { sport: 'run', start: b - 5 * day, sec: 3300, km: 10.1, hr: 146 },
      { sport: 'run', start: b - day, sec: 6400, km: 19.5, hr: 142 },
      { sport: 'run', start: b - 3 * day, sec: 2700, km: 9, hr: 163 },
      { sport: 'bike', start: b - 2 * day, sec: 7200, km: 56, hr: 132 },
      { sport: 'swim', start: b - 4 * day, sec: 2100, km: 1.5, hr: null }
    );
  }
  return list;
}
