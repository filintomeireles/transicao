// O motor do Transição: lógica pura do jogo, sem interface. Corre no browser, no telemóvel, nos testes e no simulador.
export * from './types';
export * from './data';
export * from './format';
export * from './balance';
export * from './world';
export * from './athlete';
export * from './week';
export * from './race';
export * from './actions';
export * from './coach';
export * from './import/activities';
export { parseFIT } from './import/fit';
export { parseGPX, parseTCX } from './import/xml';
export { setSeed, useMathRandom } from './rng';
