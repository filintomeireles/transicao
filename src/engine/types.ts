export type Cat = 'F' | 'M';
export type Sport = 'swim' | 'bike' | 'run' | 'gen';
export type AttrKey = 'swimTec' | 'swimEnd' | 'bikePow' | 'bikeEnd' | 'runSpd' | 'runEnd' | 'trans' | 'str' | 'mental';
export type Attrs = Record<AttrKey, number>;
export type SessionKey = 'rest' | 'swimTec' | 'swimEnd' | 'bikeZ2' | 'bikeInt' | 'runZ2' | 'runInt' | 'brick' | 'str';
export type RaceType = 'sprint' | 'olimp' | 'meia' | 'longa';
export type Course = 'plano' | 'ondulado' | 'montanhoso';
export type RivalStyle = 'provocador' | 'cavalheiro' | 'calculista';
/** Tempo no dia da prova: temperatura do ar (°C), vento (km/h), chuva. */
export interface Weather { air: number; wind: number; rain: boolean }
export type RaceTier = 'regional' | 'nacional' | 'internacional' | 'pro' | 'mundial';
export type StartKind = 'files' | 'preset' | 'filinto';
export type ProfileKey = 'runner' | 'cyclist' | 'swimmer';

export interface Session {
  n: string;
  sp: Sport;
  load: number;
  cost: number;
  min: number;
  km?: number;
  g: Partial<Attrs>;
}

/** Uma atividade real lida de um ficheiro ou de uma app de treino. */
export interface Activity {
  sport: 'run' | 'bike' | 'swim' | 'str' | 'other';
  start: number | null;
  sec: number;
  km: number;
  hr: number | null;
}

/** Uma atividade real já convertida numa sessão do jogo, num dia da semana. */
export interface RealSession {
  k: SessionKey;
  key: string;
  ratio: number;
  min: number;
  km: number;
  sport: Activity['sport'];
  hr: number | null;
  /** Marcada pelo jogador como prova real. */
  race?: boolean;
}

export interface InboxMsg {
  k: 'msg' | 'ev' | 'offer';
  t: string;
  x: string;
  id?: string;
  done?: boolean;
  res?: string;
}

export interface SponsorDef {
  id: string;
  n: string;
  minFame: number;
  weekly: number;
  weeks: number;
  podium: number;
  d: string;
  req?: number;
  disc?: number;
}
export interface ActiveSponsor extends SponsorDef { left: number }

export interface ShopItem {
  id: string;
  cat: string;
  n: string;
  p: number;
  d: string;
  sub?: boolean;
  once?: boolean;
}

export interface ClubDef {
  id: string;
  n: string;
  members: number;
  ev: { d: number; t: string; where: string; sp: 'run' | 'bike' };
}
export interface ClubMember { nm: string; cat: Cat; age: number; r: number; pts: number; active: boolean; events?: number }
export interface ClubState {
  id: string;
  members: ClubMember[];
  div: number;
  score: number;
  season: number;
  part: number;
  myPts: number | null;
  clubPart: boolean;
  others: { n: string; base: number; score: number; season: number }[];
}

export interface RaceDef {
  id: string;
  w: number;
  n: string;
  t: RaceType;
  temp: number;
  fee: number;
  travel: number;
  lvl: number;
  nM: number;
  nF: number;
  tier: RaceTier;
  /** Percurso da bike e da corrida. */
  course: Course;
  /** Temperatura do ar e vento típicos (o tempo do dia varia à volta disto). */
  air: number;
  windy: number;
  /** Inscrita por defeito no início de cada temporada. */
  core?: boolean;
  /** Vagas por escalão (top `slot`) para a prova `slotTo`. */
  slot?: number;
  slotTo?: string;
  minPts?: number;
  /** Prova por convite: só com esta fama. */
  minFame?: number;
  needSlot?: boolean;
  altPts?: number;
  /** Multiplicador de prémios (circuito profissional, mundial). */
  prizeMult?: number;
}

export interface RaceChoices {
  pos: 'frente' | 'lado' | 'tras';
  int: number;
  gels: number;
  strat: 'conservador' | 'constante' | 'negativo' | 'agressivo';
}

export interface ResultRow { pos: number; nm: string; tag: string; ag: string; total: number; me: boolean }

/** Tempos acumulados de um atleta à saída de cada segmento: natação, T1, bike, T2, meta (segundos). */
export interface TraceRow { nm: string; tag: string; me: boolean; cum: [number, number, number, number, number] }

/** Uma linha do relato, no segundo de prova em que acontece. */
export interface TimedLine { at: number; sp: Sport; text: string }

