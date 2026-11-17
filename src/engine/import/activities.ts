import { SESS } from '../data';
import { clamp } from '../format';
import { bestEffort, calibrate, type RealTime } from '../verify';
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

/**
 * Converte uma atividade real na sessão equivalente do jogo.
 * Corridas: longão pela distância ou duração, qualidade pela FC ou pelo ritmo face ao teu ritmo de 10 km.
 * Bike e natação contam como treino cruzado; ginásio como força.
 */
export function classify(act: Activity, a: Attrs, age: number | null): SessionKey | null {
  if (act.sport === 'bike' || act.sport === 'swim') return 'cross';
  if (act.sport === 'str') return 'str';
  if (act.sport !== 'run' || !act.km) return null;
  const min = act.sec / 60, pace = act.sec / act.km, hrmax = age ? 208 - 0.7 * age : 188;
  if (act.km >= 16 || min >= 85) return 'long';
  const tenK = (178 + (90 - (a.spd * 0.3 + a.thr * 0.45 + a.end * 0.25)) * 3.6) * 1.04;
  const hard = act.hr ? act.hr >= 0.85 * hrmax : pace <= tenK * 1.1;
  if (!hard) return 'easy';
  return pace <= tenK * 0.98 && min < 60 ? 'int' : 'tempo';
}

/** Proporção entre a duração real e a duração de referência da sessão (limita a carga de treinos muito longos). */
export const loadRatio = (act: Activity, k: SessionKey): number => (SESS[k].min ? clamp(act.sec / 60 / SESS[k].min, 0.4, 2.2) : 1);

export interface ImportSummary {
  a: Attrs;
  ctl: number;
  fatigue: number;
  n: number;
  sports: { run: number; other: number };
  errs?: string[];
  sample?: boolean;
  /** A corrida que mostra mais capacidade, convertida na distância de prova mais próxima. */
  best?: RealTime | null;
}

/** Calibra um atleta novo a partir de várias semanas de corridas reais. */
export function attrsFromActs(acts: Activity[]): ImportSummary {
  const runs = acts.filter(a => a.sport === 'run' && a.km >= 3);
  // A melhor corrida (a mais rápida para a distância) dá o tempo verificado e calibra o atleta por ele.
  const best = bestEffort(runs);
  let a: Attrs = { spd: 40, thr: 38, end: 35, str: 36, men: 60 };
  if (best) {
    a = calibrate({ spd: 50, thr: 50, end: 50, str: 36, men: 60 }, [best]);
    // quem faz longões compridos tem mais resistência do que a corrida rápida mostra
    const longest = Math.max(...runs.map(r => r.km));
    a.end = clamp(a.end + (longest - 14) * 0.5, 10, 97);
    a.spd = clamp(a.spd - (longest - 14) * 0.15, 10, 97);
    a = calibrate(a, [best]); // volta a acertar o tempo da melhor corrida
  }
  a.str = clamp(36 + acts.filter(x => x.sport === 'str').length, 20, 80);

  const starts = acts.map(x => x.start).filter((x): x is number => x != null);
  const days = starts.length ? Math.max(7, (Math.max(...starts) - Math.min(...starts)) / 864e5) : 28;
  const loadOf = (x: Activity) => { const k = classify(x, a, null); return k ? SESS[k].load * loadRatio(x, k) : 0; };
  const total = acts.reduce((s, x) => s + loadOf(x), 0);
  const last = starts.length ? Math.max(...starts) : 0;
  const recent = acts.filter(x => x.start && last - x.start < 6048e5).reduce((s, x) => s + loadOf(x), 0);
  return {
    a,
    ctl: clamp(total / days, 15, 90),
    fatigue: clamp(recent * 0.1, 10, 70),
    n: acts.length,
    sports: { run: runs.length, other: acts.length - runs.length },
    best
  };
}

/** Seis semanas de corridas de exemplo, para quem quer experimentar sem ficheiros. */
export function sampleActs(now = Date.now()): Activity[] {
  const day = 864e5, list: Activity[] = [];
  for (let w = 0; w < 6; w++) {
    const b = now - w * 7 * day;
    list.push(
      { sport: 'run', start: b - 5 * day, sec: 3000, km: 9.2, hr: 146 },
      { sport: 'run', start: b - 3 * day, sec: 2700, km: 9, hr: 165 },
      { sport: 'run', start: b - day, sec: 6600, km: 18.5, hr: 142 },
      { sport: 'str', start: b - 4 * day, sec: 2400, km: 0, hr: null }
    );
  }
  return list;
}
