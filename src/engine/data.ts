import { random } from './rng';
import type {
  AttrKey, Attrs, Cat, ClubDef, Course, Fam, GameState, ProfileKey, RaceDef, RaceType, Session, SessionKey, ShopItem, SponsorDef, Talent
} from './types';

export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
export const DAY_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'] as const;

/** Atributos: nome, para que serve e a família de cor. */
export const ATTR: Record<AttrKey, [string, string, Fam]> = {
  spd: ['Velocidade', '5 km, ataques e sprint final', 'fast'],
  thr: ['Limiar', 'o ritmo forte que aguentas: 10 km e meia maratona', 'fast'],
  end: ['Resistência', 'energia para as provas longas', 'long'],
  str: ['Força', 'subidas e menos lesões', 'gen'],
  men: ['Mental', 'aguentar quando a energia acaba', 'gen']
};
export const ATTR_KEYS = Object.keys(ATTR) as AttrKey[];

export const SESS: Record<SessionKey, Session> = {
  rest: { n: 'Descanso', fam: 'gen', load: 0, min: 0, km: 0, run: false, d: 'A fadiga desce mais depressa.', g: {} },
  easy: { n: 'Rodagem leve', fam: 'easy', load: 40, min: 45, km: 8, run: true, d: 'Corrida confortável, a conversar.', g: { end: 0.8, thr: 0.3 } },
  long: { n: 'Longão', fam: 'long', load: 85, min: 100, km: 18, run: true, d: 'O treino longo da semana, devagar.', g: { end: 1.8, men: 0.5, thr: 0.2 } },
  tempo: { n: 'Ritmo de limiar', fam: 'fast', load: 65, min: 50, km: 10, run: true, d: '20 a 30 minutos a ritmo forte e controlado.', g: { thr: 1.6, end: 0.4 } },
  int: { n: 'Séries', fam: 'fast', load: 70, min: 50, km: 9, run: true, d: 'Repetições rápidas com recuperação: 6 × 800 m.', g: { spd: 1.6, thr: 0.5 } },
  hills: { n: 'Rampas', fam: 'fast', load: 65, min: 45, km: 7, run: true, d: 'Subidas curtas e fortes.', g: { str: 1.0, spd: 0.8, men: 0.3 } },
  str: { n: 'Força', fam: 'gen', load: 30, min: 40, km: 0, run: false, d: 'Ginásio ou exercícios em casa.', g: { str: 1.6 } },
  cross: { n: 'Treino cruzado', fam: 'easy', load: 35, min: 60, km: 0, run: false, d: 'Bike ou natação: treina sem impacto, mesmo lesionado.', g: { end: 0.5 } }
};
export const SESSION_KEYS = Object.keys(SESS) as SessionKey[];
/** Sessões duras: contam para os avisos do treinador. */
export const HARD: SessionKey[] = ['tempo', 'int', 'hills', 'long'];

export type PresetName = 'Iniciação' | 'Equilibrada' | 'Carga' | 'Taper';
export const PRESETS: Record<PresetName, SessionKey[]> = {
  'Iniciação': ['rest', 'easy', 'str', 'easy', 'rest', 'easy', 'long'],
  'Equilibrada': ['str', 'int', 'easy', 'tempo', 'rest', 'easy', 'long'],
  'Carga': ['easy', 'int', 'easy', 'tempo', 'hills', 'easy', 'long'],
  'Taper': ['easy', 'tempo', 'rest', 'easy', 'rest', 'easy', 'rest']
};

/** Distâncias: km, nome, segmentos em que a prova se joga e fator de ritmo face aos 5 km. */
export const DIST: Record<RaceType, { km: number; l: string; segs: number; f: number }> = {
  '5k': { km: 5, l: '5 km', segs: 5, f: 1 },
  '10k': { km: 10, l: '10 km', segs: 5, f: 1.04 },
  meia: { km: 21.1, l: 'Meia maratona', segs: 7, f: 1.085 },
  maratona: { km: 42.2, l: 'Maratona', segs: 8, f: 1.14 }
};
/** Géis recomendados por distância. */
export const GELS: Record<RaceType, number> = { '5k': 0, '10k': 0, meia: 3, maratona: 5 };
export const RACE_REWARD: Record<RaceType, { prize: number; fame: number; pts: number; fat: number; load: number; xp: number }> = {
  '5k': { prize: 1, fame: 1, pts: 1, fat: 10, load: 70, xp: 30 },
  '10k': { prize: 1.6, fame: 1.5, pts: 1.5, fat: 16, load: 100, xp: 45 },
  meia: { prize: 3, fame: 2.4, pts: 2.4, fat: 26, load: 150, xp: 70 },
  maratona: { prize: 5, fame: 3.5, pts: 3.5, fat: 42, load: 240, xp: 120 }
};

