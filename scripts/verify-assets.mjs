import { readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { scenes } from '../lib/assets.mjs';
let size = 0;

for (const scene of scenes) {
  const frameCount = scene.frames;
  const path = `public/frames/${scene.slug}`;
  const files = readdirSync(path).filter(f => f.endsWith('.webp')).sort();
  if (files.length !== frameCount) throw new Error(`${scene.slug}: ${files.length} frames`);
  for (let i = 0; i < frameCount; i++) {
    if (files[i] !== `${String(i + 1).padStart(4, '0')}.webp`) throw new Error('Noncontiguous frames');
    const metadata = await sharp(`${path}/${files[i]}`).metadata();
    if (metadata.width !== scene.width || metadata.height !== scene.height) throw new Error(`Unexpected dimensions: ${scene.slug}/${files[i]}`);
    size += statSync(`${path}/${files[i]}`).size;
  }
  console.log(`${scene.slug}: ${frameCount} valid ${scene.width}×${scene.height} WebP frames`);
}
console.log(`Total: ${scenes.reduce((n, s) => n + s.frames, 0)} frames, ${(size / 1024 / 1024).toFixed(1)} MB`);
