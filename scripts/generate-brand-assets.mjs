import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const icon = await readFile(new URL('../assets/icon.svg', import.meta.url));
await mkdir('public/icons', { recursive: true });
await mkdir('assets', { recursive: true });

await Promise.all([
  sharp(icon).resize(192, 192).png().toFile('public/icons/beshno-bekhan-192.png'),
  sharp(icon).resize(512, 512).png().toFile('public/icons/beshno-bekhan-512.png'),
  sharp(icon).resize(1024, 1024).png().toFile('assets/icon.png'),
]);

// For the Android source splash, keep the brand emblem centrally placed
// with the same dark-navy app background rather than stretching the artwork.
const splashIcon = await sharp(icon).resize(950, 950).png().toBuffer();
await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: '#061b30',
  },
}).composite([{ input: splashIcon, gravity: 'centre' }])
  .png()
  .toFile('assets/splash.png');

console.log('Generated Beshno Bekhan PWA and Android icon/splash sources.');
