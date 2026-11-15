// Só em desenvolvimento: ?demo=N cria uma carreira com N semanas jogadas, para ver os ecrãs com dados.
// ?prova=resultado corre a prova da semana; ?tab=atleta abre esse separador; ?tema=escuro força o tema.
import { createAthlete, finishRace, processWeek, runRace, setSeed, type GameState } from '../engine';

export function demoGame(params: URLSearchParams): GameState | null {
  const n = Number(params.get('demo'));
  if (!Number.isFinite(n) || n < 0) return null;
  setSeed(11);
  const s = createAthlete({ name: 'Filinto Meireles', cat: 'M', age: '38', city: 'Paços de Ferreira', club: 'pacos', start: 'filinto', preset: 'runner' }, null);
  for (let i = 0; i < n; i++) {
    processWeek(s);
    if (s.race && i < n - 1) { runRace(s); finishRace(s); }
  }
  if (s.race && params.get('prova') === 'resultado') runRace(s);
  return s;
}
