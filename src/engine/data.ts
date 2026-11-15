import { random } from './rng';
import type { AttrKey, Attrs, Cat, ClubDef, GameState, ProfileKey, RaceDef, RaceType, Session, SessionKey, ShopItem, Sport, SponsorDef } from './types';

export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
export const DAY_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'] as const;

export const ATTR: Record<AttrKey, [string, Sport]> = {
  swimTec: ['Técnica', 'swim'], swimEnd: ['Resistência', 'swim'],
  bikePow: ['Potência', 'bike'], bikeEnd: ['Resistência', 'bike'],
  runSpd: ['Velocidade', 'run'], runEnd: ['Resistência', 'run'],
  trans: ['Transições', 'gen'], str: ['Força', 'gen'], mental: ['Mental', 'gen']
};
export const ATTR_KEYS = Object.keys(ATTR) as AttrKey[];
export const SPORT_NAME: Record<Sport, string> = { swim: 'Natação', bike: 'Ciclismo', run: 'Corrida', gen: 'Geral' };

export const SESS: Record<SessionKey, Session> = {
  rest: { n: 'Descanso', sp: 'gen', load: 0, cost: 0, min: 0, g: {} },
  swimTec: { n: 'Natação · técnica', sp: 'swim', load: 35, cost: 4, min: 45, g: { swimTec: 1.6, swimEnd: 0.4 } },
  swimEnd: { n: 'Natação · volume', sp: 'swim', load: 50, cost: 4, min: 60, g: { swimEnd: 1.5, swimTec: 0.5 } },
  bikeZ2: { n: 'Bike · Z2 longa', sp: 'bike', load: 70, cost: 0, min: 150, g: { bikeEnd: 1.5, bikePow: 0.4 } },
  bikeInt: { n: 'Bike · intervalos', sp: 'bike', load: 75, cost: 0, min: 75, g: { bikePow: 1.6, bikeEnd: 0.3 } },
  runZ2: { n: 'Corrida · Z2', sp: 'run', load: 50, km: 10, cost: 0, min: 60, g: { runEnd: 1.2, runSpd: 0.3 } },
  runInt: { n: 'Corrida · séries', sp: 'run', load: 70, km: 10, cost: 0, min: 55, g: { runSpd: 1.4, runEnd: 0.3 } },
  brick: { n: 'Brick · bike + corrida', sp: 'run', load: 80, km: 5, cost: 0, min: 90, g: { trans: 1.6, bikeEnd: 0.6, runEnd: 0.5 } },
  str: { n: 'Força', sp: 'gen', load: 30, cost: 0, min: 45, g: { str: 1.8 } }
};
export const SESSION_KEYS = Object.keys(SESS) as SessionKey[];

export const PRESETS: Record<'Típica' | 'Carga' | 'Taper', SessionKey[]> = {
  'Típica': ['str', 'runInt', 'brick', 'swimTec', 'rest', 'runZ2', 'bikeZ2'],
  'Carga': ['swimEnd', 'runInt', 'bikeInt', 'swimTec', 'runZ2', 'brick', 'bikeZ2'],
  'Taper': ['swimTec', 'runZ2', 'rest', 'swimTec', 'bikeZ2', 'rest', 'rest']
};

export const DIST: Record<RaceType, { swim: number; bike: number; run: number; l: string }> = {
  sprint: { swim: 750, bike: 20, run: 5, l: 'Sprint' },
  olimp: { swim: 1500, bike: 40, run: 10, l: 'Olímpico' },
  meia: { swim: 1900, bike: 90, run: 21.1, l: 'Meia distância' },
  longa: { swim: 3800, bike: 180, run: 42.2, l: 'Longa distância' }
};
export const GELS: Record<RaceType, number> = { sprint: 0, olimp: 2, meia: 6, longa: 12 };
export const RACE_REWARD: Record<RaceType, { prize: number; fame: number; pts: number; fat: number }> = {
  sprint: { prize: 1, fame: 1, pts: 1, fat: 12 },
  olimp: { prize: 1.6, fame: 1.4, pts: 1.5, fat: 20 },
  meia: { prize: 3, fame: 2.2, pts: 2.5, fat: 32 },
  longa: { prize: 5, fame: 3.5, pts: 3.5, fat: 45 }
};

