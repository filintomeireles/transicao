import { SHOP, buy, cancelSubscription, eur, price, type GameState } from '../../engine';
import { Flash } from '../components';
import type { Apply } from '../useGame';

export function ShopScreen({ game, apply, flash, setFlash }: { game: GameState; apply: Apply; flash: string; setFlash: (t: string) => void }) {
  const cats = [...new Set(SHOP.map(i => i.cat))];
  return (
    <>
      <Flash text={flash} />
      <div className="between"><h1>Loja</h1><span className="mono">{eur(game.money)}</span></div>
      {cats.map(c => (
        <div key={c} className="card">
          <h2>{c}</h2>
          {SHOP.filter(i => i.cat === c).map(i => {
            const pr = price(game, i), own = game.owned[i.id] && !i.once, sub = i.sub && game.subs[i.id];
            return (
              <div key={i.id} className="item">
                <div><b>{i.n}</b> <span className="mono small">{eur(pr)}{i.sub ? '/sem' : ''}</span><div className="small muted">{i.d}</div></div>
                {own ? <span className="chip good">Tens</span>
                  : sub ? <button className="btn sm" onClick={() => apply(s => cancelSubscription(s, i.id))}>Cancelar</button>
                  : <button className="btn sm" onClick={() => setFlash(apply(s => buy(s, i.id)) ?? '')}>{game.money < pr ? 'Sem saldo' : 'Comprar'}</button>}
              </div>
            );
          })}
        </div>
      ))}
      <div className="small muted">Marcas fictícias. A arte final dos produtos fica para o fim.</div>
    </>
  );
}
