import { useState } from 'react';
import { ageGroup, level, overall, season, weekInSeason, type GameState } from '../engine';
import type { Apply } from './useGame';

const START_NAME = { files: 'ficheiros reais', preset: 'perfil pronto', filinto: 'exemplo do Filinto' } as const;

/** Momento do jogo em que vale a pena pedir opinião, se ainda não foi pedida. */
function dueMoment(s: GameState): string | null {
  const asked = s.asked ?? [];
  if (season(s) >= 2 && !asked.includes(`temporada-${season(s) - 1}`)) return `temporada-${season(s) - 1}`;
  if (s.results.length >= 1 && !asked.includes('primeira-prova')) return 'primeira-prova';
  return null;
}

export function FeedbackPrompt({ game, apply }: { game: GameState; apply: Apply }) {
  // O momento fica guardado ao abrir: depois de marcado como pedido deixa de estar "em falta",
  // mas o formulário tem de continuar aberto até o testador enviar o texto.
  const [open, setOpen] = useState<string | null>(null);
  const markAsked = (m: string) => apply(s => { if (!(s.asked ?? []).includes(m)) s.asked = [...(s.asked ?? []), m]; });
  if (open) return <FeedbackForm game={game} moment={open} onSent={() => markAsked(open)} onClose={() => { markAsked(open); setOpen(null); }} />;
  const moment = dueMoment(game);
  if (!moment || game.race) return null;
  return (
    <div className="card acc">
      <b>{moment === 'primeira-prova' ? 'Primeira prova feita! Como está a ser?' : 'Fim de temporada. O que achaste?'}</b>
      <span className="small">Este jogo está em teste. A tua opinião (2 minutos) decide o que vem a seguir.</span>
      <div className="row">
        <button className="btn sm" onClick={() => setOpen(moment)}>Dar opinião</button>
        <button className="btn sm ghost" onClick={() => markAsked(moment)}>Agora não</button>
      </div>
    </div>
  );
}

export function FeedbackForm({ game, moment, onSent, onClose }: { game: GameState; moment: string; onSent?: () => void; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [bored, setBored] = useState('');
  const [change, setChange] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  function compose() {
    if (!rating && !liked.trim() && !bored.trim() && !change.trim()) { setError('Dá uma nota ou responde a pelo menos uma pergunta.'); return; }
    const lines = [
      'Opinião sobre o Transição',
      rating ? `Nota: ${rating}/5` : '',
      liked.trim() && `O que me fez continuar: ${liked.trim()}`,
      bored.trim() && `O que me aborreceu ou confundiu: ${bored.trim()}`,
      change.trim() && `O que mudava: ${change.trim()}`,
      name.trim() && `Nome: ${name.trim()}`,
      `— ${moment} · versão corrida diária · temporada ${season(game)}, semana ${weekInSeason(game)}, dia ${game.today - game.born + 1} · nota ${overall(game.a)} · nível ${level(game.xp)} · ${game.days.filter(d => d.how === 'real').length} treinos reais · ${game.results.length} provas · ${game.ath.cat} ${ageGroup(game.ath.age)} · início: ${START_NAME[game.ath.start]}`
    ].filter(Boolean);
    setText(lines.join('\n'));
    onSent?.();
  }

  async function copy() {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied('Texto copiado. Cola-o numa mensagem para quem te convidou.'); }
    catch { setCopied('Não deu para copiar automaticamente: seleciona o texto acima e copia-o.'); }
  }

  if (text) {
    return (
      <div className="card acc">
        <b>Obrigado!</b>
        <span className="small">Envia a tua opinião a quem te convidou para testar:</span>
        <textarea id="fb-text" readOnly value={text} rows={6} aria-label="Texto da opinião" />
        <div className="row">
          <a className="btn sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
          <button className="btn sm" onClick={copy}>Copiar texto</button>
          <button className="btn sm ghost" onClick={onClose}>Fechar</button>
        </div>
        {copied && <span className="small" role="status">{copied}</span>}
      </div>
    );
  }

  return (
    <div className="card acc">
      <b>A tua opinião</b>
      <div className="f"><span>De 1 a 5, quanto estás a gostar?</span>
        <div className="seg" role="group" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map(n => <button key={n} aria-pressed={rating === n} onClick={() => { setRating(n); setError(''); }}>{n}</button>)}
        </div>
      </div>
      <label className="f">O que te fez continuar a jogar?<textarea id="fb-liked" rows={2} value={liked} onChange={e => { setLiked(e.target.value); setError(''); }} /></label>
      <label className="f">O que te aborreceu ou confundiu?<textarea id="fb-bored" rows={2} value={bored} onChange={e => { setBored(e.target.value); setError(''); }} /></label>
      <label className="f">O que mudavas ou acrescentavas?<textarea id="fb-change" rows={2} value={change} onChange={e => { setChange(e.target.value); setError(''); }} /></label>
      <label className="f">O teu nome (opcional)<input type="text" id="fb-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
      {error && <span className="err">{error}</span>}
      <div className="row">
        <button className="btn sm" onClick={compose}>Continuar</button>
        <button className="btn sm ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}
