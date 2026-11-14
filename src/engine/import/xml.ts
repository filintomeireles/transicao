import type { Activity } from '../types';

const haversine = (a: [number, number], b: [number, number]): number => {
  const R = 6371, t = Math.PI / 180;
  const dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** Desporto a partir do texto do ficheiro; sem texto, a partir da velocidade média. */
export function sportFrom(txt: string | null | undefined, kmh: number): Activity['sport'] {
  const s = (txt || '').toLowerCase();
  if (/swim|nata/.test(s)) return 'swim';
  if (/bik|cycl|ride|ciclis/.test(s)) return 'bike';
  if (/run|corr/.test(s)) return 'run';
  if (/train|strength|weight|forç/.test(s)) return 'str';
  if (kmh >= 15) return 'bike';
  if (kmh >= 5.5) return 'run';
  return 'other';
}

/** Nome do elemento sem prefixo e em minúsculas: os leitores de XML não tratam todos os nomes da mesma forma. */
const nameOf = (e: Element): string => (e.localName || e.nodeName).split(':').pop()!.toLowerCase();

function parseXml(txt: string, what: string): Document {
  const doc = new DOMParser().parseFromString(txt, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`${what} ilegível`);
  return doc;
}

export function parseGPX(txt: string): Activity[] {
  const doc = parseXml(txt, 'GPX');
  const pts = Array.from(doc.getElementsByTagName('trkpt'));
  if (!pts.length) throw new Error('GPX sem pontos');
  let km = 0;
  let prev: [number, number] | null = null;
  const hrs: number[] = [], times: number[] = [];
  for (const p of pts) {
    const c: [number, number] = [Number(p.getAttribute('lat')), Number(p.getAttribute('lon'))];
    if (prev) km += haversine(prev, c);
    prev = c;
    for (const e of Array.from(p.getElementsByTagName('*'))) {
      if (nameOf(e) === 'hr') hrs.push(Number(e.textContent));
      if (nameOf(e) === 'time') times.push(Date.parse(e.textContent || ''));
    }
  }
  const t0 = times[0], sec = times.length ? (times[times.length - 1] - t0) / 1000 : 0;
  const label = doc.getElementsByTagName('type')[0]?.textContent ?? doc.getElementsByTagName('name')[0]?.textContent;
  return [{ sport: sportFrom(label, sec ? km / (sec / 3600) : 0), start: t0 || null, sec, km, hr: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null }];
}

export function parseTCX(txt: string): Activity[] {
  const doc = parseXml(txt, 'TCX');
  const child = (el: Element, n: string) => Array.from(el.children).find(c => nameOf(c) === n.toLowerCase());
  return Array.from(doc.getElementsByTagName('Activity')).map(a => {
    const laps = Array.from(a.getElementsByTagName('Lap'));
    let sec = 0, m = 0, hrSum = 0, hrW = 0;
    for (const l of laps) {
      const t = Number(child(l, 'TotalTimeSeconds')?.textContent) || 0;
      const d = Number(child(l, 'DistanceMeters')?.textContent) || 0;
      sec += t; m += d;
      const ah = child(l, 'AverageHeartRateBpm');
      const v = ah ? Number(child(ah, 'Value')?.textContent) : 0;
      if (v) { hrSum += v * t; hrW += t; }
    }
    const start = Date.parse(laps[0]?.getAttribute('StartTime') ?? a.getElementsByTagName('Id')[0]?.textContent ?? '');
    return { sport: sportFrom(a.getAttribute('Sport'), sec ? m / 1000 / (sec / 3600) : 0), start: start || null, sec, km: m / 1000, hr: hrW ? hrSum / hrW : null };
  });
}
