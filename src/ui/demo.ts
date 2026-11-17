// Só em desenvolvimento: ?demo=N cria uma carreira com N dias jogados, para ver os ecrãs com dados.
// &prova=1 deixa uma prova pronta a começar; &prova=resultado mostra um resultado; &tab=atleta abre esse separador.
import {
  CLUB_RACE, autoRace, createAthlete, dayNumber, doToday, enterRace, finishLiveRace, finishRace, raceOffer, setSeed, skipDay, startRace, type GameState
} from '../engine';

export function demoGame(params: URLSearchParams): GameState | null {
  const n = Number(params.get('demo'));
  if (!Number.isFinite(n) || n < 0) return null;
  setSeed(11);
  const today = dayNumber();
  const s = createAthlete({ name: 'Filinto Meireles', cat: 'M', age: '38', city: 'Paços de Ferreira', club: 'pacos', start: 'filinto', preset: 'regular' }, null, today - n);
  for (let i = 0; i < n; i++) {
    const r = raceOffer(s);
    if (r) { enterRace(s, r.id); autoRace(s); finishLiveRace(s); finishRace(s); }
    else doToday(s, i % 3 ? 'manual' : 'sim');
    skipDay(s);
    s.skew = 0;
  }
  const prova = params.get('prova');
  if (prova) {
    enterRace(s, raceOffer(s)?.id ?? CLUB_RACE.id);
    if (prova === 'live') { startRace(s); }
    if (prova === 'resultado') { autoRace(s); finishLiveRace(s); }
  }
  return s;
}
