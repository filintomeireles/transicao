// Tempo no dia da prova: varia à volta do típico de cada prova.
import { clamp } from './format';
import { gauss, random } from './rng';
import type { RaceDef, Weather } from './types';

export function rollWeather(r: RaceDef): Weather {
  const air = Math.round(clamp(r.air + gauss() * 3, 8, 38));
  return { air, wind: Math.round(clamp(r.windy + gauss() * 8, 0, 50)), rain: random() < (air < 20 ? 0.3 : 0.1) };
}

/** Frase curta com as condições, para o ecrã da prova e o relato. */
export const weatherText = (w: Weather): string =>
  `ar a ${w.air} °C · vento ${w.wind} km/h${w.rain ? ' · chuva' : ''}`;
