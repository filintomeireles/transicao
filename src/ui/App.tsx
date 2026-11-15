import { useState } from 'react';
import { BAL, dayNumber, processWeek, takeWeek, weeksAvailable } from '../engine';

import { StatusBar, Tabs, type Tab } from './components';
import { useGame } from './useGame';
import { AthleteScreen } from './screens/Athlete';
import { CareerScreen } from './screens/Career';
import { ClubScreen } from './screens/Club';
import { Onboarding } from './screens/Onboarding';
import { RaceScreen } from './screens/Race';
import { ShopScreen } from './screens/Shop';
import { WeekScreen } from './screens/Week';

// ?ritmo=livre desliga o limite de semanas por dia (testes internos).
const FREE_PACE = new URLSearchParams(location.search).get('ritmo') === 'livre';

export function App() {
  const { game, apply, start, reset } = useGame();
  const [tab, setTabState] = useState<Tab>(() => (import.meta.env.DEV && (new URLSearchParams(location.search).get('tab') as Tab)) || 'semana');
  const [flash, setFlash] = useState('');

  const setTab = (t: Tab) => { setTabState(t); setFlash(''); window.scrollTo(0, 0); };

  if (!game) return <main className="wrap fade"><Onboarding onCreate={s => { start(s); setTabState('semana'); }} /></main>;

  const inRaceSetup = !!game.race && game.race.stage !== 'done'; // antes e durante a prova não há separadores
  const closeWeek = () => {
    const ok = apply(s => {
      if (!FREE_PACE && !takeWeek(s, dayNumber())) return false;
      processWeek(s);
      return true;
    });
    setFlash(ok ? '' : `Já jogaste as semanas de hoje. Amanhã tens mais ${BAL.pacePerDay} (guardam-se até ${BAL.paceCap}).`);
    setTabState('semana');
    window.scrollTo(0, 0);
  };
  const weeksLeft = FREE_PACE ? null : weeksAvailable(game, dayNumber());

  let screen;
  if (tab === 'semana' || inRaceSetup) {
    screen = game.race
      ? <RaceScreen game={game} apply={apply} onDone={() => window.scrollTo(0, 0)} />
      : <WeekScreen game={game} apply={apply} flash={flash} setFlash={setFlash} onClose={closeWeek} weeksLeft={weeksLeft} />;
  } else if (tab === 'atleta') screen = <AthleteScreen game={game} apply={apply} onReset={reset} />;
  else if (tab === 'clube') screen = <ClubScreen game={game} flash={flash} setFlash={setFlash} />;
  else if (tab === 'loja') screen = <ShopScreen game={game} apply={apply} flash={flash} setFlash={setFlash} />;
  else screen = <CareerScreen game={game} apply={apply} />;

  return (
    <>
      <StatusBar game={game} />
      <main className="wrap fade" key={`${tab}-${game.race?.stage ?? ""}`}>{screen}</main>
      {!inRaceSetup && (
        <Tabs tab={tab} onTab={setTab} unread={game.inbox.filter(m => !m.done).length} />
      )}
    </>
  );
}