// Uma temporada de 20 semanas. As provas "core" ficam inscritas por defeito; as outras escolhem-se em Carreira.
// Caminho para o mundial: Lisboa ou Taça Ibérica dão vaga para o Algarve; o Algarve e a longa distância de Vitória
// dão vaga para o Mundial. O Grande Prémio Atlântico é por convite (fama) e paga como uma prova profissional.
export const CALENDAR: RaceDef[] = [
  { id: 'povoa', w: 3, n: 'Sprint da Póvoa', t: 'sprint', tier: 'regional', core: true, temp: 17, fee: 30, travel: 15, lvl: 46, nM: 46, nF: 24 },
  { id: 'viseu', w: 5, n: 'Sprint de Viseu', t: 'sprint', tier: 'regional', temp: 19, fee: 30, travel: 25, lvl: 47, nM: 44, nF: 22 },
  { id: 'viana', w: 6, n: 'Olímpico de Viana', t: 'olimp', tier: 'regional', core: true, temp: 18, fee: 55, travel: 30, lvl: 50, nM: 58, nF: 30 },
  { id: 'coimbra', w: 8, n: 'Olímpico de Coimbra', t: 'olimp', tier: 'regional', temp: 20, fee: 50, travel: 50, lvl: 51, nM: 52, nF: 28 },
  { id: 'aveiro', w: 9, n: 'Sprint de Aveiro', t: 'sprint', tier: 'regional', core: true, temp: 20, fee: 30, travel: 40, lvl: 50, nM: 50, nF: 28 },
  { id: 'sevilha', w: 11, n: 'Meia distância de Sevilha', t: 'meia', tier: 'nacional', temp: 22, fee: 120, travel: 180, lvl: 57, nM: 60, nF: 32 },
  { id: 'lisboa', w: 12, n: 'Olímpico de Lisboa', t: 'olimp', tier: 'nacional', core: true, temp: 21, fee: 65, travel: 120, lvl: 54, nM: 70, nF: 40, slot: 1, slotTo: 'algarve' },
  { id: 'vitoria', w: 14, n: 'Longa distância de Vitória', t: 'longa', tier: 'internacional', temp: 20, fee: 250, travel: 300, lvl: 60, nM: 70, nF: 36, slot: 1, slotTo: 'mundial' },
  { id: 'iberica', w: 16, n: 'Taça Ibérica · Olímpico', t: 'olimp', tier: 'nacional', core: true, temp: 23, fee: 90, travel: 220, lvl: 62, nM: 60, nF: 36, minPts: 60, slot: 2, slotTo: 'algarve' },
  { id: 'atlantico', w: 17, n: 'Grande Prémio Atlântico (convite)', t: 'meia', tier: 'pro', temp: 21, fee: 0, travel: 150, lvl: 66, nM: 40, nF: 24, minFame: 60, prizeMult: 3 },
  { id: 'algarve', w: 18, n: 'Meia distância do Algarve', t: 'meia', tier: 'nacional', core: true, temp: 24, fee: 150, travel: 260, lvl: 58, nM: 60, nF: 34, needSlot: true, altPts: 170, slot: 1, slotTo: 'mundial' },
  { id: 'mundial', w: 20, n: 'Mundial de Longa Distância · Ilha das Brasas', t: 'longa', tier: 'mundial', core: true, temp: 25, fee: 400, travel: 600, lvl: 74, nM: 80, nF: 50, needSlot: true, prizeMult: 4 }
];
export const CORE_RACES = CALENDAR.filter(r => r.core).map(r => r.id);
export const raceById = (id: string): RaceDef | undefined => CALENDAR.find(r => r.id === id);

