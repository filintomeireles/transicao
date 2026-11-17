// A ligação à realidade: o tempo verificado (de uma corrida real), a calibração e o teto do atleta do jogo.
import { BAL } from './balance';
import { DIST } from './data';
import { clamp, fmt } from './format';
import { abilityFromPace, ability, paceFor, predict } from './perf';
import type { Activity, Attrs, GameState, RaceType, Verified, VerSrc } from './types';

const TYPES = Object.keys(DIST) as RaceType[];
const RUN_KEYS = ['spd', 'thr', 'end'] as const;

export const VER_SRC_NAME: Record<VerSrc, string> = {
  perfil: 'perfil pronto, ainda por verificar', declarado: 'recorde escrito por ti', ficheiro: 'corrida importada',
  teste: 'teste real', treino: 'treino real', strava: 'recordes do Strava'
};

/** Um tempo real numa distância de prova. */
export interface RealTime { t: RaceType; sec: number }

/** Capacidade que um tempo real numa distância mostra. */
export const effortAbility = (e: RealTime): number => abilityFromPace(e.sec / DIST[e.t].km, e.t);
/** Tempo equivalente noutra distância, pelo modelo do jogo. */
export const equivalent = (e: RealTime, t: RaceType): number => paceFor(effortAbility(e), t) * DIST[t].km;

/**
 * Uma corrida real convertida na distância de prova mais próxima (Riegel: o ritmo abranda ~4% a cada distância dobrada).
 * Corridas com menos de 3 km ou mais de 45 km não contam.
 */
export function effortOf(act: Activity): RealTime | null {
  if (act.sport !== 'run' || !act.km || act.km < 3 || act.km > 45 || act.sec <= 0) return null;
  const t = TYPES.reduce((b, x) => (Math.abs(Math.log(DIST[x].km / act.km)) < Math.abs(Math.log(DIST[b].km / act.km)) ? x : b), '5k' as RaceType);
  const sec = act.sec * Math.pow(DIST[t].km / act.km, 1.06);
  const pace = sec / DIST[t].km;
  if (pace < 150 || pace > 720) return null; // menos de 2:30/km ou mais de 12:00/km: GPS errado ou caminhada
  return { t, sec: Math.round(sec) };
}

/** A melhor corrida (a que mostra mais capacidade) de uma lista. */
export function bestEffort(acts: Activity[]): RealTime | null {
  let best: RealTime | null = null;
  for (const a of acts) {
    const e = effortOf(a);
    if (e && (!best || effortAbility(e) > effortAbility(best))) best = e;
  }
  return best;
}

/**
 * Ajusta velocidade, limiar e resistência para os tempos previstos baterem com tempos reais.
 * Com uma distância, sobe ou desce os três por igual; com várias, a resistência separa o corredor rápido do de fundo.
 */
export function calibrate(base: Attrs, efforts: RealTime[]): Attrs {
  const a = { ...base };
  if (!efforts.length) return a;
  const W = (t: RaceType) => ability({ spd: 0, thr: 0, end: 1, str: 0, men: 0 }, t); // peso da resistência na distância
  // mínimos quadrados em (d, e): capacidade(t) = base(t) + d + e·peso_resistência(t)
  const rows = efforts.map(f => ({ w: W(f.t), y: effortAbility(f) - ability(base, f.t) }));
  const n = rows.length, sw = rows.reduce((s, r) => s + r.w, 0), sww = rows.reduce((s, r) => s + r.w * r.w, 0);
  const sy = rows.reduce((s, r) => s + r.y, 0), swy = rows.reduce((s, r) => s + r.w * r.y, 0);
  const det = n * sww - sw * sw;
  let d: number, e: number;
  if (Math.abs(det) < 1e-6) { d = sy / n; e = 0; }
  else { e = clamp((n * swy - sw * sy) / det, -25, 25); d = (sy - e * sw) / n; }
  for (const k of RUN_KEYS) a[k] = clamp(a[k] + d + (k === 'end' ? e : 0), 10, 97);
  return a;
}

export const isVerified = (s: GameState): boolean => s.ver.src !== 'perfil';
/** Quanto o atleta do jogo é mais rápido do que o tempo verificado (0,05 = 5%). Negativo: está mais lento. */
export const gapPct = (s: GameState): number => s.ver.sec / predict(s.a, s.ver.t) - 1;
/** O tempo mais rápido que o atleta do jogo pode ter na distância verificada. */
export const capSec = (s: GameState): number => s.ver.sec / (1 + BAL.verCap);
export const atCap = (s: GameState): boolean => gapPct(s) >= BAL.verCap - 0.002;
/** Está na altura de um teste real: nunca verificado, ou o último tempo tem mais de 4 semanas. */
export const testDue = (s: GameState): boolean => !isVerified(s) ? s.today > s.born : s.today - s.ver.d >= BAL.testEvery;

