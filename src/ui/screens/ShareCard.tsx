import { useEffect, useState } from 'react';
import { DIST, fmt, myClub, season, weekInSeason, type GameState, type RaceDef, type RaceResult } from '../../engine';

// Cores fixas: o cartão é uma imagem, igual em tema claro e escuro.
const C = { bg: '#141B2D', card: '#211F4A', ink: '#FFFFFF', muted: '#A8AFC4', accent: '#A99EF5', swim: '#3987e5', bike: '#c98500', run: '#d55181' };
const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

/** Desenha o cartão de resultado (1080 × 1350, formato de publicação nas redes). */
function draw(game: GameState, race: RaceDef, res: RaceResult): string {
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1350;
  const g = cv.getContext('2d')!;
  const text = (t: string, x: number, y: number, size: number, color = C.ink, weight = 400, font = FONT, align: CanvasTextAlign = 'left') => {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y);
  };
  g.fillStyle = C.bg; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = C.accent; g.fillRect(0, 0, 1080, 16);

  text('TRANSIÇÃO', 80, 120, 34, C.muted, 700);
  text(`Temporada ${season(game)} · semana ${weekInSeason(game)}`, 1000, 120, 30, C.muted, 400, FONT, 'right');
  text(race.n, 80, 220, 64, C.ink, 700);
  text(`${DIST[race.t].l} · ${DIST[race.t].swim} m · ${DIST[race.t].bike} km · ${String(DIST[race.t].run).replace('.', ',')} km`, 80, 275, 32, C.muted);

  text(`${res.p}${res.o}`, 80, 520, 230, C.ink, 700);
  text(`geral ${res.catL}`, 560, 420, 40, C.muted);
  text(`de ${res.N} atletas`, 560, 470, 40, C.muted);
  text(fmt(res.me.total), 560, 540, 64, C.ink, 600, MONO);

  g.fillStyle = C.card; g.beginPath(); g.roundRect(80, 600, 920, 120, 24); g.fill();
  g.fillStyle = C.accent; g.fillRect(80, 600, 12, 120);
  text(`${res.agP}${res.o} no escalão ${game.ath.cat} ${res.ag}`, 540, 677, 50, C.ink, 700, FONT, 'center');

  const splits: [string, number, string][] = [['Natação', res.me.swim, C.swim], ['T1', res.me.t1, C.muted], ['Bike', res.me.bike, C.bike], ['T2', res.me.t2, C.muted], ['Corrida', res.me.run, C.run]];
  splits.forEach(([label, t, color], i) => {
    const x = 80 + i * 188;
    g.fillStyle = color; g.fillRect(x, 790, 168, 8);
    text(label, x, 845, 28, C.muted);
    text(fmt(t), x, 895, 36, C.ink, 600, MONO);
  });

  if (res.beatRival) text(`Bati o meu rival, ${res.rivalNm}.`, 80, 1010, 40, C.ink);
  if (res.slot) text(res.slot, 80, 1065, 34, C.accent, 700);
  text(game.ath.name, 80, 1230, 48, C.ink, 700);
  text(myClub(game).n, 80, 1285, 32, C.muted);
  return cv.toDataURL('image/png');
}

export function ShareCard({ game, race, res, onClose }: { game: GameState; race: RaceDef; res: RaceResult; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Espera pelas fontes para o texto do cartão sair com a letra certa.
    let alive = true;
    document.fonts.ready.then(() => { if (alive) setUrl(draw(game, race, res)); });
    return () => { alive = false; };
  }, [game, race, res]);

  async function share() {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'transicao-resultado.png', { type: 'image/png' });
      if (!navigator.canShare?.({ files: [file] })) throw new Error('sem partilha');
      await navigator.share({ files: [file], text: `${res.p}${res.o} no ${race.n}. Joga comigo no Transição.` });
    } catch {
      setMsg('Aqui não dá para partilhar diretamente. Mantém o dedo na imagem (ou clica com o botão direito) para a guardar.');
    }
  }

  return (
    <div className="card">
      <b>Cartão para partilhar</b>
      {url ? <img src={url} alt={`Cartão: ${res.p}${res.o} no ${race.n}, ${fmt(res.me.total)}`} style={{ width: '100%', borderRadius: 8 }} /> : <span className="small muted">A desenhar…</span>}
      <div className="row">
        <button className="btn sm" onClick={share} disabled={!url}>Partilhar</button>
        <button className="btn sm ghost" onClick={onClose}>Fechar</button>
      </div>
      {msg && <span className="small" role="status">{msg}</span>}
    </div>
  );
}
