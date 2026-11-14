import { useCallback, useState } from 'react';
import { processWeek } from '../engine';
import { StatusBar, Tabs, type Tab } from './components';
import { useGame } from './useGame';
import { AthleteScreen } from './screens/Athlete';
import { CareerScreen } from './screens/Career';
import { ClubScreen } from './screens/Club';
import { Onboarding } from './screens/Onboarding';
import { RaceScreen } from './screens/Race';
import { ShopScreen } from './screens/Shop';
import { WeekScreen } from './screens/Week';

export function App() {
  const { game, apply, start, reset } = useGame();
  const [tab, setTabState] = useState<Tab>('semana');
  const [flash, setFlash] = useState('');
  const [raceRunning, setRaceRunning] = useState(false);
  const onRunning = useCallback((r: boolean) => setRaceRunning(r), []);

  const setTab = (t: Tab) => { setTabState(t); setFlash(''); window.scrollTo(0, 0); };

  if (!game) return <main className="wrap"><Onboarding onCreate={s => { start(s); setTabState('semana'); }} /></main>;

  const inRaceSetup = game.race?.stage === 'setup';
  const closeWeek = () => { setFlash(''); apply(processWeek); setTabState('semana'); window.scrollTo(0, 0); };

  let screen;
  if (tab === 'semana' || inRaceSetup) {
    screen = game.race
      ? <RaceScreen game={game} apply={apply} onRunning={onRunning} onDone={() => window.scrollTo(0, 0)} />
      : <WeekScreen game={game} apply={apply} flash={flash} setFlash={setFlash} onClose={closeWeek} />;
  } else if (tab === 'atleta') screen = <AthleteScreen game={game} apply={apply} onReset={reset} />;
  else if (tab === 'clube') screen = <ClubScreen game={game} flash={flash} setFlash={setFlash} />;
  else if (tab === 'loja') screen = <ShopScreen game={game} apply={apply} flash={flash} setFlash={setFlash} />;
  else screen = <CareerScreen game={game} />;

  return (
    <>
      <StatusBar game={game} />
      <main className="wrap">{screen}</main>
      {!inRaceSetup && !raceRunning && (
        <Tabs tab={tab} onTab={setTab} unread={game.inbox.filter(m => !m.done).length} />
      )}
    </>
  );
}
