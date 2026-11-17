import { useState } from 'react';
import {
  CLUBS, PROFILES, ageGroup, attrsFromActs, createAthlete, fmt, overall, predict, readFiles, sampleActs, validateNewAthlete,
  type GameState, type ImportSummary, type NewAthlete, type ProfileKey, type StartKind
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
  const [o, setO] = useState<NewAthlete>({ name: '', cat: 'F', age: '', city: '', club: 'pacos', start: 'preset', preset: 'regular' });
  const [imp, setImp] = useState<ImportSummary | null>(null);
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
    const e = validateNewAthlete(o, imp);
    setErr(e);
    if (Object.keys(e).length) return;
    onCreate(createAthlete(o, imp));
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
      {startOpt('files', 'Importar dados reais', 'Ficheiros FIT, GPX ou TCX de qualquer relógio ou app. Strava e outras apps chegam depois.', 'upload')}
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
      {startOpt('preset', 'Perfil pronto', 'Escolhe o teu nível de corredor', 'user')}
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
