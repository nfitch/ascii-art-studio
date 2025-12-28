import { Compositor } from '../dist/index.js';

console.log('Testing negative coordinates and viewports...\n');

// Test 1: Object at negative position
console.log('[TEST 1] Object at negative position');
const c1 = new Compositor();
c1.addObject('obj', {
  content: [['#', '@', '$']],
  position: { x: -5, y: -3 }
});
const out1 = c1.render({ x: -6, y: -4, width: 8, height: 6 });
console.log('  Viewport (-6, -4) to (2, 2):');
out1.characters.forEach(row => console.log('    ', row.join('')));

// Test 2: Viewport at negative coordinates viewing positive objects
console.log('\n[TEST 2] Negative viewport, positive objects');
const c2 = new Compositor();
c2.addObject('obj', {
  content: [['A', 'B', 'C']],
  position: { x: 5, y: 5 }
});
const out2 = c2.render({ x: -2, y: -2, width: 5, height: 5 });
console.log('  Result (should be all blank):');
out2.characters.forEach(row => console.log('    ', row.join('')));

// Test 3: Viewport and object both at negative coords
console.log('\n[TEST 3] Both viewport and object negative');
const c3 = new Compositor();
c3.addObject('obj', {
  content: [['X', 'Y', 'Z']],
  position: { x: -10, y: -10 }
});
const out3 = c3.render({ x: -11, y: -11, width: 5, height: 5 });
console.log('  Result:');
out3.characters.forEach(row => console.log('    ', row.join('')));

// Test 4: Object spanning across origin (negative to positive)
console.log('\n[TEST 4] Object spanning origin');
const c4 = new Compositor();
c4.addObject('cross-origin', {
  content: [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9']
  ],
  position: { x: -1, y: -1 }
});
const out4 = c4.render({ x: -2, y: -2, width: 5, height: 5 });
console.log('  Viewport (-2, -2) to (3, 3):');
out4.characters.forEach(row => console.log('    ', row.join('')));

// Test 5: Viewport partially overlapping object at negative coords
console.log('\n[TEST 5] Partial overlap with negative object');
const c5 = new Compositor();
c5.addObject('obj', {
  content: [['#', '#', '#', '#', '#']],
  position: { x: -3, y: 0 }
});
const out5 = c5.render({ x: -1, y: 0, width: 4, height: 1 });
console.log('  Result (should see last 2 chars): ', out5.characters[0].join(''));

// Test 6: Multiple objects at various negative coords
console.log('\n[TEST 6] Multiple objects at negative positions');
const c6 = new Compositor();
c6.addObject('obj1', {
  content: [['A']],
  position: { x: -5, y: -5 }
});
c6.addObject('obj2', {
  content: [['B']],
  position: { x: -2, y: -2 }
});
c6.addObject('obj3', {
  content: [['C']],
  position: { x: 1, y: 1 }
});
const out6 = c6.render({ x: -6, y: -6, width: 8, height: 8 });
console.log('  Result:');
out6.characters.forEach(row => console.log('    ', row.join('')));

// Test 7: Influence at negative coordinates
console.log('\n[TEST 7] Influence from object at negative coords');
const c7 = new Compositor();
c7.addObject('obj', {
  content: [['#']],
  position: { x: -5, y: 0 },
  color: '#ff0000',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
const out7 = c7.render({ x: -7, y: 0, width: 8, height: 1 });
console.log('  Result: ', out7.characters[0].join(''));
console.log('  Colors: ', out7.colors[0].map(c => c === '#000000' ? 'black' : 'tinted').join(' '));

// Test 8: Layer effects at negative coordinates
console.log('\n[TEST 8] Layer effects with negative viewport');
const c8 = new Compositor();
c8.addObject('obj', {
  content: [['X']],
  position: { x: -3, y: -3 },
  color: '#808080',
  layer: 0
});
c8.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.5 });
const out8 = c8.render({ x: -4, y: -4, width: 3, height: 3 });
console.log('  Result:');
out8.characters.forEach(row => console.log('    ', row.join('')));
console.log('  Object color:', out8.colors[1][1]);

// Test 9: getCanvasBounds with negative coordinates
console.log('\n[TEST 9] Canvas bounds with negative objects');
const c9 = new Compositor();
c9.addObject('neg', {
  content: [['#']],
  position: { x: -10, y: -5 }
});
c9.addObject('pos', {
  content: [['@']],
  position: { x: 10, y: 5 }
});
const bounds9 = c9.getCanvasBounds();
console.log('  Canvas bounds:', JSON.stringify(bounds9));

// Test 10: Moving object to/from negative coordinates
console.log('\n[TEST 10] Move object to negative coords');
const c10 = new Compositor();
c10.addObject('obj', {
  content: [['M']],
  position: { x: 0, y: 0 }
});
const before10 = c10.render({ x: -2, y: -2, width: 5, height: 5 });
c10.moveObject('obj', { x: -3, y: -3 });
const after10 = c10.render({ x: -4, y: -4, width: 5, height: 5 });
console.log('  Before move:');
before10.characters.forEach(row => console.log('    ', row.join('')));
console.log('  After move to (-3, -3):');
after10.characters.forEach(row => console.log('    ', row.join('')));

// Test 11: Very large negative coordinates
console.log('\n[TEST 11] Very large negative coordinates');
const c11 = new Compositor();
c11.addObject('obj', {
  content: [['!']],
  position: { x: -1000, y: -1000 }
});
const out11 = c11.render({ x: -1001, y: -1001, width: 3, height: 3 });
console.log('  Result:');
out11.characters.forEach(row => console.log('    ', row.join('')));

// Test 12: Negative and positive mixed viewport
console.log('\n[TEST 12] Viewport from negative to positive coords');
const c12 = new Compositor();
c12.addObject('left', {
  content: [['L']],
  position: { x: -2, y: 0 }
});
c12.addObject('center', {
  content: [['C']],
  position: { x: 0, y: 0 }
});
c12.addObject('right', {
  content: [['R']],
  position: { x: 2, y: 0 }
});
const out12 = c12.render({ x: -3, y: 0, width: 6, height: 1 });
console.log('  Result: ', out12.characters[0].join(''));

// Test 13: Influence spanning across origin
console.log('\n[TEST 13] Influence spanning across origin');
const c13 = new Compositor();
c13.addObject('obj', {
  content: [['*']],
  position: { x: -1, y: 0 },
  color: '#ffffff',
  influence: { radius: 3, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
const out13 = c13.render({ x: -4, y: 0, width: 7, height: 1 });
console.log('  Result: ', out13.characters[0].join(''));
console.log('  Influence pattern:');
for (let i = 0; i < 7; i++) {
  const worldX = -4 + i;
  const color = out13.colors[0][i];
  console.log(`    x=${worldX}: ${color}`);
}

console.log('\nNegative coordinate testing complete!');