export interface RaceResult {
  timeline: TimedLine[];
  trace: TraceRow[];
  p: number;
  N: number;
  agP: number;
  agN: number;
  ag: string;
  catL: string;
  o: string;
  me: { swim: number; t1: number; bike: number; t2: number; run: number; total: number };
  lists: { geral: ResultRow[]; escalao: ResultRow[]; clube: ResultRow[] };
  prize: number;
  bonus: number;
  fame: number;
  pts: number;
  slot: string;
  legend: string;
  beatRival: boolean;
  rivalNm: string;
}

/** Um atleta numa prova a decorrer: tempos por segmento (segundos). */
export interface LiveEntrant {
  nm: string;
  age: number;
  ag: string;
  tag: '' | 'rival' | 'clube' | 'tu';
  club: string;
  swim: number;
  t1: number;
  bike: number;
  t2: number;
  run: number;
  ev: [Sport, string][];
  me?: boolean;
}

/** Prova a decorrer: o pelotão já está simulado, mas o jogador ainda mexe nas transições e no sprint final. */
export interface LiveRace {
  field: LiveEntrant[];
  baseT1: number;
  baseT2: number;
  t1Score: number | null;
  t2Score: number | null;
  sprint: { nm: string; won: boolean } | null;
  sprintDone: boolean;
}

export interface RaceState extends RaceDef {
  stage: 'setup' | 'live' | 'done';
  ch: RaceChoices;
  weather?: Weather;
  live?: LiveRace;
  res?: RaceResult;
}

export interface ResultRecord {
  week: number;
  season: number;
  id: string;
  n: string;
  t: RaceType;
  p: number;
  N: number;
  agP: number;
  agN: number;
  ag: string;
  total: number;
}

export interface WeekSummary { week: number; load: number; gains: Partial<Attrs>; rep: string[]; fin: number; bonuses?: string[] }

export interface Challenge { me: number; fr: { nm: string; h: number }[]; won: boolean }

export interface GameState {
  v: 3;
  ath: { name: string; cat: Cat; age: number; city: string; club: string; start: StartKind };
  week: number;
  money: number;
  fame: number;
  pts: number;
  job: boolean;
  a: Attrs;
  fatigue: number;
  moral: number;
  ctl: number;
  atl: number;
  injury: number;
  injuryName: string;
  plan: SessionKey[];
  real: RealSession[][];
  rain: boolean;
  owned: Record<string, boolean>;
  subs: Record<string, boolean>;
  shoeKm: number;
  shoeWarned: boolean;
  gear: [string, string][];
  sponsors: ActiveSponsor[];
  offered: Record<string, boolean>;
  renew: Record<string, number>;
  rival: {
    nm: string; age: number; r: number; beaten: number; lost: number;
    style?: RivalStyle;
    /** Resultados seguidos contra ti: positivo = vitórias tuas, negativo = dele. */
    run?: number;
    /** Semanas de fora por lesão. */
    out?: number;
  };
  /** Histórico semanal para os gráficos do atleta (últimas 60 semanas). */
  hist?: { w: number; ovr: number; form: number; fat: number }[];
  /** Rivais antigos. */
  rivals?: { nm: string; beaten: number; lost: number; until: number }[];
  /** Estágio em curso. */
  camp?: { id: string; left: number };
  /** Semana (absoluta) até à qual tens aclimatação ao calor. */
  heatUntil?: number;
  /** Semana (absoluta) até à qual dura o efeito da altitude. */
  altitudeUntil?: number;
  club: ClubState;
  legends: Record<string, { nm: string; count: number }>;
  raceCount: Record<string, number>;
  slots: Record<string, boolean>;
  chal: Challenge | null;
  invite: string;
  inbox: InboxMsg[];
  results: ResultRecord[];
  race: RaceState | null;
  last: WeekSummary | null;
  /** Passos do guia da primeira semana já vistos. */
  guide?: string[];
  /** Pedidos de opinião já mostrados (por momento do jogo). */
  asked?: string[];
  /** Provas em que estás inscrito nesta temporada (ids). */
  entries?: string[];
  /** Títulos da carreira (palmarés). */
  titles?: string[];
  /** Semanas que ainda podes jogar hoje e o dia em que a reserva foi atualizada. */
  bank?: number;
  bankDay?: number;
  /** Semanas seguidas com pelo menos 3 treinos reais. */
  realStreak?: number;
  /** Melhor série de semanas com treino real. */
  realBest?: number;
  /** Treinos reais importados desde o início. */
  realTotal?: number;
  /** Eventos do clube em que participaste. */
  clubEvents?: number;
  /** Kits do clube ganhos (subidas de divisão). */
  clubKit?: number;
}
