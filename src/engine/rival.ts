// O rival: um adversário com feitio, que fala contigo, aparece nas notícias e, quando o ultrapassas, dá lugar a outro.
import { nameFor, overall } from './athlete';
import { clamp } from './format';
import { gauss, pick, random } from './rng';
import type { GameState, RivalStyle } from './types';
import { season } from './world';

const STYLES: RivalStyle[] = ['provocador', 'cavalheiro', 'calculista'];
export const STYLE_NAME: Record<RivalStyle, string> = { provocador: 'provocador', cavalheiro: 'cavalheiro', calculista: 'calculista' };
export const randomStyle = (): RivalStyle => pick(STYLES);

/** Vitórias seguidas (tuas) ou distância de nível que fazem aparecer um rival novo. */
const REPLACE_RUN = 3, REPLACE_GAP = 6;

const msg = (s: GameState, t: string, x: string) => s.inbox.unshift({ k: 'msg', t, x, done: true });

/** Mensagem do rival na semana de uma prova em que ambos correm. */
export function rivalPreRace(s: GameState, race: string): void {
  const R = s.rival, style = R.style ?? 'cavalheiro';
  const text = {
    provocador: `"Domingo em ${race}? Leva lenço: vais precisar para limpar o pó que te vou deixar."`,
    cavalheiro: `"Vemo-nos domingo em ${race}. Boa prova, e que ganhe o melhor."`,
    calculista: `Publicou o plano para ${race}: 88% do FTP na bike e negative split na corrida. Não deixa nada ao acaso.`
  }[style];
  msg(s, `${R.nm} antes de ${race}`, text);
}

/** Depois de uma prova com o rival: contagem, mensagem e, se for caso disso, rival novo. */
export function rivalAfterRace(s: GameState, beat: boolean): void {
  const R = s.rival, style = R.style ?? 'cavalheiro';
  if (beat) R.beaten++; else R.lost++;
  R.run = beat ? Math.max(1, (R.run ?? 0) + 1) : Math.min(-1, (R.run ?? 0) - 1);
  R.r += 0.6 + random() * 0.8 + (beat ? 0.6 : 0);
  const text = beat
    ? { provocador: '"Dia mau. Para a próxima não há desculpas."', cavalheiro: '"Parabéns, foste melhor. Vou voltar mais forte."', calculista: '"Perdi tempo na transição. Já corrigi no plano."' }[style]
    : { provocador: '"Eu disse-te. Vai treinar."', cavalheiro: '"Boa prova! Estiveste perto. Na próxima é tua."', calculista: '"Tudo como previsto. Os números não mentem."' }[style];
  msg(s, `${R.nm}: ${beat ? 'perdeu contigo' : 'ganhou-te'}`, text);

  if ((R.run ?? 0) >= REPLACE_RUN || overall(s.a) - R.r >= REPLACE_GAP) newRival(s);
}

/** O rival atual fica para trás; surge um mais forte. */
export function newRival(s: GameState): void {
  const old = s.rival;
  s.rivals = [...(s.rivals ?? []), { nm: old.nm, beaten: old.beaten, lost: old.lost, until: season(s) }];
  let nm: string;
  do nm = nameFor(s.ath.cat); while (nm === old.nm || nm === s.ath.name || s.rivals.some(r => r.nm === nm));
  const style = randomStyle();
  s.rival = { nm, age: clamp(s.ath.age + Math.round(gauss() * 4), 18, 80), r: overall(s.a) + 5, beaten: 0, lost: 0, style, run: 0 };
  const intro = { provocador: 'e já disse a toda a gente que és "o próximo da lista"', cavalheiro: 'e mandou-te uma mensagem simpática a dizer que te segue há meses', calculista: 'e estudou todos os teus parciais do último ano' }[style];
  msg(s, `Novo rival: ${nm}`, `${old.nm} deixou de te acompanhar (${old.beaten} vitórias tuas, ${old.lost} dele). Agora é ${nm}, um pouco mais forte do que tu, ${intro}.`);
}

/** Notícias do rival durante a temporada; às vezes lesiona-se e falha provas. */
export function rivalWeek(s: GameState): void {
  const R = s.rival;
  if ((R.out ?? 0) > 0) { R.out!--; return; }
  const x = random();
  if (x < 0.03) {
    R.out = 2 + Math.floor(random() * 3);
    msg(s, `${R.nm} lesionou-se`, `Fica de fora ${R.out} semanas. Nas provas desse período não o vais encontrar.`);
  } else if (x < 0.15) {
    R.r += 0.3;
    const style = R.style ?? 'cavalheiro';
    msg(s, `Notícias de ${R.nm}`, {
      provocador: 'Publicou 200 km de bike no fim de semana: "Isto é que é treinar. Alguns andam a passear."',
      cavalheiro: 'Juntou-se a um treino do teu clube e pagou os cafés a toda a gente.',
      calculista: 'Comprou um potenciómetro novo e fez um teste de FTP. Ninguém sabe o resultado.'
    }[style]);
  }
}
