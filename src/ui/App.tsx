import { useState } from 'react';
import { skipDay } from '../engine';

import { StatusBar, Tabs, type Tab } from './components';
import { useGame } from './useGame';
import { AthleteScreen } from './screens/Athlete';
import { CareerScreen } from './screens/Career';
import { ClubScreen } from './screens/Club';
import { Onboarding } from './screens/Onboarding';
import { RaceScreen } from './screens/Race';
import { ShopScreen } from './screens/Shop';
import { TodayScreen } from './screens/Today';

// ?ritmo=livre deixa avançar os dias à mão (testes internos). Num jogo normal, um dia de jogo é um dia real.
const FREE_PACE = new URLSearchParams(location.search).get('ritmo') === 'livre';

export function App() {
  const { game, apply, start, reset } = useGame();
  const [tab, setTabState] = useState<Tab>(() => (import.meta.env.DEV && (new URLSearchParams(location.search).get('tab') as Tab)) || 'semana');
  const [flash, setFlash] = useState('');

  const setTab = (t: Tab) => { setTabState(t); setFlash(''); window.scrollTo(0, 0); };

  if (!game) return <main className="wrap fade"><Onboarding onCreate={s => { start(s); setTabState('semana'); }} /></main>;

  const racing = !!game.race; // durante a prova não há separadores
  const nextDay = () => { apply(skipDay); setFlash(''); window.scrollTo(0, 0); };

  let screen;
  if (tab === 'semana' || racing) {
    screen = game.race
      ? <RaceScreen game={game} apply={apply} onDone={() => window.scrollTo(0, 0)} />
      : <TodayScreen game={game} apply={apply} flash={flash} setFlash={setFlash} free={FREE_PACE} onNextDay={nextDay} />;
  } else if (tab === 'atleta') screen = <AthleteScreen game={game} apply={apply} onReset={reset} />;
  else if (tab === 'clube') screen = <ClubScreen game={game} flash={flash} setFlash={setFlash} />;
  else if (tab === 'loja') screen = <ShopScreen game={game} apply={apply} flash={flash} setFlash={setFlash} />;
  else screen = <CareerScreen game={game} apply={apply} />;

  return (
    <>
      <StatusBar game={game} />
      <main className="wrap fade" key={`${tab}-${game.race?.stage ?? ''}-${game.done}`}>{screen}</main>
      {!racing && (
        <Tabs tab={tab} onTab={setTab} unread={game.inbox.filter(m => !m.done).length} />
      )}
    </>
  );
}
