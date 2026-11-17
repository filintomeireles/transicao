// Do atributo ao ritmo: as fórmulas que ligam os números do atleta aos tempos de prova.
import { DIST } from './data';
import type { Attrs, RaceType } from './types';

export const overall = (a: Attrs): number =>
  Math.round(a.spd * 0.28 + a.thr * 0.28 + a.end * 0.28 + a.str * 0.06 + a.men * 0.1);

/** Peso de velocidade, limiar e resistência em cada distância. */
const W: Record<RaceType, readonly [number, number, number]> = {
  '5k': [0.5, 0.35, 0.15], '10k': [0.3, 0.45, 0.25], meia: [0.15, 0.4, 0.45], maratona: [0.08, 0.3, 0.62]
};
/** Capacidade (0 a 100) para uma distância. */
export const ability = (a: Attrs, t: RaceType): number => a.spd * W[t][0] + a.thr * W[t][1] + a.end * W[t][2];
/** Ritmo de prova (segundos por km) de uma capacidade numa distância: 90 vale 2:58/km nos 5 km. */
export const paceFor = (ab: number, t: RaceType): number => (178 + (90 - ab) * 3.6) * DIST[t].f;
/** Capacidade a que corresponde um ritmo de prova (o inverso de paceFor). */
export const abilityFromPace = (secPerKm: number, t: RaceType): number => 90 - (secPerKm / DIST[t].f - 178) / 3.6;
/** Tempo previsto numa distância, em plano e com boas condições, bem gerido. */
export const predict = (a: Attrs, t: RaceType): number => paceFor(ability(a, t), t) * DIST[t].km;

/** Reserva de energia: o que conta para não bater na parede em cada distância. */
const stamina = (a: Attrs, t: RaceType): number =>
  t === '5k' ? a.thr * 0.5 + a.end * 0.5 : t === '10k' ? a.thr * 0.4 + a.end * 0.6 : t === 'meia' ? a.end * 0.75 + a.thr * 0.25 : a.end * 0.9 + a.men * 0.1;
const EXTRA: Record<RaceType, number> = { '5k': 0, '10k': 0, meia: 0.07, maratona: 0.16 };
/** Energia (de 100) que um segmento custa ao esforço "ritmo", em plano e sem calor. */
export const segmentCost = (a: Attrs, t: RaceType): number => (100 / DIST[t].segs) * (1.12 - 0.0035 * stamina(a, t) + EXTRA[t]);