/** Evolução real desde o primeiro tempo verificado, em 5 km equivalentes (0,04 = 4% mais rápido). */
export const realProgress = (s: GameState): number => {
  if (!isVerified(s)) return 0;
  const a = equivalent(s.verFirst, '5k'), b = equivalent(s.ver, '5k');
  return (a - b) / a;
};

/**
 * Teto: depois de um treino, o atleta do jogo não pode passar 8% do tempo verificado.
 * Se passar, os ganhos de corrida desse treino ficam de fora. Devolve true se travou.
 */
export function enforceCap(s: GameState, before: Attrs, gains: Partial<Attrs>): boolean {
  if (predict(s.a, s.ver.t) >= capSec(s)) return false;
  let hit = false;
  for (const k of RUN_KEYS) if (s.a[k] > before[k]) { s.a[k] = before[k]; gains[k] = 0; hit = true; }
  return hit;
}

export const CAP_NOTE = `Chegaste ao teto: o atleta do jogo já está ${Math.round(BAL.verCap * 100)}% à frente do teu tempo verificado. Os ganhos de corrida ficam guardados para quando fizeres um teste real.`;

/**
 * Uma corrida real conta como prova do que vales.
 * Mais rápida do que o atleta do jogo: ele sobe até ao teu tempo, sem teto. Melhor do que o tempo verificado: passa a ser o novo.
 * `test` (teste declarado): fica sempre como tempo verificado, mesmo mais lento; aí o atleta do jogo desce metade do excesso.
 */
export function applyEffort(s: GameState, e: RealTime, src: VerSrc, test = false): { notes: string[]; xp: number } {
  const notes: string[] = [];
  let xp = 0;
  const fresh: Verified = { ...e, d: s.today, src };
  const wasVerified = isVerified(s);
  const better = !wasVerified || effortAbility(e) > effortAbility(s.ver);
  const gameAb = ability(s.a, e.t), need = effortAbility(e);
  if (need > gameAb + 0.05) {
    const d = need - gameAb;
    for (const k of RUN_KEYS) s.a[k] = Math.min(99, s.a[k] + d);
    notes.push(`Correste mais depressa do que o atleta do jogo: ele sobe até ao teu tempo real (${DIST[e.t].l} em ${fmt(e.sec)}).`);
  }
  if (better || test) {
    if (better && wasVerified) { xp += BAL.realPbXp; notes.push(`Novo tempo verificado: ${DIST[e.t].l} em ${fmt(e.sec)}. +${BAL.realPbXp} pontos.`); }
    else if (!wasVerified) notes.push(`Atleta verificado: ${DIST[e.t].l} em ${fmt(e.sec)}. A partir daqui o atleta do jogo pode ir até ${Math.round(BAL.verCap * 100)}% à frente deste tempo.`);
    else notes.push(`Teste registado: ${DIST[e.t].l} em ${fmt(e.sec)}. É este o teu tempo verificado agora.`);
    s.ver = fresh;
    if (!wasVerified) s.verFirst = fresh;
    s.verLog = [...s.verLog, fresh].slice(-24);
  }
  if (test) {
    if (s.today - (s.lastTest ?? -999) >= BAL.testEvery - 7) { xp += BAL.testXp; notes.push(`Teste feito: +${BAL.testXp} pontos.`); }
    s.lastTest = s.today;
    // um teste mais lento: o atleta do jogo desce metade do que está acima do teto, sem cair de repente
    const over = ability(s.a, s.ver.t) - abilityFromPace(capSec(s) / DIST[s.ver.t].km, s.ver.t);
    if (over > 0) {
      for (const k of RUN_KEYS) s.a[k] -= over / 2;
      notes.push('O atleta do jogo estava muito à frente deste tempo: desce um pouco, para não se afastar da realidade.');
    }
  }
  s.xp += xp;
  return { notes, xp };
}

/** Tempo verificado para uma carreira que ainda não tem nenhum (perfil pronto ou carreira antiga). */
export const unverified = (a: Attrs, d: number): Verified => ({ t: '5k', sec: Math.round(predict(a, '5k')), d, src: 'perfil' });

/** Garante os campos novos numa carreira gravada antes desta versão. */
export function migrate(s: GameState): GameState {
  if (!s.ver) { s.ver = unverified(s.a, s.today); s.verFirst = s.ver; s.verLog = []; }
  return s;
}


/** Lê "19:11", "1:25:28" ou "45" (minutos). Devolve segundos, ou null. */
export function parseTime(txt: string): number | null {
  const p = txt.trim().split(/[:.,h']/).filter(Boolean).map(Number);
  if (!p.length || p.some(n => !Number.isFinite(n) || n < 0)) return null;
  const sec = p.length === 1 ? p[0] * 60 : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
  return sec > 0 ? sec : null;
}

/** Um tempo escrito é plausível para a distância? (entre 2:30/km e 12:00/km) */
export const plausible = (t: RaceType, sec: number): boolean => sec / DIST[t].km >= 150 && sec / DIST[t].km <= 720;
