// A ligação à realidade no ecrã: o atleta do jogo ao lado do teu tempo verificado, o teste real e os números para comparar.
import { useState } from 'react';
import {
  BAL, DIST, VER_SRC_NAME, addRealActivities, atCap, equivalent, fmt, gapPct, isVerified, level, predict, readFiles, realProgress, testDue,
  type GameState
} from '../engine';
import { Title } from './components';
import { buzz } from './fx';
import { Icon } from './icons';
import type { Apply } from './useGame';

const pct = (x: number) => `${x > 0 ? '+' : ''}${(x * 100).toFixed(1).replace('.', ',')}%`;
const ago = (days: number) => (days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`);

/** Escala da barra: de 4% mais lento a 10% mais rápido do que o tempo verificado. */
const LO = -0.04, HI = 0.1;
const at = (x: number) => `${((Math.max(LO, Math.min(HI, x)) - LO) / (HI - LO)) * 100}%`;

/** Os dois tempos lado a lado, na distância do último tempo verificado. */
export function TwoTimes({ game }: { game: GameState }) {
  const v = game.ver, t = v.t, g = gapPct(game), cap = atCap(game), ok = isVerified(game);
  return (
    <div className="twotimes" aria-label="O atleta do jogo e o teu tempo verificado">
      <div className="tt-row">
        <div className="tt"><span className="lbl">Atleta do jogo</span><b className="mono">{fmt(predict(game.a, t))}</b><small>{DIST[t].l} hoje</small></div>
        <div className="tt"><span className="lbl">Tu, verificado</span><b className="mono">{ok ? fmt(v.sec) : '—'}</b><small>{ok ? `${VER_SRC_NAME[v.src]} · ${ago(game.today - v.d)}` : 'ainda sem tempo real'}</small></div>
      </div>
      <div className="gapbar" role="img" aria-label={`O atleta do jogo está ${pct(g)} face ao teu tempo verificado; o teto é +${BAL.verCap * 100}%.`}>
        <span className="zone" style={{ left: at(0), width: `calc(${at(BAL.verCap)} - ${at(0)})` }} />
        <span className="tick" style={{ left: at(0) }} />
        <span className="tick cap" style={{ left: at(BAL.verCap) }} />
        <span className={`dot${cap ? ' at' : ''}`} style={{ left: at(g) }} />
      </div>
      <div className="gaplbl small muted" aria-hidden="true"><span style={{ left: at(0) }}>o teu tempo</span><span style={{ left: at(BAL.verCap) }}>teto +{BAL.verCap * 100}%</span></div>
      <span className="small">
        {!ok ? 'O atleta ainda não está verificado: faz um teste real para o jogo saber quanto vales.'
          : cap ? <>O atleta do jogo chegou ao teto: está <b>{pct(g)}</b> à tua frente. Para subir mais, mostra-o na estrada com um teste real.</>
          : g >= 0 ? <>O atleta do jogo está <b>{pct(g)}</b> à frente do teu tempo verificado. A assiduidade pode levá-lo até +{BAL.verCap * 100}%.</>
          : <>O atleta do jogo está <b>{pct(g)}</b> atrás do teu tempo verificado: treina para o recuperar.</>}
      </span>
    </div>
  );
}

/** O teste real: carregar uma corrida a fundo (o ideal são 5 km). Aparece no Hoje quando está na altura. */
export function TestCard({ game, apply, setFlash, always }: { game: GameState; apply: Apply; setFlash: (t: string) => void; always?: boolean }) {
  if (!always && !testDue(game) && !atCap(game)) return null;
  const ok = isVerified(game);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const { acts, errs } = await readFiles(Array.from(files));
    setFlash(apply(s => addRealActivities(s, acts, errs, { test: true })) ?? '');
    buzz([20, 60, 20]);
  }
  function sample() {
    // exemplo para quem está a experimentar: um 5 km real 2% mais lento do que o atleta do jogo
    const sec = predict(game.a, '5k') * 1.02;
    setFlash(apply(s => addRealActivities(s, [{ sport: 'run', start: Date.now() - 3600e3, sec, km: 5, hr: 182 }], [], { test: true })) ?? '');
    buzz([20, 60, 20]);
  }
  return (
    <div className="card test-card">
      <Title icon="timer" right={<span className="chip gold">+{BAL.testXp} pts</span>}>{ok ? 'Teste dos 5 km' : 'Verifica o teu atleta'}</Title>
      <span className="small">
        {!ok ? 'Corre 5 km a fundo (ou outra distância de prova) e carrega o ficheiro. O jogo passa a saber quanto vales e o atleta fica verificado.'
          : atCap(game) ? 'O atleta do jogo está no teto. Um teste real mostra se já vales mais e desbloqueia a evolução.'
          : `O teu último tempo verificado é de ${ago(game.today - game.ver.d)}. Uma vez por mês, um teste mantém o jogo perto da realidade.`}
      </span>
      <span className="small muted">Corridas de 3 a 45 km dos últimos 7 dias. Se correres mais devagar do que o atleta do jogo, ele desce aos poucos; se correres mais depressa, sobe logo até ao teu tempo.</span>
      <div className="row">
        <label className="btn sm dark file"><Icon name="upload" size={15} />Carregar o teste
          <input type="file" multiple accept=".fit,.gpx,.tcx" aria-label="Carregar o ficheiro do teste" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
        </label>
        <button className="btn sm ghost" onClick={sample}>Teste de exemplo</button>
      </div>
    </div>
  );
}

/** Dois quadros para comparar com amigos: dedicação (no jogo) e evolução real (verificada). */
export function CompareCard({ game }: { game: GameState }) {
  const [copied, setCopied] = useState('');
  const played = game.days.filter(d => d.how !== 'auto' && d.how !== 'miss').length;
  const real = game.days.filter(d => d.how === 'real').length;
  const ok = isVerified(game), prog = realProgress(game);
  const first5 = equivalent(game.verFirst, '5k'), now5 = equivalent(game.ver, '5k');
  const text = [
    `O meu Transição (${game.ath.name})`,
    `Dedicação: nível ${level(game.xp)} · ${game.xp} pontos · melhor série ${game.bestStreak} dias · ${played} dias jogados`,
    ok ? `Evolução real: 5 km ${fmt(first5)} → ${fmt(now5)} (${pct(prog)}) · ${real} treinos reais` : 'Evolução real: ainda sem tempo verificado',
    'E tu?'
  ].join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied('Copiado. Cola numa conversa com os teus amigos.'); }
    catch { setCopied('Não deu para copiar: usa o botão do WhatsApp.'); }
  }
  return (
    <div className="card">
      <Title icon="trophy">Para comparar com amigos</Title>
      <div className="grid2">
        <div className="cmp">
          <span className="lbl">Dedicação</span>
          <b className="stat-v">nível {level(game.xp)}</b>
          <span className="small muted">{game.xp} pontos · melhor série {game.bestStreak} dias · {played} dias jogados</span>
        </div>
        <div className="cmp">
          <span className="lbl">Evolução real</span>
          <b className="stat-v">{ok ? pct(prog) : '—'}</b>
          <span className="small muted">{ok ? `5 km ${fmt(first5)} → ${fmt(now5)} · ${real} treinos reais` : 'Faz um teste real para começar a contar.'}</span>
        </div>
      </div>
      <span className="small muted">A dedicação mede o jogo; a evolução real só conta tempos verificados, por isso ninguém sobe nela só a carregar em botões. As tabelas entre amigos chegam com as contas; para já, partilha os teus números.</span>
      <div className="row">
        <a className="btn sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><Icon name="share" size={15} />WhatsApp</a>
        <button className="btn sm" onClick={copy}>Copiar</button>
      </div>
      {copied && <span className="small" role="status">{copied}</span>}
    </div>
  );
}