/**
 * Calendário de uma temporada: 12 semanas, uma prova por domingo a partir da semana 2.
 * Nomes de provas fictícios.
 */
export const CALENDAR: RaceDef[] = [
  { id: 'povoa', w: 2, n: '5 km da Póvoa', t: '5k', tier: 'regional', course: 'plano', air: 17, windy: 16, core: true, fee: 12, travel: 10, lvl: 44, nM: 60, nF: 34 },
  { id: 'viseu', w: 3, n: '10 km de Viseu', t: '10k', tier: 'regional', course: 'ondulado', air: 19, windy: 8, fee: 15, travel: 25, lvl: 46, nM: 56, nF: 30 },
  { id: 'viana', w: 4, n: '10 km de Viana', t: '10k', tier: 'regional', course: 'plano', air: 18, windy: 20, core: true, fee: 15, travel: 20, lvl: 48, nM: 70, nF: 38 },
  { id: 'aveiro', w: 5, n: '5 km de Aveiro', t: '5k', tier: 'regional', course: 'plano', air: 19, windy: 22, fee: 12, travel: 30, lvl: 49, nM: 60, nF: 34 },
  { id: 'coimbra', w: 6, n: 'Meia maratona de Coimbra', t: 'meia', tier: 'nacional', course: 'ondulado', air: 20, windy: 10, core: true, fee: 30, travel: 50, lvl: 52, nM: 80, nF: 44 },
  { id: 'lisboa', w: 7, n: '10 km de Lisboa', t: '10k', tier: 'nacional', course: 'plano', air: 21, windy: 15, core: true, fee: 20, travel: 110, lvl: 55, nM: 90, nF: 50, slot: 1, slotTo: 'algarve' },
  { id: 'vitoria', w: 8, n: 'Maratona de Vitória', t: 'maratona', tier: 'internacional', course: 'ondulado', air: 19, windy: 12, fee: 80, travel: 280, lvl: 60, nM: 80, nF: 40, slot: 1, slotTo: 'mundial' },
  { id: 'iberica', w: 9, n: 'Taça Ibérica · 10 km', t: '10k', tier: 'nacional', course: 'ondulado', air: 23, windy: 12, core: true, fee: 35, travel: 200, lvl: 61, nM: 60, nF: 36, minPts: 60, slot: 1, slotTo: 'algarve' },
  { id: 'atlantico', w: 10, n: 'Grande Prémio Atlântico (convite)', t: 'meia', tier: 'pro', course: 'ondulado', air: 21, windy: 24, fee: 0, travel: 150, lvl: 66, nM: 40, nF: 24, minFame: 60, prizeMult: 3 },
  { id: 'algarve', w: 11, n: 'Meia maratona do Algarve', t: 'meia', tier: 'nacional', course: 'montanhoso', air: 25, windy: 12, core: true, fee: 45, travel: 240, lvl: 59, nM: 70, nF: 38, needSlot: true, altPts: 200, slot: 1, slotTo: 'mundial' },
  { id: 'mundial', w: 12, n: 'Mundial de Maratona · Ilha das Brasas', t: 'maratona', tier: 'mundial', course: 'plano', air: 28, windy: 26, core: true, fee: 150, travel: 600, lvl: 72, nM: 90, nF: 56, needSlot: true, prizeMult: 4 }
];
export const COURSE_NAME: Record<Course, string> = { plano: 'plano', ondulado: 'ondulado', montanhoso: 'com muitas subidas' };
/** Os 5 km do clube: todos os sábados, sem inscrição, contra os membros do clube. */
export const CLUB_RACE: RaceDef = { id: 'clube5k', w: 0, n: '5 km do clube', t: '5k', tier: 'clube', course: 'plano', air: 17, windy: 10, fee: 0, travel: 0, lvl: 46, nM: 26, nF: 16 };

/** Estágios: pagos, em dias. Durante o estágio não contas para os treinos do clube. */
export interface CampDef { id: string; n: string; days: number; cost: number; d: string; mult: Partial<Record<AttrKey, number>> }
export const CAMPS: CampDef[] = [
  { id: 'altitude', n: 'Estágio em altitude · Serra', days: 14, cost: 900, d: '+25% nos ganhos de resistência e limiar e, nos 28 dias seguintes, mais 2% de rendimento em prova.', mult: { end: 1.25, thr: 1.25 } },
  { id: 'calor', n: 'Estágio de calor · Ilha do Sol', days: 7, cost: 600, d: 'Aclimatação: durante 42 dias o calor nas provas custa-te muito menos.', mult: { end: 1.1 } },
  { id: 'pista', n: 'Semana de pista', days: 7, cost: 450, d: '+60% nos ganhos de velocidade, com treinador na pista todos os dias.', mult: { spd: 1.6 } }
];

