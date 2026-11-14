import { useState } from 'react';
import { dec, myClub, type GameState } from '../../engine';
import { Flash, Seg } from '../components';

export function ClubScreen({ game, flash, setFlash }: { game: GameState; flash: string; setFlash: (t: string) => void }) {
  const [view, setView] = useState<'semana' | 'divisao'>('semana');
  const c = myClub(game), C = game.club;
  const table = [{ n: c.n, v: view === 'divisao' ? C.season : C.score, me: true }, ...C.others.map(o => ({ n: o.n, v: view === 'divisao' ? o.season : o.score, me: false }))].sort((a, b) => b.v - a.v);
  const people = [...C.members.map(m => ({ nm: m.nm, pts: m.pts, me: false })), { nm: 'Tu', pts: C.myPts ?? 0, me: true }].sort((a, b) => b.pts - a.pts);
  const friends = C.members.slice(0, 3);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(game.invite);
      setFlash(`Código ${game.invite} copiado.`);
    } catch {
      setFlash(`Copia o código à mão: ${game.invite}`);
    }
  }

  return (
    <>
      <Flash text={flash} />
      <div className="between"><h1>{c.n}</h1><span className="chip acc">verificado</span></div>
      <div className="small muted">{c.members} membros · {C.members.length + 1} no jogo · divisão {C.div} · {table.findIndex(t => t.me) + 1}º</div>
      <Seg value={view} options={[['semana', 'Semana'], ['divisao', 'Divisão']]} onChange={setView} />

      {view === 'semana' ? (
        C.myPts != null ? (
          <>
            <span className="lbl">Classificação da semana, pontos</span>
            <div className="lb">
              {people.slice(0, 8).map((p, i) => (
                <div key={p.nm} className={`it${p.me ? ' me' : ''}`}><span className="n">{i + 1}</span><span>{p.nm}</span><span className="t">{p.pts}</span></div>
              ))}
            </div>
            <div className="card"><b>Pontuação do clube: {C.score}</b><span className="small muted">Média do top 10 com {Math.round(C.part * 100)}% de membros ativos. Assim, clubes grandes e pequenos competem.</span></div>
          </>
        ) : <div className="small muted">A classificação aparece quando fechares a primeira semana.</div>
      ) : (
        <>
          <span className="lbl">Divisão {C.div} · pontos da temporada</span>
          <div className="lb">
            {table.map((t, i) => <div key={t.n} className={`it${t.me ? ' me' : ''}`}><span className="n">{i + 1}</span><span>{t.n}</span><span className="t">{t.v}</span></div>)}
          </div>
          <div className="small muted">No fim da temporada o 1º sobe e o último desce.</div>
        </>
      )}

      <div className="card acc"><b>{c.ev.t}</b><span className="small">{c.ev.where} · {c.ev.sp === 'bike' ? 'um treino de bike' : 'uma corrida'} nesse dia dá +15% e conta para o clube.</span></div>

      <h2 style={{ marginTop: 6 }}>Treinar juntos</h2>
      <div className="card">
        <b>Long run de domingo</b>
        <span className="small muted">Tu, {friends.map(m => m.nm.split(' ')[0]).join(', ')}</span>
        <div className="between"><div className="dots"><i /><i /><i /><i /></div><span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>Corrida Z2 ao domingo: +15%</span></div>
      </div>
      <div className="card">
        <b>Desafio: mais horas em Z2</b>
        {game.chal ? (
          <span className="small">{game.chal.won ? 'Ganhaste a semana passada' : 'A semana passada'}: tu {dec(game.chal.me)} h · {game.chal.fr.map(f => `${f.nm.split(' ')[0]} ${dec(f.h)} h`).join(' · ')}</span>
        ) : <span className="small muted">Começa quando fechares a primeira semana. Conta bike e corrida em Z2.</span>}
      </div>
      <div className="card acc">
        <b>Corre comigo</b>
        <span className="small">Convida amigos com o teu código. Quem entra começa com um kit e 14 dias de Pro.</span>
        <div className="between"><span className="code">{game.invite}</span><button className="btn sm" onClick={copyCode}>Copiar código</button></div>
        <span className="small muted">Os convites ainda não chegam a ninguém: precisam do servidor.</span>
      </div>
    </>
  );
}
