import ffmpeg from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { scenes } from '../lib/assets.mjs';
import { join } from 'node:path';
import { homedir } from 'node:os';
const sourceDirectory = process.argv[2] || join(homedir(), 'Downloads');
const frameCount = 72;
for (const scene of scenes) {
  const directory = `public/frames/${scene.slug}`;
  mkdirSync(directory, { recursive: true });
  if (readdirSync(directory).filter(f => f.endsWith('.webp')).length === frameCount) { console.log(`${scene.slug}: already extracted`); continue; }
  const result = spawnSync(ffmpeg, ['-y', '-threads', '2', '-i', join(sourceDirectory, scene.source), '-vf', `fps=${frameCount / 10},scale=1920:1080:flags=lanczos`, '-frames:v', String(frameCount), '-c:v', 'libwebp', '-quality', '76', '-compression_level', '0', '-threads', '2', `${directory}/%04d.webp`], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const count = readdirSync(directory).filter(f => f.endsWith('.webp')).length;
  if (count !== frameCount) throw new Error(`${scene.slug}: expected ${frameCount} frames, found ${count}`);
  console.log(`${scene.slug}: ${count} frames`);
}
writeFileSync('public/frames/manifest.json', JSON.stringify({ width: 1920, height: 1080, fps: frameCount / 10, frames: frameCount, scenes: scenes.map(s => s.slug) }, null, 2));
