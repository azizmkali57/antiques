import test from 'node:test';
import assert from 'node:assert/strict';
import { scenes, totalDistance, locate, layersAt, frameAt } from '../lib/journey.mjs';
test('specified scene lengths total 1810 viewport heights', () => {
  assert.deepEqual(scenes.map(s => s.distance), [220,200,220,220,260,210,220,260]);
  assert.equal(totalDistance, 1810);
});
test('endpoints and eased newspaper mapping', () => {
  assert.equal(frameAt(0, 0), 0); assert.equal(frameAt(0, 1), 239);
  assert.ok(frameAt(0, .5) > frameAt(1, .5));
  assert.deepEqual(locate(1), { scene:7, progress:1 });
  assert.equal(layersAt(1).layers[0].frame, 239);
});
test('every seam blends across real distance and has no transparent black gap', () => {
  let before = 0;
  scenes.slice(0,7).forEach((s, i) => {
    const state = layersAt((before + s.distance * .97) / totalDistance);
    assert.equal(state.layers.length, 2);
    assert.equal(state.layers[1].scene, i + 1);
    assert.ok(state.layers.some(l => l.opacity === 1));
    before += s.distance;
  });
});
test('arbitrary reverse seeks are deterministic and frames stay in range', () => {
  const positions = Array.from({ length:1001 }, (_, i) => i / 1000);
  const forward = positions.map(layersAt);
  positions.reverse().forEach((p, i) => {
    assert.deepEqual(layersAt(p), forward[1000-i]);
    layersAt(p).layers.forEach(l => assert.ok(l.frame >= 0 && l.frame <= 239));
  });
});
