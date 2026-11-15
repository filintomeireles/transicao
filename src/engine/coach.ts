// Treinador do jogo: lê o plano da semana e diz o que mudaria. Só regras, sem IA.
import { SESS } from './data';
import type { GameState, SessionKey } from './types';
import { canAfford, canEnter, nextRace, weekInSeason } from './world';
import { dayItems, projected } from './week';

export interface Tip { level: 'warn' | 'info' | 'good'; text: string }

const HARD: SessionKey[] = ['runInt', 'bikeInt', 'brick'];
const SPORT_TEXT = { swim: 'natação: vais perder forma a nadar', bike: 'bike: vais perder forma a pedalar', run: 'corrida: vais perder forma a correr' } as const;

export function coachTips(s: GameState): Tip[] {
  const tips: Tip[] = [];
  const nr = nextRace(s), until = nr ? nr.w - weekInSeason(s) : 99;
  const racing = !!nr && until === 0 && canEnter(s, nr) && canAfford(s, nr);
  const days = Array.from({ length: 7 }, (_, i) => (i === 6 && racing ? [] : dayItems(s, i).map(it => it.k)));
  const keys = days.flat();
  const hard = keys.filter(k => HARD.includes(k)).length;
  const restDays = days.filter(d => d.length > 0 && d.every(k => k === 'rest')).length;
  const pj = projected(s);

  if (s.injury > 0 && keys.some(k => SESS[k].sp === 'run' || k === 'brick')) {
    tips.push({ level: 'warn', text: `Estás com ${s.injuryName}: os treinos de corrida passam a descanso. Aproveita para nadar e pedalar.` });
  }
  if (racing) {
    tips.push(hard >= 2
      ? { level: 'warn', text: `Prova no domingo e tens ${hard} sessões duras. Troca-as por treinos leves ou descanso para chegares fresco.` }
      : { level: 'good', text: 'Semana de prova bem aliviada. Vais chegar com forma.' });
  } else if (nr && until === 1 && canEnter(s, nr)) {
    tips.push({ level: 'info', text: `${nr.n} é na próxima semana. Esta pode ser a última semana forte; na da prova, alivia.` });
  }
  if (pj.fatigue >= 65) {
    tips.push({ level: 'warn', text: `Fadiga prevista de ${Math.round(pj.fatigue)}: os ganhos caem e o risco de lesão sobe. Mete um dia de descanso.` });
  } else if (restDays === 0 && s.fatigue > 45) {
    tips.push({ level: 'warn', text: 'Não tens nenhum dia de descanso e já vens cansado. Um dia de pausa rende mais do que parece.' });
  }
  for (const sp of ['swim', 'bike', 'run'] as const) {
    const has = keys.some(k => SESS[k].sp === sp || (k === 'brick' && sp === 'bike'));
    if (!has && !(sp === 'run' && s.injury > 0)) tips.push({ level: 'info', text: `Esta semana não tens ${SPORT_TEXT[sp]}.` });
  }
  if (s.shoeKm > 650) tips.push({ level: 'warn', text: `As sapatilhas têm ${s.shoeKm} km. A partir dos 700 km o risco de lesão sobe: há novas na loja.` });
  const poolCost = keys.reduce((sum, k) => sum + SESS[k].cost, 0);
  if (poolCost > 0 && s.money < poolCost) tips.push({ level: 'warn', text: 'Não tens dinheiro para a piscina: as natações vão ficar por fazer.' });

  if (!tips.length) tips.push({ level: 'good', text: 'Plano equilibrado. Continua assim.' });
  const order = { warn: 0, info: 1, good: 2 };
  return tips.sort((a, b) => order[a.level] - order[b.level]).slice(0, 3);
}
