import { readdirSync, rmSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve('out');
const media = join(root, 'media');
for (const name of readdirSync(media)) {
  const target = resolve(media, name);
  if (!target.startsWith(root + '\\') && !target.startsWith(root + '/')) throw new Error('Invalid export path');
  if (name.endsWith('.mp4') && statSync(target).isFile()) rmSync(target);
}
console.log('Export contains frame sequences and product images; unused MP4s omitted.');
