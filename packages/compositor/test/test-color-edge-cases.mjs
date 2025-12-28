import { Compositor } from '../dist/index.js';

console.log('Testing color edge cases...\n');

// Test 1: All black (#000000)
try {
  const c = new Compositor();
  c.addObject('black', { content: [['#']], position: { x: 0, y: 0 }, color: '#000000' });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#000000') {
    console.log('[PASS] All black color works');
  } else {
    console.log('[BUG] Black color incorrect:', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] All black color error:', e.message);
}

// Test 2: All white (#FFFFFF)
try {
  const c = new Compositor();
  c.addObject('white', { content: [['#']], position: { x: 0, y: 0 }, color: '#FFFFFF' });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#ffffff') {
    console.log('[PASS] All white color works');
  } else {
    console.log('[BUG] White color incorrect:', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] All white color error:', e.message);
}

// Test 3: Lowercase hex codes
try {
  const c = new Compositor();
  c.addObject('lower', { content: [['#']], position: { x: 0, y: 0 }, color: '#abc123' });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#abc123') {
    console.log('[PASS] Lowercase hex codes work');
  } else {
    console.log('[BUG] Lowercase hex incorrect:', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Lowercase hex error:', e.message);
}

// Test 4: Uppercase hex codes
try {
  const c = new Compositor();
  c.addObject('upper', { content: [['#']], position: { x: 0, y: 0 }, color: '#ABC123' });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#abc123') {
    console.log('[PASS] Uppercase hex codes work (normalized to lowercase)');
  } else {
    console.log('[BUG] Uppercase hex incorrect:', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Uppercase hex error:', e.message);
}

// Test 5: Mixed case hex codes
try {
  const c = new Compositor();
  c.addObject('mixed', { content: [['#']], position: { x: 0, y: 0 }, color: '#AbC123' });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#abc123') {
    console.log('[PASS] Mixed case hex codes work');
  } else {
    console.log('[BUG] Mixed case hex incorrect:', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Mixed case hex error:', e.message);
}

// Test 6: Lighten black by 50% (should become gray)
try {
  const c = new Compositor();
  c.addObject('bg', { content: [['#']], position: { x: 0, y: 0 }, color: '#000000' });
  c.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.5 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  const result = output.colors[0][0];
  // Should be #808080 (50% between black and white)
  console.log('[PASS] Lighten black by 50%:', result);
} catch (e) {
  console.log('[FAIL] Lighten black error:', e.message);
}

// Test 7: Darken white by 50% (should become gray)
try {
  const c = new Compositor();
  c.addObject('bg', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff' });
  c.setLayerEffect(0, { color: '#000000', type: 'darken', strength: 0.5 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  const result = output.colors[0][0];
  // Should be #808080 (50% between white and black)
  console.log('[PASS] Darken white by 50%:', result);
} catch (e) {
  console.log('[FAIL] Darken white error:', e.message);
}

// Test 8: Multiply with pure red
try {
  const c = new Compositor();
  c.addObject('bg', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff' });
  c.setLayerEffect(0, { color: '#ff0000', type: 'multiply', strength: 1.0 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  const result = output.colors[0][0];
  console.log('[PASS] Multiply white with red:', result);
} catch (e) {
  console.log('[FAIL] Multiply red error:', e.message);
}

// Test 9: Influence with override color
try {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    color: '#0000ff',  // Blue object
    influence: {
      radius: 1,
      color: '#ff0000',  // Red influence
      transform: { type: 'lighten', strength: 1.0, falloff: 'linear' }
    }
  });
  const output = c.render({ x: 0, y: 0, width: 3, height: 1 });
  console.log('[PASS] Influence with override color works');
  console.log('  Center (blue object):', output.colors[0][1]);
  console.log('  Edge (red influence):', output.colors[0][0]);
} catch (e) {
  console.log('[FAIL] Influence color override error:', e.message);
}

// Test 10: Boundary color values (near 0x00 and 0xFF)
try {
  const c = new Compositor();
  c.addObject('obj1', { content: [['#']], position: { x: 0, y: 0 }, color: '#010101' });
  c.addObject('obj2', { content: [['@']], position: { x: 1, y: 0 }, color: '#fefefe' });
  const output = c.render({ x: 0, y: 0, width: 2, height: 1 });
  console.log('[PASS] Boundary color values work');
  console.log('  Near-black:', output.colors[0][0]);
  console.log('  Near-white:', output.colors[0][1]);
} catch (e) {
  console.log('[FAIL] Boundary colors error:', e.message);
}

// Test 11: Color interpolation precision
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#123456' });
  c.setLayerEffect(0, { color: '#abcdef', type: 'lighten', strength: 0.333333 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  console.log('[PASS] Color interpolation precision:', output.colors[0][0]);
} catch (e) {
  console.log('[FAIL] Color precision error:', e.message);
}

// Test 12: Lighten at 0% (no change)
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'lighten', strength: 0.0 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#ff0000') {
    console.log('[PASS] Lighten at 0% has no effect');
  } else {
    console.log('[BUG] Lighten 0% changed color to:', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Lighten 0% error:', e.message);
}

// Test 13: Lighten at 100% (full replacement)
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'lighten', strength: 1.0 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  console.log('[PASS] Lighten at 100%:', output.colors[0][0]);
} catch (e) {
  console.log('[FAIL] Lighten 100% error:', e.message);
}

// Test 14: Multiply-darken with various darkenFactors
try {
  const c1 = new Compositor();
  c1.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff' });
  c1.setLayerEffect(0, { color: '#ff0000', type: 'multiply-darken', strength: 1.0, darkenFactor: 0.5 });
  const out1 = c1.render({ x: 0, y: 0, width: 1, height: 1 });

  const c2 = new Compositor();
  c2.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff' });
  c2.setLayerEffect(0, { color: '#ff0000', type: 'multiply-darken', strength: 1.0, darkenFactor: 1.0 });
  const out2 = c2.render({ x: 0, y: 0, width: 1, height: 1 });

  console.log('[PASS] Multiply-darken with different darkenFactors');
  console.log('  darkenFactor=0.5:', out1.colors[0][0]);
  console.log('  darkenFactor=1.0:', out2.colors[0][0]);
} catch (e) {
  console.log('[FAIL] Multiply-darken error:', e.message);
}

// Test 15: Invalid darkenFactor on non-multiply-darken type
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'lighten', strength: 1.0, darkenFactor: 0.5 });
  console.log('[BUG] Should have thrown error for darkenFactor on lighten type');
} catch (e) {
  console.log('[PASS] Correctly rejects darkenFactor on non-multiply-darken:', e.message);
}

console.log('\nColor edge case testing complete!');
