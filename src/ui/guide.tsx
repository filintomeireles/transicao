import type { GameState } from '../engine';
import { Icon } from './icons';
import type { Apply } from './useGame';

type Where = 'week' | 'race';
interface Step { id: string; title: string; text: string; when: (s: GameState, where: Where) => boolean }

// Guia da primeira semana: um cartão de cada vez, no ecrã onde faz sentido.
const STEPS: Step[] = [
  { id: 'dia', title: 'Um treino por dia', text: 'O jogo anda ao ritmo do calendário: cada dia real tem um treino. Se treinaste com relógio, importa o ficheiro; se treinaste sem ele, confirma; se não deu, simula. O treino real vale mais e dá o dobro dos pontos.',
    when: (s, w) => w === 'week' && s.today === s.born },
  { id: 'medidores', title: 'Fadiga, forma e moral', text: 'A fadiga sobe com o treino e desce com o descanso. A forma é o que conta na prova: sobe quando alivias depois de semanas de treino. A moral mexe nos ganhos.',
    when: (s, w) => w === 'week' && s.today === s.born && !!s.guide?.includes('dia') },
  { id: 'ausente', title: 'Se faltares', text: 'Os dias em que não abres o jogo correm em piloto automático: o atleta faz o plano, mas rende menos de metade. Ao fim de 10 dias, para.',
    when: (s, w) => w === 'week' && s.done && s.today === s.born },
  { id: 'prova', title: 'A prova joga-se', text: 'Antes de cada segmento escolhes o esforço. Atacar ganha tempo mas gasta energia; se a energia acabar, bates na parede. Colar a quem vai à frente poupa nos troços com vento.',
    when: (s, w) => w === 'race' && s.race?.stage === 'setup' && !s.results.length },
  { id: 'talentos', title: 'Níveis e talentos', text: 'Os pontos de treino fazem-te subir de nível. Cada nível dá um talento: escolhe-o na ficha do atleta.',
    when: (s, w) => w === 'week' && s.talents.length === 0 && s.xp >= 120 }
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
