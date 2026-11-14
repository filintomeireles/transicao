import { useState } from 'react';
import {
  CLUBS, PROFILES, ageGroup, attrsFromActs, createAthlete, overall, readFiles, sampleActs, validateNewAthlete,
  type GameState, type ImportSummary, type NewAthlete, type ProfileKey, type StartKind
} from '../../engine';
import { Seg } from '../components';

export function Onboarding({ onCreate }: { onCreate: (s: GameState) => void }) {
  const [o, setO] = useState<NewAthlete>({ name: '', cat: 'F', age: '', city: '', club: 'pacos', start: 'preset', preset: 'runner' });
  const [imp, setImp] = useState<ImportSummary | null>(null);
  const [err, setErr] = useState<ReturnType<typeof validateNewAthlete>>({});
  const set = <K extends keyof NewAthlete>(k: K, v: NewAthlete[K]) => { setO(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: undefined })); };
  const age = parseInt(o.age, 10);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const { acts, errs } = await readFiles(Array.from(files));
    setImp(acts.length ? { ...attrsFromActs(acts), errs } : { a: PROFILES.runner.a, ctl: 0, fatigue: 0, n: 0, sports: { run: 0, bike: 0, swim: 0 }, errs: errs.length ? errs : ['Nenhuma corrida, bike ou natação encontrada.'] });
    setErr(e => ({ ...e, files: undefined }));
  }

  function create() {
    const e = validateNewAthlete(o, imp);
    setErr(e);
    if (Object.keys(e).length) return;
    onCreate(createAthlete(o, imp));
    window.scrollTo(0, 0);
  }

  const startOpt = (k: StartKind, title: string, sub: string) => (
    <button className={`opt${o.start === k ? ' acc' : ''}`} aria-pressed={o.start === k} onClick={() => set('start', k)}>
      <b>{title}</b><span className="small">{sub}</span>
    </button>
  );

  return (
    <>
      <h1>Criar atleta</h1>
      <label className="f">Nome
        <input type="text" id="ob-name" value={o.name} placeholder="Filinto Meireles" autoComplete="off" onChange={e => set('name', e.target.value)} />
      </label>
      {err.name && <span className="err">{err.name}</span>}

      <div className="f"><span>Categoria</span>
        <Seg value={o.cat} options={[['F', 'Feminino'], ['M', 'Masculino']]} onChange={v => set('cat', v)} />
      </div>

      <label className="f">Idade
        <input type="number" id="ob-age" inputMode="numeric" min={18} max={80} value={o.age} placeholder="38" onChange={e => set('age', e.target.value)} />
      </label>
      <span className="small muted">{age >= 18 && age <= 80 ? `Escalão ${ageGroup(age)}` : 'A idade define o teu escalão.'}</span>
      {err.age && <span className="err">{err.age}</span>}

      <label className="f">Cidade
        <input type="text" id="ob-city" value={o.city} placeholder="Paços de Ferreira" autoComplete="off" onChange={e => set('city', e.target.value)} />
      </label>

      <label className="f">Run club
        <select id="ob-club" value={o.club} onChange={e => set('club', e.target.value)}>
          {CLUBS.map(c => <option key={c.id} value={c.id}>{c.n} · {c.members} membros</option>)}
        </select>
      </label>

      <span className="small muted">Ponto de partida</span>
      {startOpt('files', 'Importar dados reais', 'Ficheiros FIT, GPX ou TCX de qualquer relógio ou app. Strava e outras apps chegam depois.')}
      {o.start === 'files' && (
        <div className="card">
          <div className="row">
            <span className="btn sm file">Escolher ficheiros
              <input type="file" id="ob-files" multiple accept=".fit,.gpx,.tcx" aria-label="Escolher ficheiros FIT, GPX ou TCX" onChange={e => onFiles(e.target.files)} />
            </span>
            <button className="btn sm" onClick={() => { setImp({ ...attrsFromActs(sampleActs()), sample: true }); setErr(e => ({ ...e, files: undefined })); }}>Usar treinos de exemplo</button>
          </div>
          {imp && imp.n > 0 ? (
            <>
              <div className="small">{imp.sample ? 'Exemplo: ' : ''}{imp.n} treinos lidos ({imp.sports.run} corridas, {imp.sports.bike} bikes, {imp.sports.swim} natações). Nota geral prevista: <b>{overall(imp.a)}</b>.</div>
              <div className="small muted">Natação {imp.a.swimTec}/{imp.a.swimEnd} · Bike {imp.a.bikePow}/{imp.a.bikeEnd} · Corrida {imp.a.runSpd}/{imp.a.runEnd}</div>
            </>
          ) : (
            <div className="small muted">Exporta as últimas semanas do teu relógio ou da tua app. Quanto mais treinos, melhor a calibração.</div>
          )}
          {imp?.errs?.length ? <div className="err">{imp.errs.join('; ')}</div> : null}
          {err.files && <span className="err">{err.files}</span>}
        </div>
      )}
      {startOpt('preset', 'Perfil pronto', 'Corredor, ciclista ou ex-nadador')}
      {o.start === 'preset' && (
        <select id="ob-preset" aria-label="Perfil pronto" value={o.preset} onChange={e => set('preset', e.target.value as ProfileKey)}>
          {(Object.entries(PROFILES) as [ProfileKey, { n: string }][]).map(([k, p]) => <option key={k} value={k}>{p.n}</option>)}
        </select>
      )}
      {startOpt('filinto', 'Exemplo: dados do Filinto', 'Atleta calibrado com 3 meses de Strava (ago–nov 2026)')}

      <button className="btn primary" onClick={create}>Criar atleta</button>
    </>
  );
}
