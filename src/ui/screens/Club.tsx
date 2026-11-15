import { useState } from 'react';
import { BAL, DAY_NAMES, dec, myClub, type GameState } from '../../engine';
import { Avatar, Crest, Flash, Seg, Stat, Title, Track } from '../components';
import { buzz } from '../fx';
import { Icon } from '../icons';

// Marca fictícia; mais tarde, clubes verificados podem ter o seu patrocinador real.
const CLUB_SPONSOR = 'Cooperativa do Rio';

export function ClubScreen({ game, flash, setFlash }: { game: GameState; flash: string; setFlash: (t: string) => void }) {
  const [view, setView] = useState<'semana' | 'divisao'>('semana');
  const c = myClub(game), C = game.club;
  const table = [{ n: c.n, v: view === 'divisao' ? C.season : C.score, me: true }, ...C.others.map(o => ({ n: o.n, v: view === 'divisao' ? o.season : o.score, me: false }))].sort((a, b) => b.v - a.v);
  const people = [...C.members.map(m => ({ nm: m.nm, pts: m.pts, me: false })), { nm: game.ath.name, pts: C.myPts ?? 0, me: true }].sort((a, b) => b.pts - a.pts);
  const friends = C.members.slice(0, 3);
  const pay = BAL.clubPay[C.div] ?? 0;
  const myEvents = game.clubEvents ?? 0;
  const topMember = C.members.map(m => ({ nm: m.nm, events: m.events ?? 0 })).sort((a, b) => b.events - a.events)[0];
  const rank = table.findIndex(t => t.me) + 1;
  const legend = myEvents > topMember.events;

  async function copyCode() {
    buzz();
    try {
      await navigator.clipboard.writeText(game.invite);
      setFlash(`Código ${game.invite} copiado.`);
    } catch {
      setFlash(`Copia o código à mão: ${game.invite}`);
    }
  }

  const medal = (i: number) => (i < 3 ? <span className={`medal m${i + 1}`}>{i + 1}</span> : i + 1);

  return (
    <>
      <Flash text={flash} onClose={() => setFlash('')} />
      <div className="card hero">
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          <Crest name={c.n} size={58} />
          <div className="stack">
            <h1 style={{ fontSize: 26 }}>{c.n}</h1>
            <div className="row" style={{ gap: 6 }}>
              <span className="chip"><Icon name="check" />verificado</span>
              <span className="chip">divisão {C.div}</span>
              <span className="chip">{rank}º na divisão</span>
            </div>
            <span className="small muted">{c.members} membros · {C.members.length + 1} no jogo</span>
          </div>
        </div>
      </div>

      <Seg label="Classificação do clube" value={view} options={[['semana', 'Semana'], ['divisao', 'Divisão']]} onChange={setView} />
      {view === 'semana' ? (
        C.myPts != null ? (
          <div className="card">
            <Title icon="club" right={<span className="chip acc">clube {C.score}</span>}>Classificação da semana</Title>
            <div className="lb">
              {people.slice(0, 8).map((p, i) => (
                <div key={p.nm} className={`it${p.me ? ' me' : ''}`}>
                  <span className="n">{medal(i)}</span>
                  <span className="who"><Avatar name={p.nm} size={26} /><span>{p.me ? 'Tu' : p.nm}</span></span>
                  <span className="t">{p.pts}</span>
                </div>
              ))}
            </div>
            <span className="small muted">Pontuação do clube: média do top 10 com {Math.round(C.part * 100)}% de membros ativos. Assim, clubes grandes e pequenos competem.</span>
          </div>
        ) : <div className="card flat small muted">A classificação aparece quando fechares a primeira semana.</div>
      ) : (
        <div className="card">
          <Title icon="trophy">Divisão {C.div} · temporada</Title>
          <div className="lb">
            {table.map((t, i) => (
              <div key={t.n} className={`it${t.me ? ' me' : ''}`}>
                <span className="n">{medal(i)}</span>
                <span className="who"><Crest name={t.n} size={20} /><span>{t.n}</span></span>
                <span className="t">{t.v}</span>
              </div>
            ))}
          </div>
          <span className="small muted">No fim da temporada o 1º sobe e o último desce. Subir dá a todos os membros +5 fama e o kit de campeão.</span>
        </div>
      )}

      <div className="card acc">
        <Title icon="pin" right={<span className="chip acc">{DAY_NAMES[c.ev.d]}</span>}>{c.ev.t}</Title>
        <span className="small">{c.ev.where} · {c.ev.sp === 'bike' ? 'um treino de bike' : 'uma corrida'} nesse dia dá +15% nos ganhos, pontos para o clube{pay ? ` e ${pay} € do patrocinador` : ''}.</span>
      </div>

      <div className="grid2">
        <div className="card">
          <Stat icon="coin" label="Patrocinador" value={`${pay} €`} sub={`por evento · ${CLUB_SPONSOR}`} />
          <span className="small muted">{BAL.clubPay[3]} € na divisão 3, {BAL.clubPay[2]} € na 2, {BAL.clubPay[1]} € na 1.{(game.clubKit ?? 0) > 0 ? ` Tens ${game.clubKit} kit${game.clubKit === 1 ? '' : 's'} de campeão.` : ''}</span>
        </div>
        <div className="card">
          <Stat icon="medal" label="Lenda do clube" value={legend ? 'Tu' : topMember.nm.split(' ')[0]} sub={legend ? `${myEvents} eventos` : `${topMember.events} eventos · tu ${myEvents}`} />
          {!legend && <Track thin value={(myEvents / (topMember.events + 1)) * 100} color="var(--gold)" />}
          {!legend && <span className="small muted">Faltam {topMember.events - myEvents + 1} para o título.</span>}
        </div>
      </div>

      <div className="card">
        <Title icon="flag" right={<span className="chip">semana 14</span>}>Estafeta do clube</Title>
        <div className="row" style={{ gap: 6 }}>
          <span className="chip" style={{ color: 'var(--swim)' }}><Icon name="swim" />nadar</span>
          <span className="chip" style={{ color: 'var(--bike)' }}><Icon name="bike" />pedalar</span>
          <span className="chip" style={{ color: 'var(--run)' }}><Icon name="run" />correr</span>
        </div>
        <span className="small">Equipa de três do clube contra outros clubes da divisão. Escolhes a tua parte e ganhas fama e pontos para o clube.</span>
      </div>

      <h2 style={{ marginTop: 6 }}><Icon name="club" size={18} />Treinar juntos</h2>
      <div className="card">
        <div className="between">
          <div className="stack"><b>Long run de domingo</b><span className="small muted">Corrida Z2 ao domingo: +15% nos ganhos</span></div>
          <div className="row" style={{ gap: 0, flexWrap: 'nowrap', flex: 'none' }}>
            {[game.ath.name, ...friends.map(m => m.nm)].map((nm, i) => <span key={nm} style={{ marginLeft: i ? -10 : 0 }}><Avatar name={nm} size={32} ring="var(--card)" /></span>)}
          </div>
        </div>
      </div>
      <div className="card">
        <Title icon="timer">Desafio: mais horas em Z2</Title>
        {game.chal ? (() => {
          const rows = [{ nm: 'Tu', h: game.chal.me, me: true }, ...game.chal.fr.map(x => ({ nm: x.nm.split(' ')[0], h: x.h, me: false }))].sort((a, b) => b.h - a.h);
          const top = Math.max(...rows.map(x => x.h), 1);
          return (
            <>
              <span className="small">{game.chal.won ? 'Ganhaste a semana passada!' : 'A semana passada:'}</span>
              {rows.map(x => (
                <div key={x.nm} className="attr">
                  <span className="small">{x.me ? <b>Tu</b> : x.nm}</span><span className="v" style={{ fontSize: 15 }}>{dec(x.h)} h</span>
                  <Track value={(x.h / top) * 100} color={x.me ? 'var(--accent)' : 'var(--axis)'} />
                </div>
              ))}
            </>
          );
        })() : <span className="small muted">Começa quando fechares a primeira semana. Conta bike e corrida em Z2.</span>}
      </div>
      <div className="card acc">
        <Title icon="gift">Corre comigo</Title>
        <span className="small">Convida amigos com o teu código. Quem entra começa com um kit e 14 dias de Pro.</span>
        <div className="between"><span className="code">{game.invite}</span><button className="btn sm dark" onClick={copyCode}><Icon name="copy" size={15} />Copiar</button></div>
        <span className="small muted">Os convites ainda não chegam a ninguém: precisam do servidor.</span>
      </div>
    </>
  );
}
