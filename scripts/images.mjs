// Genera las imágenes optimizadas de public/img a partir de los originales de assets-src/img.
// Uso: node scripts/images.mjs   (los resultados se versionan; solo hace falta re-ejecutarlo si cambia un original)
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets-src', 'img');
const OUT = path.join(ROOT, 'public', 'img');
const IVORY = { r: 250, g: 246, b: 239, alpha: 1 };
await fs.mkdir(OUT, { recursive: true });

const out = (name) => path.join(OUT, name);
const report = [];
async function save(pipeline, name) {
  const info = await pipeline.toFile(out(name));
  report.push(`${name.padEnd(30)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}

// Logo (PNG transparente 940x853) -> tamaños de uso real
const logo = path.join(SRC, 'logo.png');
for (const w of [112, 192]) await save(sharp(logo).resize({ width: w }).webp({ quality: 90, alphaQuality: 90 }), `logo-${w}.webp`);
await save(sharp(logo).resize({ width: 512 }).png({ compressionLevel: 9, palette: true }), 'logo-512.png');
// Icono de Apple: fondo marfil, con margen
await save(
  sharp({ create: { width: 180, height: 180, channels: 4, background: IVORY } })
    .composite([{ input: await sharp(logo).resize({ width: 140 }).toBuffer(), gravity: 'center' }])
    .png(),
  'apple-touch-icon.png',
);

// favicon.ico con PNG embebidos de 32 y 48 px (formato ICO admite PNG directamente)
const icoSizes = [32, 48];
const pngs = await Promise.all(icoSizes.map((s) =>
  sharp(logo).resize({ width: s, height: s, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((buf, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(icoSizes[i], e); header.writeUInt8(icoSizes[i], e + 1);
  header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(buf.length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += buf.length;
});
await fs.writeFile(path.join(ROOT, 'public', 'favicon.ico'), Buffer.concat([header, ...pngs]));
report.push(`${'favicon.ico'.padEnd(30)} 32+48`);

// Portada: el banner original lleva texto a la derecha; se recorta solo la parte de Yani
const hero = sharp(path.join(SRC, 'hero-banner.jpeg')).extract({ left: 20, top: 40, width: 660, height: 890 });
const heroBuf = await hero.toBuffer();
for (const w of [400, 660]) await save(sharp(heroBuf).resize({ width: w }).webp({ quality: 78 }), `hero-${w}.webp`);

// Retrato "Sobre mí"
for (const w of [480, 768]) await save(sharp(path.join(SRC, 'about.jpeg')).resize({ width: w }).webp({ quality: 78 }), `about-${w}.webp`);

// Servicios (originales 768x512)
for (const id of ['asesoria', 'residencias', 'nacionalidad', 'homologacion', 'traducciones', 'documentos']) {
  for (const w of [400, 768]) await save(sharp(path.join(SRC, `svc-${id}.webp`)).resize({ width: w }).webp({ quality: 76 }), `svc-${id}-${w}.webp`);
}

console.log(report.join('\n'));
