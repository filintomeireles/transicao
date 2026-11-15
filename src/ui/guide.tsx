import { nextRace, season, weekInSeason, type GameState } from '../engine';
import { Icon } from './icons';
import type { Apply } from './useGame';

type Where = 'week' | 'race';
interface Step { id: string; title: string; text: string; when: (s: GameState, where: Where) => boolean }

// Guia da primeira semana: um cartão de cada vez, no ecrã onde faz sentido.
const STEPS: Step[] = [
  { id: 'semana', title: 'A tua semana', text: 'Cada cartão é um dia. Toca num dia para escolher o treino, ou usa um modelo pronto. Os treinos duros dão mais ganhos, mas cansam mais.',
    when: (s, w) => w === 'week' && s.week === 1 },
  { id: 'medidores', title: 'Fadiga, forma e moral', text: 'A fadiga sobe com o treino e desce com o descanso. A forma é o que conta na prova: sobe quando alivias depois de semanas de treino. A moral mexe nos ganhos.',
    when: (s, w) => w === 'week' && s.week === 1 },
  { id: 'fechar', title: 'Fecha a semana', text: 'Quando o plano estiver pronto, carrega em "Fechar semana". Em baixo vês o resumo do que ganhaste. O treinador avisa-te se estiveres a exagerar.',
    when: (s, w) => w === 'week' && s.week === 1 },
  { id: 'taper', title: 'Prova à vista', text: 'Na semana da prova, alivia: usa o modelo Taper ou troca as sessões duras por leves. Chegas com menos fadiga e mais forma.',
    when: (s, w) => { const r = nextRace(s); return w === 'week' && !s.results.length && !!r && r.w - weekInSeason(s) <= 1; } },
  { id: 'prova', title: 'Decisões da prova', text: 'Escolhe onde partes na natação, a intensidade na bike, os géis e a estratégia de corrida. Durante a prova tens dois momentos só teus: as transições e, se chegares colado a alguém, o sprint final.',
    when: (s, w) => w === 'race' && s.race?.stage === 'setup' && !s.results.length },
  { id: 'depois', title: 'Depois da prova', text: 'Cada prova dá pontos de ranking e fama. Com fama chegam patrocinadores à caixa de entrada. Vê também o teu clube e a loja nos separadores em baixo.',
    when: (s, w) => w === 'week' && s.results.length > 0 && season(s) === 1 }
];

export function GuideCard({ game, where, apply }: { game: GameState; where: Where; apply: Apply }) {
  const done = game.guide ?? [];
  const step = STEPS.find(st => !done.includes(st.id) && st.when(game, where));
  if (!step) return null;
  const left = STEPS.filter(st => !done.includes(st.id)).length;
  const at = STEPS.indexOf(step);
  return (
    <div className="card guide" role="note" aria-label="Guia">
      <div className="between">
        <h2><Icon name="info" size={18} />{step.title}</h2>
        <span className="small muted">{at + 1} de {STEPS.length}</span>
      </div>
      <div className="guide-steps" aria-hidden="true">{STEPS.map((st, i) => <i key={st.id} className={i <= at ? 'on' : ''} />)}</div>
      <span className="small">{step.text}</span>
      <div className="row">
        <button className="btn sm dark" onClick={() => apply(s => { s.guide = [...(s.guide ?? []), step.id]; })}>Percebi</button>
        {left > 1 && <button className="btn sm ghost" onClick={() => apply(s => { s.guide = STEPS.map(x => x.id); })}>Saltar o guia</button>}
      </div>
    </div>
  );
}
