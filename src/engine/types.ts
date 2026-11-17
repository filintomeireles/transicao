export type Cat = 'F' | 'M';
/** Família de uma sessão, para cores e ícones: rodagens, treino longo, treino de qualidade, geral. */
export type Fam = 'easy' | 'long' | 'fast' | 'gen';
export type AttrKey = 'spd' | 'thr' | 'end' | 'str' | 'men';
export type Attrs = Record<AttrKey, number>;
export type SessionKey = 'rest' | 'easy' | 'long' | 'tempo' | 'int' | 'hills' | 'str' | 'cross';
export type RaceType = '5k' | '10k' | 'meia' | 'maratona';
export type Course = 'plano' | 'ondulado' | 'montanhoso';
export type RivalStyle = 'provocador' | 'cavalheiro' | 'calculista';
/** Tempo no dia da prova: temperatura do ar (°C), vento (km/h), chuva. */
export interface Weather { air: number; wind: number; rain: boolean }
export type RaceTier = 'clube' | 'regional' | 'nacional' | 'internacional' | 'pro' | 'mundial';
export type StartKind = 'files' | 'tempo' | 'preset' | 'filinto';
/** De onde vem o tempo verificado. 'perfil' quer dizer que ainda não há nenhum tempo real. */
export type VerSrc = 'perfil' | 'declarado' | 'ficheiro' | 'teste' | 'treino' | 'strava';
/** Um tempo real numa distância: é com ele que o atleta do jogo se compara. */
export interface Verified { t: RaceType; sec: number; d: number; src: VerSrc }
export type ProfileKey = 'beginner' | 'regular' | 'fast';
/** Como foi feito o treino de um dia. */
export type How = 'real' | 'manual' | 'sim' | 'auto' | 'rest' | 'race' | 'miss';
export type Effort = 'leve' | 'plano' | 'forte';
/** Esforço num segmento de prova. */
export type Pace = 'poupar' | 'ritmo' | 'atacar' | 'seguir';

