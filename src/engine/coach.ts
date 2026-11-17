// Treinador do jogo: lê o dia e a semana e diz o que mudaria. Só regras, sem IA.
import { BAL } from './balance';
import { HARD, SESS } from './data';
import { form, daysTo, nextRace, plannedToday, canEnter } from './world';
import type { GameState } from './types';

export interface Tip { level: 'warn' | 'info' | 'good'; text: string }

export function coachTips(s: GameState): Tip[] {
  const tips: Tip[] = [];
  const k = plannedToday(s), nr = nextRace(s), until = nr ? daysTo(s, nr) : 99, f = form(s);
  if (s.injury > 0) tips.push({ level: 'warn', text: `Estás com ${s.injuryName} (${s.injury} dias). Corrida não: faz treino cruzado ou força.` });
  if (nr && canEnter(s, nr) && until >= 1 && until <= 3 && HARD.includes(k)) {
    tips.push({ level: 'warn', text: `${nr.n} é daqui a ${until} dia${until > 1 ? 's' : ''}. Hoje troca o treino duro por uma rodagem leve ou descanso para chegares com forma.` });
  } else if (nr && canEnter(s, nr) && until >= 4 && until <= 7) {
    tips.push({ level: 'info', text: `${nr.n} é daqui a ${until} dias. Esta é a última semana para carregar; depois, alivia.` });
  }
  if (s.fatigue >= 65) tips.push({ level: 'warn', text: `Fadiga ${Math.round(s.fatigue)}: os ganhos caem e o risco de lesão sobe. Hoje, descanso ou rodagem leve.` });
  else if (s.feel === 1 && HARD.includes(k)) tips.push({ level: 'good', text: 'Hoje sentes-te ótimo: dia perfeito para o treino duro, e rende 8% mais.' });
  else if (s.feel === -1 && HARD.includes(k)) tips.push({ level: 'info', text: 'Acordaste pesado. Se fizeres o treino duro, vai render menos: pensa em fazê-lo leve.' });
  if (f >= 8 && nr && until > 7) tips.push({ level: 'info', text: `Forma +${Math.round(f)}: estás fresco, mas longe da próxima prova. Podes carregar mais.` });
  if (s.shoeKm > 650) tips.push({ level: 'warn', text: `As sapatilhas têm ${s.shoeKm} km. A partir dos 700 km o risco de lesão sobe: há novas na loja.` });
  const left = BAL.weekGoal - s.wk.mine;
  if (left > 0 && !s.done) tips.push({ level: 'info', text: `Faltam ${left} treino${left > 1 ? 's' : ''} feitos por ti para o objetivo da semana (+${BAL.weekGoalXp} pontos).` });
  if (!s.plan.some(x => x === 'long')) tips.push({ level: 'info', text: 'O teu plano não tem longão: sem ele a resistência não sobe e as provas longas custam.' });
  if (!tips.length) tips.push({ level: 'good', text: `${SESS[k].n} hoje. Plano equilibrado: continua assim.` });
  const order = { warn: 0, info: 1, good: 2 };
  return tips.sort((a, b) => order[a.level] - order[b.level]).slice(0, 3);
}
