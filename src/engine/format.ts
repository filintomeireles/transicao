export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const eur = (n: number): string => Math.round(n).toLocaleString('pt-PT') + ' €';

/** Segundos em h:mm:ss ou m:ss. */
export const fmt = (s: number): string => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};

/** Segundos por unidade em m:ss. */
export const pace = (s: number): string => {
  s = Math.round(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

export const dec = (n: number, d = 1): string => n.toFixed(d).replace('.', ',');

/** Escalão etário: 18–24, depois blocos de 5 anos, 70+. */
export const ageGroup = (a: number): string =>
  a < 25 ? '18–24' : a >= 70 ? '70+' : Math.floor(a / 5) * 5 + '–' + (Math.floor(a / 5) * 5 + 4);