export interface Session {
  n: string;
  fam: Fam;
  load: number;
  min: number;
  km: number;
  /** Sessão de corrida: desgasta sapatilhas, tem risco de lesão e não se faz lesionado. */
  run: boolean;
  d: string;
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

export interface Talent { id: string; n: string; d: string }

export interface ClubDef {
  id: string;
  n: string;
  members: number;
  /** Treino semanal do clube: dia da semana (0 = segunda). */
  ev: { d: number; t: string; where: string };
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
  others: { n: string; base: number; score: number; season: number }[];
}

export interface RaceDef {
  id: string;
  /** Semana da temporada (1 a 12); a prova é ao domingo. */
  w: number;
  n: string;
  t: RaceType;
  fee: number;
  travel: number;
  lvl: number;
  nM: number;
  nF: number;
  tier: RaceTier;
  course: Course;
  /** Temperatura do ar e vento típicos (o tempo do dia varia à volta disto). */
  air: number;
  windy: number;
  /** Inscrita por defeito no início de cada temporada. */
  core?: boolean;
  /** Vagas por escalão (top "slot") para a prova "slotTo". */
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

export interface ResultRow { pos: number; nm: string; tag: string; ag: string; total: number; me: boolean }

/** Um atleta numa prova: tempo acumulado (segundos) no fim de cada segmento. */
export interface Entrant {
  nm: string;
  age: number;
  ag: string;
  tag: '' | 'rival' | 'clube' | 'tu';
  club: string;
  cum: number[];
}

/** O que aconteceu num segmento já corrido. */
export interface SegLog { pace: Pace; t: number; energy: number; pos: number }
export interface RaceLine { seg: number; fam: Fam; text: string }

/** Uma escolha de esforço para o próximo segmento, com a previsão. */
export interface PaceOption { pace: Pace; label: string; perKm: number; cost: number; hint: string }

/** Prova a decorrer: o jogador decide o esforço segmento a segmento e gere a energia. */
export interface LiveRace {
  field: Entrant[];
  /** Próximo segmento a correr (0 a n). */
  seg: number;
  energy: number;
  cum: number[];
  log: SegLog[];
  lines: RaceLine[];
  gelsLeft: number;
  /** Inclinação de cada segmento: −2 (desce muito) a +2 (sobe muito). */
  grade: number[];
  /** Segmentos com vento de frente. */
  head: boolean[];
  /** Ritmo de referência (s/km) em plano, sem vento, ao esforço "ritmo". */
  ref: number;
  /** Energia que um segmento custa ao esforço "ritmo", em plano. */
  cost: number;
  wall: boolean;
  sprint: { nm: string; won: boolean } | null;
  sprintDone: boolean;
}

export interface RaceState extends RaceDef {
  stage: 'setup' | 'live' | 'done';
  gels: number;
  weather: Weather;
  live?: LiveRace;
  res?: RaceResult;
}

export interface RaceResult {
  p: number;
  N: number;
  agP: number;
  agN: number;
  ag: string;
  catL: string;
  o: string;
  total: number;
  /** Tempo de cada segmento, esforço escolhido e energia no fim dele. */
  segs: { t: number; km: number; pace: Pace; energy: number }[];
  lines: RaceLine[];
  lists: { geral: ResultRow[]; escalao: ResultRow[]; clube: ResultRow[] };
  prize: number;
  bonus: number;
  fame: number;
  pts: number;
  xp: number;
  slot: string;
  legend: string;
  beatRival: boolean;
  rivalNm: string;
  /** Recorde pessoal na distância; prevPb é o anterior (se havia). */
  pb: boolean;
  prevPb?: number;
}

export interface ResultRecord {
  day: number;
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
  pb?: boolean;
}

/** Registo curto de um dia, para a faixa da semana. */
export interface DayLog { d: number; k: SessionKey | 'race'; how: How }

/** O que aconteceu no treino de hoje (ou no último dia jogado). */
export interface DaySummary {
  d: number;
  k: SessionKey | 'race';
  how: How;
  effort?: Effort;
  load: number;
  xp: number;
  gains: Partial<Attrs>;
  notes: string[];
  min: number;
  km: number;
  /** O teto travou os ganhos de corrida deste treino. */
  capped?: boolean;
}

export interface WeekSummary { week: number; season: number; load: number; fin: number; mine: number; goal: boolean; notes: string[] }

export interface Challenge { me: number; fr: { nm: string; h: number }[]; won: boolean }

export interface GameState {
  v: 4;
  ath: { name: string; cat: Cat; age: number; city: string; club: string; start: StartKind };
  /** Dia (número de dias desde 1970, hora local) em que a carreira começou. */
  born: number;
  /** Segunda-feira da primeira semana da carreira. */
  start: number;
  /** Dia do jogo: igual ao dia real (mais "skew" no modo de testes). */
  today: number;
  /** Dias avançados à mão no modo de testes. */
  skew?: number;
  /** O treino (ou a prova) de hoje já foi feito. */
  done: boolean;
  /** Carga de treino acumulada hoje (entra no fitness e na forma ao fim do dia). */
  tl: number;
  /** Como te sentes hoje: −1 pesado, 0 normal, 1 ótimo. */
  feel: -1 | 0 | 1;
  rain: boolean;
  money: number;
  fame: number;
  pts: number;
  job: boolean;
  a: Attrs;
  fatigue: number;
  moral: number;
  ctl: number;
  atl: number;
  /** Dias de lesão que faltam. */
  injury: number;
  injuryName: string;
  /** Modelo da semana: uma sessão por dia, de segunda a domingo. */
  plan: SessionKey[];
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
  rivals?: { nm: string; beaten: number; lost: number; until: number }[];
  /** Histórico diário para os gráficos (últimos 120 dias). */
  hist: { d: number; ovr: number; form: number; fat: number }[];
  /** Estágio em curso: dias que faltam. */
  camp?: { id: string; left: number };
  /** Dia até ao qual tens aclimatação ao calor / efeito da altitude. */
  heatUntil?: number;
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
  /** Resumo do treino de hoje (ou do último dia jogado). */
  last: DaySummary | null;
  lastWeek: WeekSummary | null;
  /** Os últimos 60 dias. */
  days: DayLog[];
  /** Contas da semana em curso. */
  wk: { load: number; mine: number; real: number; club: boolean; z2: number };
  xp: number;
  talents: string[];
  /** Dias seguidos com o treino feito por ti (não em piloto automático). */
  streak: number;
  bestStreak: number;
  pb: Partial<Record<RaceType, number>>;
  /** Último tempo verificado (corrida real) e o primeiro, para medir a evolução real. */
  ver: Verified;
  verFirst: Verified;
  verLog: Verified[];
  /** Dia do último teste declarado (o bónus do teste só conta uma vez por mês). */
  lastTest?: number;
  /** Atividades reais já contadas (para não repetir). */
  realKeys: string[];
  realTotal: number;
  /** Semanas seguidas com 3 ou mais treinos reais. */
  realStreak: number;
  realBest: number;
  clubEvents: number;
  clubKit: number;
  /** Dia em que escolheste não correr a prova desse dia. */
  skipRace?: number;
  guide?: string[];
  asked?: string[];
  entries?: string[];
  titles?: string[];
}