export const CORE_RACES = CALENDAR.filter(r => r.core).map(r => r.id);
export const raceById = (id: string): RaceDef | undefined => (id === CLUB_RACE.id ? CLUB_RACE : CALENDAR.find(r => r.id === id));

export const CLUBS: ClubDef[] = [
  { id: 'pacos', n: 'Paços Run Club', members: 312, ev: { d: 1, t: 'Corrida de grupo · ter 19h', where: 'Junto ao rio' } },
  { id: 'porto', n: 'Porto Runners Crew', members: 840, ev: { d: 2, t: 'Corrida de grupo · qua 19h30', where: 'Ribeira' } },
  { id: 'aveiro', n: 'Aveiro Running Team', members: 95, ev: { d: 3, t: 'Corrida de grupo · qui 7h', where: 'Costa Nova' } },
  { id: 'lisboa', n: 'Lisboa Night Runners', members: 1200, ev: { d: 1, t: 'Corrida noturna · ter 21h', where: 'Ribeira das Naus' } }
];
export const OTHER_CLUBS = ['Douro Runners', 'Minho Running Team', 'Costa Verde Run Club', 'Serra Endurance', 'Vale do Sousa Runners'];

export const SHOP: ShopItem[] = [
  { id: 'shoes', cat: 'Sapatilhas', n: 'Sapatilhas de treino novas', p: 140, d: 'O contador de km das sapatilhas volta a 0', once: true },
  { id: 'carbon', cat: 'Sapatilhas', n: 'Sapatilhas de placa de carbono', p: 260, d: '−1,5% no tempo de todas as provas' },
  { id: 'watch', cat: 'Tecnologia', n: 'Relógio GPS com frequência cardíaca', p: 320, d: '+10% nos ganhos de séries, limiar e rampas: treinas nas zonas certas' },
  { id: 'treadmill', cat: 'Tecnologia', n: 'Passadeira', p: 900, d: 'A chuva deixa de estragar treinos' },
  { id: 'roller', cat: 'Recuperação', n: 'Rolo de massagem', p: 45, d: 'Recuperas um pouco mais depressa todos os dias' },
  { id: 'massage', cat: 'Recuperação', n: 'Massagem desportiva', p: 50, once: true, d: '−15 de fadiga já' },
  { id: 'physio', cat: 'Recuperação', n: 'Fisioterapeuta', p: 80, once: true, d: 'Tira 4 dias a uma lesão' },
  { id: 'gym', cat: 'Serviços', n: 'Ginásio', p: 12, sub: true, d: '12 € por semana · +30% nos ganhos de força' },
  { id: 'coach', cat: 'Serviços', n: 'Treinador online', p: 55, sub: true, d: '55 € por semana · +15% em todos os ganhos' },
  { id: 'nutri', cat: 'Serviços', n: 'Consulta de nutrição', p: 90, d: 'Sabes quantos géis levar e partes com +5 de energia' }
];

/** Talentos: um ponto por nível. Mudam as regras a teu favor. */
export const TALENTS: Talent[] = [
  { id: 'madrugador', n: 'Madrugador', d: '+15% nos ganhos de rodagens e longões' },
  { id: 'sono', n: 'Sono de pedra', d: 'A fadiga desce mais depressa todos os dias' },
  { id: 'pesleves', n: 'Pés leves', d: '−30% no risco de lesão' },
  { id: 'subidas', n: 'Cabra da serra', d: 'As subidas custam-te metade do tempo' },
  { id: 'diesel', n: 'Motor diesel', d: '−8% de energia gasta em meias e maratonas' },
  { id: 'cabeca', n: 'Cabeça fria', d: 'Bater na parede custa metade' },
  { id: 'finisher', n: 'Finisher', d: 'Atacar no último segmento custa menos e o sprint final é mais fácil' },
  { id: 'popular', n: 'Popular', d: '+25% na fama ganha em provas' }
];

