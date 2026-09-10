export const scenes = [
  { slug: 'newspaper', source: 'history.mp4', name: 'The newspaper', distance: 220 },
  { slug: 'photograph', source: 'archive.mp4', name: 'Into the photograph', distance: 200 },
  { slug: 'crossroads', source: 'statue.mp4', name: 'The crossroads', distance: 220 },
  { slug: 'compass', source: 'brass.mp4', name: 'An instrument of discovery', distance: 220 },
  { slug: 'wanted', source: 'wanted.mp4', name: 'The wanted archive', distance: 260 },
  { slug: 'corridor', source: 'corridor.mp4', name: 'Through the passage', distance: 210 },
  { slug: 'object', source: 'product.mp4', name: 'The discovery', distance: 220 },
  { slug: 'return', source: 'newspaper.mp4', name: 'Back to the beginning', distance: 260 },
];
export const totalDistance = scenes.reduce((sum, s) => sum + s.distance, 0);
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function locate(progress) {
  let position = clamp(progress) * totalDistance;
  for (let i = 0; i < scenes.length; i++) {
    if (position < scenes[i].distance || i === scenes.length - 1) return { scene: i, progress: clamp(position / scenes[i].distance) };
    position -= scenes[i].distance;
  }
}
export function frameAt(scene, progress) {
  const p = clamp(progress);
  return Math.floor((scene === 0 ? 1 - (1 - p) ** 2 : p) * 239);
}
export const frameURL = (scene, frame) => `/frames/${scenes[scene].slug}/${String(frame + 1).padStart(4, '0')}.webp`;
export function layersAt(progress) {
  const current = locate(progress);
  const seam = 15 / 239;
  const p = current.progress;
  // Both ends of each seam consume scroll distance, preserving every frame.
  let start = 0, end = 1;
  if (current.scene > 0) start = seam;
  if (current.scene < 7) end = 1 - seam;
  const bodyProgress = clamp(p / end);
  const eased = current.scene === 0 ? 1 - (1 - bodyProgress) ** 2 : bodyProgress;
  const mapped = start + eased * (end - start);
  const layers = [{ scene: current.scene, frame: Math.floor(mapped * 239 + 1e-8), opacity: 1, scale: 1, rotate: 0 }];
  if (current.scene < 7 && p > 1 - seam) {
    const t = (p - (1 - seam)) / seam;
    layers[0].frame = Math.floor((1 - seam + t * seam) * 239);
    layers[0].opacity = 1 - t;
    const next = { scene: current.scene + 1, frame: Math.floor(t * 15), opacity: 1, scale: 1, rotate: 0 };
    if (current.scene === 1) { layers[0].scale = 1 - t * .08; next.scale = 1.08 - t * .08; }
    if (current.scene === 3) { layers[0].frame = 239; layers[0].scale = 1 - t * .72; layers[0].rotate = -t * 9; layers[0].inset = t * 25; layers[0].opacity = 1 - t; next.opacity = 1; }
    layers.push(next);
  }
  return { ...current, layers };
}