export const CLUBS: ClubDef[] = [
  { id: 'pacos', n: 'Paços Run Club', members: 312, ev: { d: 1, t: 'Corrida de grupo · ter 19h', where: 'Junto ao rio', sp: 'run' } },
  { id: 'porto', n: 'Porto Runners Crew', members: 840, ev: { d: 2, t: 'Corrida de grupo · qua 19h30', where: 'Ribeira', sp: 'run' } },
  { id: 'aveiro', n: 'Tri Clube de Aveiro', members: 95, ev: { d: 3, t: 'Treino de bike · qui 7h', where: 'Costa Nova', sp: 'bike' } },
  { id: 'lisboa', n: 'Lisboa Night Runners', members: 1200, ev: { d: 1, t: 'Corrida noturna · ter 21h', where: 'Ribeira das Naus', sp: 'run' } }
];
export const OTHER_CLUBS = ['Douro Runners', 'Minho Tri Team', 'Costa Verde Run Club', 'Serra Endurance', 'Vale do Sousa Runners'];

export const SHOP: ShopItem[] = [
  { id: 'aero', cat: 'Bike', n: 'Bike aero de carbono', p: 2400, d: '+3% de velocidade na bike' },
  { id: 'tt', cat: 'Bike', n: 'Bike de contrarrelógio', p: 4600, d: '+6% de velocidade na bike (substitui a aero)' },
  { id: 'wheels', cat: 'Bike', n: 'Rodas de perfil alto', p: 1200, d: '+2% de velocidade na bike' },
  { id: 'helmet', cat: 'Bike', n: 'Capacete aero', p: 240, d: '+1% de velocidade na bike' },
  { id: 'wsBasic', cat: 'Natação', n: 'Fato isotérmico básico', p: 180, d: '−4% a nadar em água abaixo de 22 °C' },
  { id: 'wsPro', cat: 'Natação', n: 'Fato isotérmico premium', p: 560, d: '−6% em água fria e T1 mais rápida' },
  { id: 'shoes', cat: 'Corrida', n: 'Sapatilhas de treino novas', p: 140, d: 'O contador de km das sapatilhas volta a 0', once: true },
  { id: 'carbon', cat: 'Corrida', n: 'Sapatilhas de carbono', p: 260, d: '−1,5% no ritmo de corrida em prova' },
  { id: 'pm', cat: 'Tecnologia', n: 'Potenciómetro', p: 620, d: '+15% nos ganhos dos treinos de bike' },
  { id: 'trainer', cat: 'Tecnologia', n: 'Rolo inteligente', p: 900, d: '+10% nos ganhos de bike; a chuva deixa de estragar treinos' },
  { id: 'coach', cat: 'Serviços', n: 'Treinador online', p: 55, sub: true, d: '55 € por semana · +15% em todos os ganhos' },
  { id: 'massage', cat: 'Serviços', n: 'Massagem desportiva', p: 50, once: true, d: '−15 de fadiga já' },
  { id: 'nutri', cat: 'Serviços', n: 'Consulta de nutrição', p: 90, d: 'Passas a saber quantos géis levar em cada prova' }
];

export const SPONSORS: SponsorDef[] = [
  { id: 'pista', n: 'Pista Café', minFame: 12, weekly: 30, weeks: 12, podium: 50, d: 'O café da terra. Paga pouco, mas acredita em ti.' },
  { id: 'mare', n: 'Maré Nutrição', minFame: 20, weekly: 60, weeks: 12, podium: 100, d: 'Géis e barras. Querem fotos tuas com o produto.' },
  { id: 'granito', n: 'Granito Seguros', minFame: 32, weekly: 110, weeks: 16, podium: 200, req: 0.3, d: 'Exigem que acabes no top 30% da tua categoria em todas as provas.' },
  { id: 'vento', n: 'Vento Norte Bikes', minFame: 45, weekly: 90, weeks: 20, podium: 150, disc: 0.3, d: 'Dão 30% de desconto em bikes e rodas.' },
  { id: 'atlas', n: 'Atlas Energia', minFame: 65, weekly: 280, weeks: 20, podium: 400, d: 'Marca nacional. Isto já é vida de profissional.' }
];