export const SPONSORS: SponsorDef[] = [
  { id: 'pista', n: 'Pista Café', minFame: 12, weekly: 30, weeks: 12, podium: 50, d: 'O café da terra. Paga pouco, mas acredita em ti.' },
  { id: 'mare', n: 'Maré Nutrição', minFame: 20, weekly: 60, weeks: 12, podium: 100, d: 'Géis e barras. Querem fotos tuas com o produto.' },
  { id: 'granito', n: 'Granito Seguros', minFame: 32, weekly: 110, weeks: 16, podium: 200, req: 0.3, d: 'Exigem que acabes no top 30% da tua categoria em todas as provas de calendário.' },
  { id: 'vento', n: 'Vento Norte Running', minFame: 45, weekly: 90, weeks: 20, podium: 150, disc: 0.3, d: 'Dão 30% de desconto em sapatilhas.' },
  { id: 'atlas', n: 'Atlas Energia', minFame: 65, weekly: 280, weeks: 20, podium: 400, d: 'Marca nacional. Isto já é vida de profissional.' }
];

export const FIRST_NAMES: Record<Cat, string[]> = {
  M: ['Rui', 'Tiago', 'Pedro', 'Hugo', 'André', 'Nuno', 'João', 'Miguel', 'Diogo', 'Bruno', 'Iker', 'Pablo', 'Sérgio', 'Marco', 'Luís', 'Ricardo', 'Vasco', 'Gonçalo', 'Álvaro', 'Jorge', 'Fábio', 'Daniel', 'Hélder', 'Carlos', 'Mateo'],
  F: ['Ana', 'Marta', 'Rita', 'Joana', 'Inês', 'Sofia', 'Catarina', 'Beatriz', 'Carla', 'Sara', 'Lúcia', 'Teresa', 'Lara', 'Mafalda', 'Patrícia', 'Raquel', 'Laia', 'Lucía', 'Carmen', 'Elena', 'Filipa', 'Diana', 'Helena', 'Cláudia', 'Vera']
};
export const LAST_NAMES = ['Silva', 'Costa', 'Ferreira', 'Moreira', 'Pinto', 'Sousa', 'Lopes', 'Gomes', 'Ribeiro', 'Teixeira', 'Vieira', 'Castro', 'García', 'López', 'Ruiz', 'Navarro', 'Alves', 'Mendes', 'Barros', 'Freitas', 'Rocha', 'Campos', 'Araújo', 'Faria'];

export const PROFILES: Record<ProfileKey, { n: string; d: string; a: Attrs; plan: PresetName }> = {
  beginner: { n: 'Comecei a correr há pouco', d: '5 km em cerca de 31 minutos', a: { spd: 36, thr: 33, end: 30, str: 32, men: 55 }, plan: 'Iniciação' },
  regular: { n: 'Corro há uns anos', d: '5 km em cerca de 26 minutos', a: { spd: 51, thr: 49, end: 46, str: 40, men: 62 }, plan: 'Equilibrada' },
  fast: { n: 'Já faço provas a sério', d: '5 km em cerca de 22 minutos', a: { spd: 63, thr: 62, end: 60, str: 46, men: 68 }, plan: 'Equilibrada' }
};

/**
 * Atleta de exemplo calibrado com os recordes reais do fundador em 2026:
 * 5 km 19:11, 10 km 39:25, meia 1:25:28, maratona 3:33:04.
 */
export const FILINTO = {
  a: { spd: 74, thr: 84, end: 66, str: 55, men: 88 } as Attrs,
  ctl: 55,
  atl: 48,
  fatigue: 42,
  shoeKm: 241,
  pb: { '5k': 1151, '10k': 2365, meia: 5128, maratona: 12784 } as Partial<Record<RaceType, number>>,
  gear: [['Adios Pro 4 · prova', '108 km'], ['Invincible Run 3 (2) · treino', 'sapatilhas ativas'], ['Crocs Faísca McQueen', '+2 moral por semana']] as [string, string][]
};

export interface EventDef {
  t: string;
  x: string;
  minFame?: number;
  job?: boolean;
  /** Acontece num dia marcado, nunca ao acaso. */
  scheduled?: boolean;
  o: [string, (s: GameState) => string][];
}

