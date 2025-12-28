import { Compositor } from '../dist/index.js';

console.log('Testing darkenFactor validation bug...\n');

// This should throw an error
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'lighten', strength: 1.0, darkenFactor: 0.5 });
  console.log('[BUG] setLayerEffect did NOT throw error for darkenFactor on lighten type');
  console.log('Effect was set successfully - this is wrong!');
} catch (e) {
  console.log('[PASS] Correctly threw error:', e.message);
}

// This should work
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'multiply-darken', strength: 1.0, darkenFactor: 0.5 });
  console.log('[PASS] Correctly accepted darkenFactor on multiply-darken type');
} catch (e) {
  console.log('[BUG] Should have accepted darkenFactor on multiply-darken:', e.message);
}
