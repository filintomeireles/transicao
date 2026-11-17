import { useState } from 'react';
import {
  ATTR, BAL, DIST, SHOP, STYLE_NAME, TALENTS, ageGroup, dateLabel, dec, eur, fmt, form, level, myClub, overall, pickTalent, predict,
  isVerified, quitJob, returnToJob, talentPoints, xpForLevel,
  type AttrKey, type GameState, type RaceType
} from '../../engine';
import { LineChart } from '../charts';
import { Avatar, Flash, Seg, Stat, Title, Track } from '../components';
import { applyTheme, buzz, loadTheme, type Theme } from '../fx';
import { FAM_ICON, Icon, SHOP_ICON } from '../icons';
import { CompareCard, TestCard, TwoTimes } from '../Reality';
import type { Apply } from '../useGame';

const BADGES = [4, 8, 12, 20];

export function AthleteScreen({ game, apply, onReset, flash, setFlash }: { game: GameState; apply: Apply; onReset: () => void; flash: string; setFlash: (t: string) => void }) {
  const [quitAsk, setQuitAsk] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const A = game.ath, R = game.rival, ovr = overall(game.a), f = form(game), lv = level(game.xp), tp = talentPoints(game);
  const owned = SHOP.filter(i => game.owned[i.id]);
  const sponsorsWeekly = game.sponsors.reduce((a, s) => a + s.weekly, 0);
  const verified = isVerified(game);
  const hist = game.hist;

  return (
    <>
      <Flash text={flash} onClose={() => setFlash('')} />
      <div className="card hero">
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          <Avatar name={A.name} size={68} badge={ovr} />
          <div className="stack">
            <h1 style={{ fontSize: 26 }}>{A.name}</h1>
            <div className="row" style={{ gap: 6 }}>
              <span className="chip">{A.cat === 'F' ? 'Feminino' : 'Masculino'}</span>
              <span className="chip">{A.age} anos · {ageGroup(A.age)}</span>
              <span className="chip"><Icon name="star" />nível {lv}</span>
              {verified && <span className="chip"><Icon name="check" />verificado</span>}
            </div>
            <span className="small muted"><Icon name="pin" size={13} /> {A.city} · {myClub(game).n}</span>
          </div>
        </div>
        <div className="pbs">
          {(Object.keys(DIST) as RaceType[]).map(t => (
            <div key={t}>
              <span>{DIST[t].l.replace('Meia maratona', 'Meia')}</span>
              <b>{game.pb[t] ? fmt(game.pb[t]!) : '—'}</b>
              <small>previsto {fmt(predict(game.a, t))}</small>
            </div>
          ))}
        </div>
        <span className="small muted">Em cima o recorde do atleta nas provas do jogo; em baixo o tempo que o jogo prevê hoje, em plano e bem gerido.</span>
      </div>

      <div className="card">
        <Title icon="check">O jogo e a realidade</Title>
        <TwoTimes game={game} />
      </div>
      <TestCard game={game} apply={apply} setFlash={setFlash} always />
      <CompareCard game={game} />

      <div className="card">
        <Title icon="star" right={tp > 0 ? <span className="chip gold pulse">{tp} ponto{tp > 1 ? 's' : ''} por gastar</span> : <span className="chip">nível {lv}</span>}>Nível e talentos</Title>
        <div className="attr">
          <span className="small">{Math.round(game.xp - xpForLevel(lv))} de {xpForLevel(lv + 1) - xpForLevel(lv)} pontos para o nível {lv + 1}</span><span className="v">{lv}</span>
          <Track value={((game.xp - xpForLevel(lv)) / (xpForLevel(lv + 1) - xpForLevel(lv))) * 100} color="var(--gold)" />
        </div>
        <span className="small muted">Ganhas pontos a treinar: um treino real vale o dobro, um confirmado 1,5 vezes, e o piloto automático quase nada. Cada nível dá um talento.</span>
        <div className="talents">
          {TALENTS.map(t => {
            const on = game.talents.includes(t.id);
            return on ? (
              <div key={t.id} className="talent on"><b className="small"><Icon name="check" size={14} /> {t.n}</b><span className="small muted">{t.d}</span></div>
            ) : (
              <button key={t.id} className="talent" disabled={tp <= 0} onClick={() => { buzz([10, 40, 10]); apply(s => pickTalent(s, t.id)); }}>
                <b className="small">{t.n}</b><span className="small muted">{t.d}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <Title icon="user" right={<span className="chip acc">nota {ovr}</span>}>Atributos</Title>
        {(Object.keys(ATTR) as AttrKey[]).map(k => {
          const [n, d, fam] = ATTR[k];
          return (
            <div key={k} className={`stack sp-${fam}`} style={{ gap: 6 }}>
              <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
                <span className="tile sm"><Icon name={k === 'men' ? 'heart' : FAM_ICON[fam]} size={15} /></span>
                <div className="stack" style={{ flex: 1, gap: 0 }}><b className="small">{n}</b><span className="small muted">{d}</span></div>
                <span className="v" style={{ font: '700 20px var(--display)' }}>{Math.round(game.a[k])}</span>
              </div>
              <Track value={game.a[k]} color={`var(--sp)`} />
            </div>
          );
        })}
        <span className="small muted">Fitness {Math.round(game.ctl)} · fadiga {Math.round(game.fatigue)} · forma {f >= 0 ? '+' : ''}{Math.round(f)}. A forma é o fitness (carga das últimas 6 semanas) menos a carga dos últimos 7 dias: treina com consistência e alivia antes das provas.</span>
      </div>

      <div className="card">
        <Title icon="trend">Evolução</Title>
        <LineChart title="Nota geral" data={hist.map(h => ({ x: h.d, y: h.ovr }))} xLabel={dateLabel} />
        <LineChart title="Forma" data={hist.map(h => ({ x: h.d, y: h.form }))} xLabel={dateLabel} zero fmt={v => `${v >= 0 ? '+' : ''}${Math.round(v)}`} />
        <LineChart title="Fadiga" data={hist.map(h => ({ x: h.d, y: h.fat }))} xLabel={dateLabel} min={0} max={100} />
      </div>

      <div className="card">
        <Title icon="target" right={R.style && <span className="chip">{STYLE_NAME[R.style]}</span>}>Rival</Title>
        <div className="vs">
          <div className="side"><Avatar name={A.name} size={52} /><b className="small">Tu</b><span className="small muted">nota {ovr}</span></div>
          <div className="stack" style={{ alignItems: 'center' }}><span className="score">{R.beaten}<span className="muted"> – </span>{R.lost}</span><span className="small muted">duelos</span></div>
          <div className="side"><Avatar name={R.nm} size={52} ring={R.out ? 'var(--warn)' : undefined} /><b className="small">{R.nm}</b><span className="small muted">nota {Math.round(R.r)} · {ageGroup(R.age)}</span></div>
        </div>
        {R.out ? <span className="chip warn" style={{ alignSelf: 'center' }}>lesionado · {R.out} sem.</span> : null}
        {(R.run ?? 0) >= 2 && <span className="small" style={{ textAlign: 'center' }}>Ganhaste os últimos {R.run}: mais uma e fica para trás.</span>}
        {!!game.rivals?.length && <span className="small muted">Rivais antigos: {game.rivals.map(r => `${r.nm} (${r.beaten}–${r.lost})`).join(' · ')}</span>}
      </div>

      <div className="card">
        <Title icon="upload" right={verified ? <span className="chip good"><Icon name="check" />atleta verificado</span> : undefined}>Treino real</Title>
        <div className="grid3">
          <Stat label="Importados" value={game.realTotal} sub="treinos reais" />
          <Stat label="Série" value={`${game.realStreak} sem.`} sub={`com ${BAL.realStreakMin}+ reais`} />
          <Stat label="Dias seguidos" value={game.streak} sub={`melhor ${game.bestStreak}`} />
        </div>
        <span className="small muted">Um treino real vale {dec(BAL.real)} vezes um simulado e dá o dobro dos pontos. Com {BAL.realStreakMin} por semana contas para a série e, a partir de 5, ganhas o selo de atleta verificado.</span>
        <div className="badges">
          {BADGES.map(b => (
            <div key={b} className={`badge sp-gold${game.realBest >= b ? '' : ' off'}`}>
              <span className="tile"><Icon name="medal" size={24} /></span>
              <span>{b} semanas seguidas</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <Title icon="heart">Vida</Title>
        <div className="item ic-row">
          <span className="tile sp-acc"><Icon name={game.job ? 'file' : 'star'} /></span>
          <div className="stack"><b>{game.job ? 'Emprego' : 'Atleta a tempo inteiro'}</b><span className="small muted">{game.job ? `+${eur(BAL.salary)} por semana, mais fadiga nos dias úteis` : '+10% nos ganhos de treino'} · custo de vida {eur(BAL.living)}/sem.</span></div>
          <span />
        </div>
        {game.injury > 0 && <div className="tip warn"><Icon name="alert" size={17} /><span>Lesão: {game.injuryName} ({game.injury} dias). Podes fazer treino cruzado e força.</span></div>}
        {game.job ? (
          quitAsk ? (
            <div className="tip warn">
              <Icon name="alert" size={17} />
              <div className="stack" style={{ gap: 8 }}>
                <b>Largar o emprego?</b>
                <span className="small">Perdes {eur(BAL.salary)} por semana. Os patrocínios rendem {eur(sponsorsWeekly)} por semana.</span>
                <div className="row">
                  <button className="btn sm dark" onClick={() => { buzz(); apply(quitJob); setQuitAsk(false); }}>Sim, largar</button>
                  <button className="btn sm ghost" onClick={() => setQuitAsk(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          ) : <div><button className="btn sm" onClick={() => setQuitAsk(true)}>Largar o emprego</button></div>
        ) : <div><button className="btn sm" onClick={() => apply(returnToJob)}>Voltar ao emprego</button></div>}
      </div>

      <div className="card">
        <Title icon="shoe">Equipamento</Title>
        {game.gear.map(([a, b]) => (
          <div key={a} className="item ic-row"><span className="tile sm sp-gen"><Icon name="check" size={15} /></span><span>{a}</span><span className="small muted">{b}</span></div>
        ))}
        {owned.map(i => (
          <div key={i.id} className="item ic-row"><span className="tile sm sp-acc"><Icon name={SHOP_ICON(i.cat)} size={15} /></span><span>{i.n}</span><span className="small muted">{i.d}</span></div>
        ))}
        <div className="item ic-row">
          <span className={`tile sm ${game.shoeKm > 700 ? 'sp-bad' : 'sp-fast'}`}><Icon name="shoe" size={15} /></span>
          <div className="stack"><span>Sapatilhas de treino</span><Track thin value={(game.shoeKm / 800) * 100} color={game.shoeKm > 700 ? 'var(--bad)' : 'var(--fast)'} /></div>
          <span className={`small mono${game.shoeKm > 700 ? ' bad-t' : ' muted'}`}>{game.shoeKm} km</span>
        </div>
      </div>

      <div className="card">
        <Title icon="info">Jogo</Title>
        <span className="small muted">Tema</span>
        <Seg label="Tema" value={theme} options={[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']]} onChange={t => { setTheme(t); applyTheme(t); }} />
        {resetAsk ? (
          <div className="tip warn">
            <Icon name="alert" size={17} />
            <div className="stack" style={{ gap: 8 }}>
              <b>Apagar esta carreira?</b>
              <span className="small">Não dá para desfazer.</span>
              <div className="row">
                <button className="btn sm dark" onClick={onReset}>Apagar e recomeçar</button>
                <button className="btn sm ghost" onClick={() => setResetAsk(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        ) : <div><button className="btn sm ghost" onClick={() => setResetAsk(true)}>Nova carreira</button></div>}
      </div>
    </>
  );
}