export const FIRST_NAMES: Record<Cat, string[]> = {
  M: ['Rui', 'Tiago', 'Pedro', 'Hugo', 'André', 'Nuno', 'João', 'Miguel', 'Diogo', 'Bruno', 'Iker', 'Pablo', 'Sérgio', 'Marco', 'Luís', 'Ricardo', 'Vasco', 'Gonçalo', 'Álvaro', 'Jorge', 'Fábio', 'Daniel', 'Hélder', 'Carlos', 'Mateo'],
  F: ['Ana', 'Marta', 'Rita', 'Joana', 'Inês', 'Sofia', 'Catarina', 'Beatriz', 'Carla', 'Sara', 'Lúcia', 'Teresa', 'Lara', 'Mafalda', 'Patrícia', 'Raquel', 'Laia', 'Lucía', 'Carmen', 'Elena', 'Filipa', 'Diana', 'Helena', 'Cláudia', 'Vera']
};
export const LAST_NAMES = ['Silva', 'Costa', 'Ferreira', 'Moreira', 'Pinto', 'Sousa', 'Lopes', 'Gomes', 'Ribeiro', 'Teixeira', 'Vieira', 'Castro', 'García', 'López', 'Ruiz', 'Navarro', 'Alves', 'Mendes', 'Barros', 'Freitas', 'Rocha', 'Campos', 'Araújo', 'Faria'];

export const PROFILES: Record<ProfileKey, { n: string; a: Attrs }> = {
  runner: { n: 'Corredor que quer experimentar', a: { swimTec: 24, swimEnd: 28, bikePow: 40, bikeEnd: 45, runSpd: 64, runEnd: 62, trans: 35, str: 38, mental: 65 } },
  cyclist: { n: 'Ciclista de fim de semana', a: { swimTec: 26, swimEnd: 30, bikePow: 60, bikeEnd: 70, runSpd: 42, runEnd: 46, trans: 38, str: 40, mental: 65 } },
  swimmer: { n: 'Ex-nadador', a: { swimTec: 70, swimEnd: 68, bikePow: 40, bikeEnd: 44, runSpd: 46, runEnd: 46, trans: 40, str: 45, mental: 60 } }
};

/** Atleta de exemplo calibrado com 3 meses de Strava do fundador (15 ago – 14 nov 2026). */
export const FILINTO = {
  a: { swimTec: 32, swimEnd: 36, bikePow: 52, bikeEnd: 78, runSpd: 70, runEnd: 74, trans: 55, str: 42, mental: 85 } as Attrs,
  ctl: 330,
  atl: 250,
  fatigue: 42,
  shoeKm: 241,
  gear: [['GIANT · estrada, 7 kg', '2171 km'], ['TREK · estrada, 8 kg', '509 km'], ['Adios Pro 4 · prova', '108 km'], ['Invincible Run 3 (2) · treino', 'sapatilhas ativas'], ['Crocs Faísca McQueen', '+2 moral por semana']] as [string, string][]
};

export interface EventDef {
  t: string;
  x: string;
  minFame?: number;
  job?: boolean;
  /** Acontece numa semana marcada, nunca ao acaso. */
  scheduled?: boolean;
  o: [string, (s: GameState) => string][];
}

