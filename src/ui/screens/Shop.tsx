import { useState } from 'react';
import { CAMPS, SHOP, bookCamp, buy, cancelSubscription, eur, price, type GameState } from '../../engine';
import { Flash } from '../components';
import { buzz } from '../fx';
import { Icon, SHOP_ICON } from '../icons';
import type { Apply } from '../useGame';

const CAT_SP: Record<string, string> = { Sapatilhas: 'sp-fast', Tecnologia: 'sp-easy', 'Recuperação': 'sp-good' };
const CAMPS_CAT = 'Estágios';

export function ShopScreen({ game, apply, flash, setFlash }: { game: GameState; apply: Apply; flash: string; setFlash: (t: string) => void }) {
  const cats = [...new Set(SHOP.map(i => i.cat))];
  const [cat, setCat] = useState<string>('Tudo');
  const show = (c: string) => cat === 'Tudo' || cat === c;
  const act = (msg: string | undefined) => { setFlash(msg ?? ''); buzz([10, 30, 10]); };
  return (
    <>
      <Flash text={flash} onClose={() => setFlash('')} />
      <div className="title"><h1>Loja</h1><span className="chip good"><Icon name="coin" />{eur(game.money)}</span></div>
      <div className="cats" role="group" aria-label="Categorias">
        {['Tudo', ...cats, CAMPS_CAT].map(c => (
          <button key={c} className="btn sm soft" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {cats.filter(show).map(c => (
        <section key={c} className="stack" style={{ gap: 8 }}>
          <span className="lbl">{c}</span>
          <div className="shop-grid">
            {SHOP.filter(i => i.cat === c).map(i => {
              const pr = price(game, i), own = game.owned[i.id] && !i.once, sub = i.sub && game.subs[i.id], poor = game.money < pr;
              return (
                <div key={i.id} className={`card prod ${CAT_SP[c] ?? 'sp-acc'}${own || sub ? ' owned' : ''}`}>
                  <div className="between"><span className="tile"><Icon name={SHOP_ICON(c)} /></span>{(own || sub) && <span className="chip good"><Icon name="check" />{sub ? 'ativo' : 'tens'}</span>}</div>
                  <b>{i.n}</b>
                  <span className="desc">{i.d}</span>
                  <span className="price">{eur(pr)}{i.sub ? <span className="small muted">/sem</span> : ''}</span>
                  {own ? null
                    : sub ? <button className="btn sm ghost" onClick={() => apply(s => cancelSubscription(s, i.id))}>Cancelar</button>
                    : <button className="btn sm dark" disabled={poor} onClick={() => act(apply(s => buy(s, i.id)))}>{poor ? 'Sem saldo' : 'Comprar'}</button>}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {show(CAMPS_CAT) && (
        <section className="stack" style={{ gap: 8 }}>
          <span className="lbl">{CAMPS_CAT}</span>
          <span className="small muted">Começam hoje. Durante o estágio não contas para os treinos do clube.</span>
          {CAMPS.map(c => {
            const active = game.camp?.id === c.id, poor = game.money < c.cost;
            return (
              <div key={c.id} className={`card ${active ? 'acc' : ''}`}>
                <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
                  <span className={`tile lg ${c.id === 'pista' ? 'sp-fast' : c.id === 'calor' ? 'sp-long' : 'sp-acc'}`}><Icon name={c.id === 'pista' ? 'timer' : c.id === 'calor' ? 'sun' : 'mountain'} size={26} /></span>
                  <div className="stack" style={{ flex: 1 }}>
                    <b>{c.n}</b>
                    <span className="small muted">{c.d}</span>
                  </div>
                </div>
                <div className="between">
                  <span className="price" style={{ font: '700 20px var(--display)' }}>{eur(c.cost)} <span className="small muted">· {c.days} dias</span></span>
                  {active ? <span className="chip acc">em curso</span>
                    : <button className="btn sm dark" disabled={poor || !!game.camp} onClick={() => act(apply(s => bookCamp(s, c.id)))}>{poor ? 'Sem saldo' : game.camp ? 'Já em estágio' : 'Marcar'}</button>}
                </div>
              </div>
            );
          })}
        </section>
      )}
      <div className="small muted">Marcas fictícias. A arte final dos produtos fica para o fim.</div>
    </>
  );
}
