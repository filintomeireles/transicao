export type Cat = 'F' | 'M';
export type Sport = 'swim' | 'bike' | 'run' | 'gen';
export type AttrKey = 'swimTec' | 'swimEnd' | 'bikePow' | 'bikeEnd' | 'runSpd' | 'runEnd' | 'trans' | 'str' | 'mental';
export type Attrs = Record<AttrKey, number>;
export type SessionKey = 'rest' | 'swimTec' | 'swimEnd' | 'bikeZ2' | 'bikeInt' | 'runZ2' | 'runInt' | 'brick' | 'str';
export type RaceType = 'sprint' | 'olimp' | 'meia';
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
export interface ClubMember { nm: string; cat: Cat; age: number; r: number; pts: number; active: boolean }
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
  slot?: number;
  minPts?: number;
  needSlot?: boolean;
  altPts?: number;
}

export interface RaceChoices {
  pos: 'frente' | 'lado' | 'tras';
  int: number;
  gels: number;
  strat: 'conservador' | 'constante' | 'negativo' | 'agressivo';
}

export interface ResultRow { pos: number; nm: string; tag: string; ag: string; total: number; me: boolean }

export interface RaceResult {
  feed: [Sport, string][];
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

export interface RaceState extends RaceDef {
  stage: 'setup' | 'done';
  ch: RaceChoices;
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

export interface WeekSummary { week: number; load: number; gains: Partial<Attrs>; rep: string[]; fin: number }

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
  rival: { nm: string; age: number; r: number; beaten: number; lost: number };
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
}
