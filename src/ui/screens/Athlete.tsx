import { useState } from 'react';
import {
  ATTR, BAL, SHOP, SPORT_NAME, STYLE_NAME, ageGroup, dec, eur, form, myClub, overall, quitJob, returnToJob,
  type AttrKey, type GameState, type Sport
} from '../../engine';
import { LineChart } from '../charts';
import { Avatar, Seg, Stat, Title, Track } from '../components';
import { applyTheme, buzz, loadTheme, type Theme } from '../fx';
import { Icon, SHOP_ICON, SPORT_ICON } from '../icons';
import type { Apply } from '../useGame';

const BADGES = [4, 8, 12, 20];

export function AthleteScreen({ game, apply, onReset }: { game: GameState; apply: Apply; onReset: () => void }) {
  const [quitAsk, setQuitAsk] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const A = game.ath, R = game.rival, ovr = overall(game.a), f = form(game);
  const owned = SHOP.filter(i => game.owned[i.id] && !(i.id === 'carbon' && A.start === 'filinto'));
  const sponsorsWeekly = game.sponsors.reduce((a, s) => a + s.weekly, 0);
  const streak = game.realStreak ?? 0, verified = (game.realTotal ?? 0) >= 5, best = game.realBest ?? 0;
  const hist = game.hist ?? [];
  const attrs = (Object.entries(ATTR) as [AttrKey, [string, Sport]][]);

  return (
    <>
      <div className="card hero">
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          <Avatar name={A.name} size={68} badge={ovr} />
          <div className="stack">
            <h1 style={{ fontSize: 26 }}>{A.name}</h1>
            <div className="row" style={{ gap: 6 }}>
              <span className="chip">{A.cat === 'F' ? 'Feminino' : 'Masculino'}</span>
              <span className="chip">{A.age} anos · {ageGroup(A.age)}</span>
              {verified && <span className="chip"><Icon name="check" />verificado</span>}
            </div>
            <span className="small muted"><Icon name="pin" size={13} /> {A.city} · {myClub(game).n}</span>
          </div>
        </div>
        <div className="cond">
          <Stat label="Fitness" value={Math.round(game.ctl)} sub="carga de base" />
          <Stat label="Fadiga" value={Math.round(game.fatigue)} sub="0 a 100" />
          <Stat label="Forma" value={`${f >= 0 ? '+' : ''}${Math.round(f)}`} sub="no dia da prova" />
        </div>
        <span className="small muted">A forma é o fitness menos a carga das últimas semanas: treina com consistência e alivia antes das provas.</span>
      </div>

      <div className="card">
        <Title icon="user" right={<span className="chip acc">nota {ovr}</span>}>Atributos</Title>
        {(['swim', 'bike', 'run', 'gen'] as Sport[]).map(sp => {
          const list = attrs.filter(([, v]) => v[1] === sp);
          const avg = list.reduce((a, [k]) => a + game.a[k], 0) / list.length;
          return (
            <div key={sp} className={`stack sp-${sp}`} style={{ gap: 8 }}>
              <div className="between">
                <span className="row" style={{ gap: 8 }}><span className="tile sm"><Icon name={SPORT_ICON[sp]} size={16} /></span><b>{SPORT_NAME[sp]}</b></span>
                <span className="small muted">média {Math.round(avg)}</span>
              </div>
              {list.map(([k, v]) => (
                <div key={k} className="attr">
                  <span className="small">{v[0]}</span><span className="v">{Math.round(game.a[k])}</span>
                  <Track value={game.a[k]} color={sp === 'gen' ? 'var(--muted)' : `var(--${sp})`} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="card">
        <Title icon="trend">Evolução</Title>
        <LineChart title="Nota geral" data={hist.map(h => ({ x: h.w, y: h.ovr }))} />
        <LineChart title="Forma" data={hist.map(h => ({ x: h.w, y: h.form }))} zero fmt={v => `${v >= 0 ? '+' : ''}${Math.round(v)}`} />
        <LineChart title="Fadiga" data={hist.map(h => ({ x: h.w, y: h.fat }))} min={0} max={100} />
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
        {(game.realTotal ?? 0) > 0 ? (
          <div className="grid2">
            <Stat label="Importados" value={game.realTotal} sub="treinos reais" />
            <Stat label="Série" value={`${streak} sem.`} sub={`com ${BAL.realStreakMin} ou mais por semana`} />
          </div>
        ) : <span className="small muted">Importa treinos reais na semana: valem +{Math.round((BAL.realBonus - 1) * 100)}% e, com {BAL.realStreakMin} por semana, contam para a série e para o selo de atleta verificado.</span>}
        <div className="badges">
          {BADGES.map(b => (
            <div key={b} className={`badge sp-gold${best >= b ? '' : ' off'}`}>
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
          <div className="stack"><b>{game.job ? 'Emprego a meio tempo' : 'Atleta a tempo inteiro'}</b><span className="small muted">{game.job ? `+${eur(BAL.salary)} por semana, mais fadiga` : '+10% nos ganhos de treino'} · custo de vida {eur(BAL.living)}/sem.</span></div>
          <span />
        </div>
        {game.injury > 0 && <div className="tip warn"><Icon name="alert" size={17} /><span>Lesão: {game.injuryName} ({game.injury} semana{game.injury === 1 ? '' : 's'}).</span></div>}
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
        <Title icon="bike">Equipamento</Title>
        {game.gear.map(([a, b]) => (
          <div key={a} className="item ic-row"><span className="tile sm sp-gen"><Icon name="check" size={15} /></span><span>{a}</span><span className="small muted">{b}</span></div>
        ))}
        {owned.map(i => (
          <div key={i.id} className="item ic-row"><span className="tile sm sp-acc"><Icon name={SHOP_ICON(i.cat)} size={15} /></span><span>{i.n}</span><span className="small muted">{i.d}</span></div>
        ))}
        <div className="item ic-row">
          <span className={`tile sm ${game.shoeKm > 700 ? 'sp-bad' : 'sp-run'}`}><Icon name="shoe" size={15} /></span>
          <div className="stack"><span>Sapatilhas de treino</span><Track thin value={(game.shoeKm / 800) * 100} color={game.shoeKm > 700 ? 'var(--bad)' : 'var(--run)'} /></div>
          <span className={`small mono${game.shoeKm > 700 ? ' bad-t' : ' muted'}`}>{dec(game.shoeKm, 0)} km</span>
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
