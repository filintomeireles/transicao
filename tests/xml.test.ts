// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { parseGPX, parseTCX } from '../src/engine';

describe('parseGPX', () => {
  it('soma a distância, a duração e a FC média de uma corrida', () => {
    const pts = Array.from({ length: 60 }, (_, i) =>
      `<trkpt lat="${41.27 + i * 0.0015}" lon="-8.38"><time>2026-11-10T07:${String(i).padStart(2, '0')}:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${140 + (i % 10)}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`).join('');
    const gpx = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Corrida matinal</name><type>running</type><trkseg>${pts}</trkseg></trk></gpx>`;
    const [a] = parseGPX(gpx);
    expect(a.sport).toBe('run');
    expect(a.sec).toBe(59 * 60);
    expect(a.km).toBeCloseTo(9.84, 1);
    expect(a.hr).toBeCloseTo(144.5, 1);
  });
});

describe('parseTCX', () => {
  it('lê uma volta de bike com FC média', () => {
    const tcx = `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Biking"><Id>2026-11-12T18:00:00Z</Id><Lap StartTime="2026-11-12T18:00:00Z"><TotalTimeSeconds>5400</TotalTimeSeconds><DistanceMeters>48000</DistanceMeters><AverageHeartRateBpm><Value>138</Value></AverageHeartRateBpm></Lap></Activity></Activities></TrainingCenterDatabase>`;
    const [a] = parseTCX(tcx);
    expect(a).toMatchObject({ sport: 'bike', sec: 5400, km: 48, hr: 138, start: Date.parse('2026-11-12T18:00:00Z') });
  });
});