export const EVENTS: Record<string, EventDef> = {
  jantar: { t: 'Jantar de anos de um amigo', x: 'Sábado à noite, véspera do treino longo.', o: [
    ['Ir ao jantar', s => { s.moral += 12; s.fatigue += 5; return 'Noite boa. As pernas amanhã vão queixar-se.'; }],
    ['Ficar em casa', s => { s.moral -= 6; return 'Dormiste 9 horas. O grupo do WhatsApp não perdoa.'; }]] },
  furo: { t: 'Furo a caminho do trabalho', x: 'Pneu da bike rasgado.', o: [
    ['Pneu novo (35 €)', s => { s.money -= 35; return 'Pneu novo montado.'; }],
    ['Remendar e rezar', s => { if (random() < 0.4) { s.money -= 60; return 'Furou outra vez e levou a câmara e a fita de jante: 60 €.'; } return 'Aguentou. Por agora.'; }]] },
  jornal: { t: 'O jornal local quer uma entrevista', x: '"A atleta da terra que não pára."', minFame: 15, o: [
    ['Aceitar', s => { s.fame += 4; s.fatigue += 2; return 'Saíste na página 7. +4 fama.'; }],
    ['Recusar', () => 'Ficaste a treinar. Ninguém soube.']] },
  chuva: { t: 'Previsão: chuva a semana toda', x: 'Norte de Portugal em modo outono.', o: [
    ['Paciência', s => { s.rain = true; return s.owned.trainer ? 'Tens rolo. A bike vai para dentro de casa.' : 'Os treinos de bike na rua rendem menos esta semana.'; }]] },
  pista: { t: 'O teu clube marca um treino de pista', x: 'Séries de 400 m com os mais rápidos do clube.', o: [
    ['Ir', s => { s.a.runSpd = Math.min(99, s.a.runSpd + 0.7); s.fatigue += 6; s.fame += 1; return 'Aguentaste o grupo da frente. +0,7 velocidade.'; }],
    ['Ficar', () => 'Fica para a próxima.']] },
  viral: { t: 'O teu treino ficou viral', x: 'Alguém partilhou o teu mapa em forma de bicicleta.', o: [
    ['Responder aos kudos', s => { s.fame += 3; s.moral += 4; return '+3 fama.'; }]] },
  extra: { t: 'Pedem-te horas extra no trabalho', x: 'O chefe precisa de ajuda esta semana.', job: true, o: [
    ['Aceitar (+120 €)', s => { s.money += 120; s.fatigue += 8; return 'Mais 120 € e menos horas de sono.'; }],
    ['Recusar', s => { s.moral -= 2; return 'O chefe torceu o nariz.'; }]] },
  estafeta: { t: 'Estafeta do clube no sábado', x: 'Equipas de três clubes da tua divisão: um nada, outro pedala, outro corre. Que parte fazes tu?', scheduled: true, o: [
    ['Nado eu', s => relay(s, 'swim')],
    ['Pedalo eu', s => relay(s, 'bike')],
    ['Corro eu', s => relay(s, 'run')]] },
  sono: { t: 'Noite mal dormida', x: 'O vizinho resolveu fazer obras às 7h.', o: [
    ['Sesta à tarde', s => { s.fatigue -= 4; return 'Sesta de 40 minutos. Salvo.'; }],
    ['Café duplo', s => { s.money -= 2; s.fatigue += 3; return 'Funcionou. Mais ou menos.'; }]] }
};

/** Estafeta do clube: a tua parte vale o teu atributo nessa disciplina; os outros dois são membros do clube. */
function relay(s: GameState, leg: 'swim' | 'bike' | 'run'): string {
  const mine = leg === 'swim' ? (s.a.swimTec + s.a.swimEnd) / 2 : leg === 'bike' ? (s.a.bikePow + s.a.bikeEnd) / 2 : (s.a.runSpd + s.a.runEnd) / 2;
  const mates = [...s.club.members].sort((a, b) => b.r - a.r).slice(0, 2);
  const team = (mine + mates[0].r + mates[1].r) / 3 + (random() - 0.5) * 8;
  const others = Array.from({ length: 5 }, () => 55 + (s.club.div === 1 ? 6 : s.club.div === 3 ? -6 : 0) + (random() - 0.5) * 16);
  const pos = others.filter(o => o > team).length + 1;
  const fame = pos === 1 ? 6 : pos <= 3 ? 3 : 1;
  s.fame += fame;
  s.moral += pos <= 3 ? 6 : 1;
  s.club.season += pos === 1 ? 60 : pos <= 3 ? 30 : 10;
  const legName = leg === 'swim' ? 'a natação' : leg === 'bike' ? 'a bike' : 'a corrida';
  return `Fizeste ${legName} com ${mates[0].nm} e ${mates[1].nm}. Equipa em ${pos}º de 6: +${fame} fama e pontos para o clube.`;
}

export const INJURIES =['canelite', 'dor no tendão de Aquiles', 'fascite plantar', 'contratura na barriga da perna'];