export const EVENTS: Record<string, EventDef> = {
  jantar: { t: 'Jantar de anos de um amigo', x: 'Hoje à noite. Amanhã há treino.', o: [
    ['Ir ao jantar', s => { s.moral += 10; s.fatigue += 5; return 'Noite boa. As pernas amanhã vão queixar-se.'; }],
    ['Ficar em casa', s => { s.moral -= 5; return 'Dormiste 9 horas. O grupo do WhatsApp não perdoa.'; }]] },
  jornal: { t: 'O jornal local quer uma entrevista', x: 'Querem uma página sobre "quem corre na nossa terra".', minFame: 15, o: [
    ['Aceitar', s => { s.fame += 4; s.fatigue += 2; return 'Saíste na página 7. +4 fama.'; }],
    ['Recusar', () => 'Ficaste a treinar. Ninguém soube.']] },
  pista: { t: 'O teu clube marca um treino de pista', x: 'Séries de 400 m com os mais rápidos do clube, depois do teu treino.', o: [
    ['Ir', s => { s.a.spd = Math.min(99, s.a.spd + 0.5); s.fatigue += 6; s.fame += 1; return 'Aguentaste o grupo da frente. +0,5 velocidade.'; }],
    ['Ficar', () => 'Fica para a próxima.']] },
  viral: { t: 'O teu treino ficou viral', x: 'Alguém partilhou o teu percurso em forma de coração.', o: [
    ['Responder aos kudos', s => { s.fame += 3; s.moral += 4; return '+3 fama.'; }]] },
  extra: { t: 'Pedem-te horas extra no trabalho', x: 'O chefe precisa de ajuda hoje e amanhã.', job: true, o: [
    ['Aceitar (+90 €)', s => { s.money += 90; s.fatigue += 7; return 'Mais 90 € e menos horas de sono.'; }],
    ['Recusar', s => { s.moral -= 2; return 'O chefe torceu o nariz.'; }]] },
  sono: { t: 'Noite mal dormida', x: 'O vizinho resolveu fazer obras às 7h.', o: [
    ['Sesta à tarde', s => { s.fatigue -= 4; return 'Sesta de 40 minutos. Salvo.'; }],
    ['Café duplo', s => { s.money -= 2; s.fatigue += 3; return 'Funcionou. Mais ou menos.'; }]] },
  cao: { t: 'Um cão solto no teu percurso', x: 'Vem a correr atrás de ti, a ladrar.', o: [
    ['Acelerar', s => { s.a.spd = Math.min(99, s.a.spd + 0.3); s.fatigue += 3; return 'Recorde pessoal nos 200 m. +0,3 velocidade.'; }],
    ['Parar e falar com ele', s => { s.moral += 3; return 'Afinal só queria festas. Ganhaste um amigo.'; }]] },
  bolha: { t: 'Uma bolha no calcanhar', x: 'As meias novas não foram boa ideia.', o: [
    ['Penso e creme (6 €)', s => { s.money -= 6; return 'Tratada. Amanhã já nem te lembras.'; }],
    ['Ignorar', s => { if (random() < 0.3) { s.fatigue += 6; s.moral -= 4; return 'Piorou. Correste torto dois dias.'; } return 'Passou sozinha.'; }]] },
  amigo: { t: 'Um amigo quer começar a correr', x: 'Pergunta se pode ir contigo num dos teus treinos.', o: [
    ['Levá-lo contigo', s => { s.moral += 6; s.fame += 1; return 'Foram devagar e a conversar. Ele quer repetir.'; }],
    ['Hoje não dá', () => 'Fica para outro dia.']] },
  estafeta: { t: 'Estafeta do clube no sábado', x: 'Equipas de quatro, 4 × 2 km, contra os clubes da tua divisão. Que parte fazes tu?', scheduled: true, o: [
    ['Abro eu', s => relay(s, 'abrir')],
    ['Fecho eu', s => relay(s, 'fechar')]] }
};

/** Estafeta do clube: abrir pede velocidade, fechar pede limiar e cabeça. Os outros três são membros do clube. */
function relay(s: GameState, leg: 'abrir' | 'fechar'): string {
  const mine = leg === 'abrir' ? s.a.spd : (s.a.thr + s.a.men) / 2;
  const mates = [...s.club.members].sort((a, b) => b.r - a.r).slice(0, 3);
  const team = (mine + mates.reduce((a, m) => a + m.r, 0)) / 4 + (random() - 0.5) * 8;
  const others = Array.from({ length: 5 }, () => 55 + (s.club.div === 1 ? 6 : s.club.div === 3 ? -6 : 0) + (random() - 0.5) * 16);
  const pos = others.filter(o => o > team).length + 1;
  const fame = pos === 1 ? 6 : pos <= 3 ? 3 : 1;
  s.fame += fame;
  s.moral += pos <= 3 ? 6 : 1;
  s.club.season += pos === 1 ? 60 : pos <= 3 ? 30 : 10;
  return `${leg === 'abrir' ? 'Abriste' : 'Fechaste'} a estafeta com ${mates.map(m => m.nm.split(' ')[0]).join(', ')}. Equipa em ${pos}º de 6: +${fame} fama e pontos para o clube.`;
}

export const INJURIES = ['canelite', 'dor no tendão de Aquiles', 'fascite plantar', 'contratura na barriga da perna'];
