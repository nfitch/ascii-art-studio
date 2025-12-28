import { Compositor } from '../dist/index.js';

console.log('Testing edge cases...\n');

// Test 1: Empty content array
try {
  const c = new Compositor();
  c.addObject('empty', { content: [], position: { x: 0, y: 0 } });
  console.log('❌ FAIL: Empty content should throw error');
} catch (e) {
  console.log('✓ Empty content throws error:', e.message);
}

// Test 2: Content with empty rows
try {
  const c = new Compositor();
  c.addObject('empty-row', { content: [[]], position: { x: 0, y: 0 } });
  console.log('❌ FAIL: Empty row should throw error');
} catch (e) {
  console.log('✓ Empty row throws error:', e.message);
}

// Test 3: Negative viewport dimensions
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 } });
  c.render({ x: 0, y: 0, width: -5, height: 10 });
  console.log('❌ FAIL: Negative width should throw error');
} catch (e) {
  console.log('✓ Negative width throws error:', e.message);
}

// Test 4: Zero viewport dimensions
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 } });
  c.render({ x: 0, y: 0, width: 0, height: 10 });
  console.log('❌ FAIL: Zero width should throw error');
} catch (e) {
  console.log('✓ Zero width throws error:', e.message);
}

// Test 5: Invalid color format
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#GGGGGG' });
  console.log('❌ FAIL: Invalid hex color should throw error');
} catch (e) {
  console.log('✓ Invalid hex color throws error:', e.message);
}

// Test 6: Color with wrong length
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#FFF' });
  console.log('❌ FAIL: Short hex color should throw error');
} catch (e) {
  console.log('✓ Short hex color throws error:', e.message);
}

// Test 7: Non-integer layer
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, layer: 3.5 });
  console.log('❌ FAIL: Non-integer layer should throw error');
} catch (e) {
  console.log('✓ Non-integer layer throws error:', e.message);
}

// Test 8: Influence with radius 0
try {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    influence: { radius: 0, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
  });
  console.log('❌ FAIL: Radius 0 should throw error');
} catch (e) {
  console.log('✓ Radius 0 throws error:', e.message);
}

// Test 9: Influence with negative radius
try {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    influence: { radius: -2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
  });
  console.log('❌ FAIL: Negative radius should throw error');
} catch (e) {
  console.log('✓ Negative radius throws error:', e.message);
}

// Test 10: Influence strength > 1.0
try {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    influence: { radius: 2, transform: { type: 'lighten', strength: 1.5, falloff: 'linear' } }
  });
  console.log('❌ FAIL: Strength > 1.0 should throw error');
} catch (e) {
  console.log('✓ Strength > 1.0 throws error:', e.message);
}

// Test 11: Influence strength < 0
try {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    influence: { radius: 2, transform: { type: 'lighten', strength: -0.5, falloff: 'linear' } }
  });
  console.log('❌ FAIL: Negative strength should throw error');
} catch (e) {
  console.log('✓ Negative strength throws error:', e.message);
}

// Test 12: Duplicate object ID
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 } });
  c.addObject('obj', { content: [['@']], position: { x: 1, y: 1 } });
  console.log('❌ FAIL: Duplicate ID should throw error');
} catch (e) {
  console.log('✓ Duplicate ID throws error:', e.message);
}

// Test 13: Remove non-existent object
try {
  const c = new Compositor();
  c.removeObject('nonexistent');
  console.log('❌ FAIL: Remove non-existent should throw error');
} catch (e) {
  console.log('✓ Remove non-existent throws error:', e.message);
}

// Test 14: Move non-existent object
try {
  const c = new Compositor();
  c.moveObject('nonexistent', { x: 0, y: 0 });
  console.log('❌ FAIL: Move non-existent should throw error');
} catch (e) {
  console.log('✓ Move non-existent throws error:', e.message);
}

// Test 15: Very large coordinates (should work)
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 100000, y: 100000 } });
  const output = c.render({ x: 0, y: 0, width: 10, height: 10 });
  console.log('✓ Very large coordinates work (no crash)');
} catch (e) {
  console.log('❌ FAIL: Very large coordinates crashed:', e.message);
}

// Test 16: Negative coordinates (should work)
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: -5, y: -5 } });
  const output = c.render({ x: -10, y: -10, width: 20, height: 20 });
  console.log('✓ Negative coordinates work');
} catch (e) {
  console.log('❌ FAIL: Negative coordinates crashed:', e.message);
}

console.log('\nEdge case testing complete!');
