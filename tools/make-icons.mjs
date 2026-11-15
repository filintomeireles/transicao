// Gera os ícones PNG da app (sem dependências): fundo escuro, um "T" branco e três faixas
// com as cores da natação, bike e corrida. Uso: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x13, 0x21, 0x2b], INK = [0xff, 0xff, 0xff];
const STRIPES = [[0x4d, 0xb4, 0xda], [0xe6, 0xb0, 0x4b], [0xff, 0x6b, 0x4e]];

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Desenha o ícone num quadrado de `size` px. `pad` encolhe o desenho para a zona segura dos ícones adaptáveis. */
function icon(size, pad = 0) {
  const px = Buffer.alloc(size * size * 3);
  const set = (x, y, c) => { const i = (y * size + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; };
  const u = (size * (1 - 2 * pad)) / 100, o = size * pad; // unidades de desenho: 100 × 100
  const rect = (x, y, w, h, c) => {
    for (let yy = Math.round(o + y * u); yy < Math.round(o + (y + h) * u); yy++)
      for (let xx = Math.round(o + x * u); xx < Math.round(o + (x + w) * u); xx++) set(xx, yy, c);
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);
  rect(22, 18, 56, 13, INK);   // barra do T
  rect(43, 18, 14, 50, INK);   // haste do T
  STRIPES.forEach((c, i) => rect(22 + i * 19.3, 76, 17.4, 7, c)); // natação · bike · corrida
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192));
writeFileSync('public/icons/icon-512.png', icon(512));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, 0.1));
writeFileSync('public/icons/apple-touch-icon.png', icon(180));
console.log('Ícones gerados em public/icons/');
