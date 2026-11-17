import { useState } from 'react';
import {
  BAL, CLUBS, DIST, PROFILES, calibrate, ageGroup, attrsFromActs, createAthlete, fmt, overall, parseTime, plausible, predict, readFiles, sampleActs, validateNewAthlete,
  type GameState, type RaceType, type RealTime, type ImportSummary, type NewAthlete, type ProfileKey, type StartKind
} from '../../engine';
import { Avatar, Seg, Title } from '../components';
import { Icon, type IconName } from '../icons';

/** Marca do jogo: três traços de velocidade (rodagem, longão, qualidade). */
export function Logo({ size = 52 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeWidth="4.2">
        <path d="M6 9h20" stroke="var(--easy)" /><path d="M10 16h16" stroke="var(--long)" /><path d="M14 23h12" stroke="var(--fast)" />
      </svg>
    </span>
  );
}

export function Onboarding({ onCreate }: { onCreate: (s: GameState) => void }) {
  const [o, setO] = useState<NewAthlete>({ name: '', cat: 'F', age: '', city: '', club: 'pacos', start: 'tempo', preset: 'regular' });
  const [imp, setImp] = useState<ImportSummary | null>(null);
  const [times, setTimes] = useState<Partial<Record<RaceType, string>>>({});
  const parsed: RealTime[] = (Object.keys(DIST) as RaceType[]).flatMap(t => {
    const sec = times[t] ? parseTime(times[t]!) : null;
    return sec && plausible(t, sec) ? [{ t, sec }] : [];
  });
  const badTimes = (Object.keys(DIST) as RaceType[]).filter(t => times[t]?.trim() && !parsed.some(p => p.t === t));
  const [err, setErr] = useState<ReturnType<typeof validateNewAthlete>>({});
  const set = <K extends keyof NewAthlete>(k: K, v: NewAthlete[K]) => { setO(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: undefined })); };
  const age = parseInt(o.age, 10);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const { acts, errs } = await readFiles(Array.from(files));
    setImp(acts.length ? { ...attrsFromActs(acts), errs } : { a: PROFILES.regular.a, ctl: 0, fatigue: 0, n: 0, sports: { run: 0, other: 0 }, errs: errs.length ? errs : ['Nenhuma corrida encontrada.'] });
    setErr(e => ({ ...e, files: undefined }));
  }

  function create() {
    const full = { ...o, times: parsed };
    const e = validateNewAthlete(full, imp);
    if (o.start === 'tempo' && badTimes.length) e.times = `Tempo que não percebemos: ${badTimes.map(t => DIST[t].l).join(', ')}. Escreve como 24:30 ou 1:52:10.`;
    setErr(e);
    if (Object.keys(e).length) return;
    onCreate(createAthlete(full, imp));
    window.scrollTo(0, 0);
  }

  const startOpt = (k: StartKind, title: string, sub: string, ic: IconName) => (
    <button className={`opt${o.start === k ? ' acc' : ''}`} aria-pressed={o.start === k} onClick={() => set('start', k)}>
      <span className="tile sp-acc"><Icon name={ic} /></span>
      <span><b>{title}</b><span className="small muted">{sub}</span></span>
      <span className="opt-check"><Icon name="check" /></span>
    </button>
  );

  return (
    <>
      <div className="brand">
        <Logo />
        <div className="stack"><h1>Transição</h1><span className="small muted">A carreira de corredor em que o atleta és tu: um treino por dia, ao ritmo do calendário.</span></div>
      </div>
      <div className="card">
      <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
        <Avatar name={o.name || '?'} size={56} />
        <div className="stack"><Title icon="user">O teu atleta</Title><span className="small muted">A arte do atleta chega mais tarde; para já, as tuas iniciais.</span></div>
      </div>
      <label className="f">Nome
        <input type="text" id="ob-name" value={o.name} placeholder="Filinto Meireles" autoComplete="off" onChange={e => set('name', e.target.value)} />
      </label>
      {err.name && <span className="err">{err.name}</span>}

      <div className="f"><span>Categoria</span>
        <Seg label="Categoria" value={o.cat} options={[['F', 'Feminino'], ['M', 'Masculino']]} onChange={v => set('cat', v)} />
      </div>

      <label className="f">Idade
        <input type="number" id="ob-age" inputMode="numeric" min={18} max={80} value={o.age} placeholder="38" onChange={e => set('age', e.target.value)} />
      </label>
      <span className="small muted">{age >= 18 && age <= 80 ? <span className="chip acc">escalão {ageGroup(age)}</span> : 'A idade define o teu escalão.'}</span>
      {err.age && <span className="err">{err.age}</span>}

      <label className="f">Cidade
        <input type="text" id="ob-city" value={o.city} placeholder="Paços de Ferreira" autoComplete="off" onChange={e => set('city', e.target.value)} />
      </label>

      <label className="f">Run club
        <select id="ob-club" value={o.club} onChange={e => set('club', e.target.value)}>
          {CLUBS.map(c => <option key={c.id} value={c.id}>{c.n} · {c.members} membros</option>)}
        </select>
      </label>
      </div>

      <Title icon="flag">Ponto de partida</Title>
      <span className="small muted">O teu atleta parte do teu tempo real. Quanto mais certo, mais justo o jogo: a assiduidade leva-o até {BAL.verCap * 100}% à frente desse tempo; para ir além, só correndo.</span>
      {startOpt('files', 'Importar corridas reais', 'Ficheiros FIT, GPX ou TCX. A tua corrida mais rápida dá o tempo verificado.', 'upload')}
      {o.start === 'files' && (
        <div className="card">
          <div className="row">
            <span className="btn sm file"><Icon name="upload" size={15} />Escolher ficheiros
              <input type="file" id="ob-files" multiple accept=".fit,.gpx,.tcx" aria-label="Escolher ficheiros FIT, GPX ou TCX" onChange={e => onFiles(e.target.files)} />
            </span>
            <button className="btn sm" onClick={() => { setImp({ ...attrsFromActs(sampleActs()), sample: true }); setErr(e => ({ ...e, files: undefined })); }}>Usar treinos de exemplo</button>
          </div>
          {imp && imp.n > 0 ? (
            <>
              {imp.best && <div className="small">Tempo verificado: <b className="mono">{DIST[imp.best.t].l} em {fmt(imp.best.sec)}</b> (a tua melhor corrida, convertida na distância de prova mais próxima).</div>}
              <div className="small">{imp.sample ? 'Exemplo: ' : ''}{imp.n} treinos lidos ({imp.sports.run} corridas, {imp.sports.other} outros). Nota geral prevista: <b>{overall(imp.a)}</b>.</div>
              <div className="small muted">5 km previsto {fmt(predict(imp.a, '5k'))} · 10 km {fmt(predict(imp.a, '10k'))} · meia {fmt(predict(imp.a, 'meia'))}</div>
            </>
          ) : (
            <div className="small muted">Exporta as últimas semanas do teu relógio ou da tua app. Quanto mais treinos, melhor a calibração.</div>
          )}
          {imp?.errs?.length ? <div className="err">{imp.errs.join('; ')}</div> : null}
          {err.files && <span className="err">{err.files}</span>}
        </div>
      )}
      {startOpt('tempo', 'Escrever os meus tempos', 'Um tempo recente feito a fundo: 5 km, 10 km, meia ou maratona.', 'timer')}
      {o.start === 'tempo' && (
        <div className="card">
          <div className="times">
            {(Object.keys(DIST) as RaceType[]).map(t => (
              <label key={t} className="f">{DIST[t].l}
                <input type="text" inputMode="numeric" placeholder={t === '5k' ? '24:30' : t === '10k' ? '51:00' : t === 'meia' ? '1:55:00' : '4:05:00'}
                  value={times[t] ?? ''} aria-invalid={badTimes.includes(t)} onChange={e => { setTimes(p => ({ ...p, [t]: e.target.value })); setErr(x => ({ ...x, times: undefined })); }} />
              </label>
            ))}
          </div>
          {parsed.length > 0 && (() => { const a = calibrate(PROFILES.regular.a, parsed); return (
            <div className="small muted">O teu atleta: 5 km {fmt(predict(a, '5k'))} · 10 km {fmt(predict(a, '10k'))} · meia {fmt(predict(a, 'meia'))} · maratona {fmt(predict(a, 'maratona'))}</div>
          ); })()}
          <span className="small muted">Basta um. Com dois (um curto e um longo), o jogo percebe se és mais rápido ou mais de fundo. Um tempo escrito vale como verificado, mas o jogo vai pedir-te um teste real para o confirmar.</span>
          {err.times && <span className="err">{err.times}</span>}
        </div>
      )}
      {startOpt('preset', 'Perfil pronto', 'Sem tempo real: o atleta fica por verificar até fazeres um teste.', 'user')}
      {o.start === 'preset' && (
        <select id="ob-preset" aria-label="Perfil pronto" value={o.preset} onChange={e => set('preset', e.target.value as ProfileKey)}>
          {(Object.entries(PROFILES) as [ProfileKey, { n: string; d: string }][]).map(([k, p]) => <option key={k} value={k}>{p.n} · {p.d}</option>)}
        </select>
      )}
      {startOpt('filinto', 'Exemplo: dados do Filinto', 'Calibrado com os recordes reais de 2026: 5 km em 19:11, maratona em 3:33', 'star')}

      <div className="cta" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}><button className="btn primary" onClick={create}>Criar atleta<Icon name="chevron" /></button></div>
    </>
  );
}
