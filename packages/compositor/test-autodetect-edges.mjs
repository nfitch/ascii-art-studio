import { Compositor } from './dist/index.js';

console.log('Testing autoDetectEdges edge cases...\n');

// Test 1: Simple box with spaces around edges
console.log('[TEST 1] Simple box with edge spaces');
const c1 = new Compositor();
c1.addObject('box', {
  content: [
    ['  ', '  ', '  ', '  ', '  '],
    ['  ', '#', '#', '#', '  '],
    ['  ', '#', ' ', '#', '  '],
    ['  ', '#', '#', '#', '  '],
    ['  ', '  ', '  ', '  ', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out1 = c1.render({ x: 0, y: 0, width: 5, height: 5 });
console.log('  Result:');
out1.characters.forEach(row => console.log('    ', row.join('')));

// Test 2: Concave shape (C-shape)
console.log('\n[TEST 2] Concave C-shape');
const c2 = new Compositor();
c2.addObject('c-shape', {
  content: [
    ['  ', '  ', '  ', '  ', '  '],
    ['  ', '#', '#', '#', '  '],
    ['  ', '#', ' ', ' ', '  '],
    ['  ', '#', ' ', ' ', '  '],
    ['  ', '#', '#', '#', '  '],
    ['  ', '  ', '  ', '  ', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out2 = c2.render({ x: 0, y: 0, width: 5, height: 6 });
console.log('  Result:');
out2.characters.forEach(row => console.log('    ', row.join('')));

// Test 3: Donut shape (hole in middle)
console.log('\n[TEST 3] Donut with trapped space in middle');
const c3 = new Compositor();
c3.addObject('donut', {
  content: [
    ['  ', '  ', '  ', '  ', '  '],
    ['  ', '#', '#', '#', '  '],
    ['  ', '#', ' ', '#', '  '],
    ['  ', '#', '#', '#', '  '],
    ['  ', '  ', '  ', '  ', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out3 = c3.render({ x: 0, y: 0, width: 5, height: 5 });
console.log('  Result (middle space should be visible):');
out3.characters.forEach(row => console.log('    ', row.join('')));

// Test 4: All spaces (should become fully transparent)
console.log('\n[TEST 4] All spaces (fully transparent)');
const c4 = new Compositor();
c4.addObject('invisible', {
  content: [
    ['  ', '  ', '  '],
    ['  ', '  ', '  '],
    ['  ', '  ', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true,
  color: '#ff0000'
});
const out4 = c4.render({ x: 0, y: 0, width: 3, height: 3 });
console.log('  Result (all spaces):');
out4.characters.forEach(row => console.log('    ', row.join('')));

// Test 5: Single row with spaces
console.log('\n[TEST 5] Single row with edge spaces');
const c5 = new Compositor();
c5.addObject('row', {
  content: [['  ', '#', '#', '#', '  ']],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out5 = c5.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  Result: ', out5.characters[0].join(''));

// Test 6: Single column with spaces
console.log('\n[TEST 6] Single column with edge spaces');
const c6 = new Compositor();
c6.addObject('col', {
  content: [['  '], ['#'], ['#'], ['#'], ['  ']],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out6 = c6.render({ x: 0, y: 0, width: 1, height: 5 });
console.log('  Result: ', out6.characters.map(r => r[0]).join(''));

// Test 7: Diagonal line
console.log('\n[TEST 7] Diagonal line in grid');
const c7 = new Compositor();
c7.addObject('diag', {
  content: [
    ['#', ' ', ' ', ' '],
    [' ', '#', ' ', ' '],
    [' ', ' ', '#', ' '],
    [' ', ' ', ' ', '#']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out7 = c7.render({ x: 0, y: 0, width: 4, height: 4 });
console.log('  Result:');
out7.characters.forEach(row => console.log('    ', row.join('')));

// Test 8: Complex maze-like shape
console.log('\n[TEST 8] Maze pattern');
const c8 = new Compositor();
c8.addObject('maze', {
  content: [
    ['  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '#', '#', '#', ' ', '#', '  '],
    ['  ', '#', ' ', ' ', ' ', '#', '  '],
    ['  ', '#', '#', '#', '#', '#', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out8 = c8.render({ x: 0, y: 0, width: 7, height: 5 });
console.log('  Result:');
out8.characters.forEach(row => console.log('    ', row.join('')));

// Test 9: Spaces only on some edges
console.log('\n[TEST 9] Spaces on top/bottom edges only');
const c9 = new Compositor();
c9.addObject('obj', {
  content: [
    ['  ', '  ', '  '],
    ['#', '#', '#'],
    ['#', '#', '#'],
    ['  ', '  ', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out9 = c9.render({ x: 0, y: 0, width: 3, height: 4 });
console.log('  Result:');
out9.characters.forEach(row => console.log('    ', row.join('')));

// Test 10: Spaces on left/right edges only
console.log('\n[TEST 10] Spaces on left/right edges only');
const c10 = new Compositor();
c10.addObject('obj', {
  content: [
    ['  ', '#', '  '],
    ['  ', '#', '  '],
    ['  ', '#', '  ']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out10 = c10.render({ x: 0, y: 0, width: 3, height: 3 });
console.log('  Result:');
out10.characters.forEach(row => console.log('    ', row.join('')));

// Test 11: No spaces (all content)
console.log('\n[TEST 11] No spaces (autoDetect has no effect)');
const c11 = new Compositor();
c11.addObject('solid', {
  content: [
    ['#', '#', '#'],
    ['#', '#', '#'],
    ['#', '#', '#']
  ],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const out11 = c11.render({ x: 0, y: 0, width: 3, height: 3 });
console.log('  Result:');
out11.characters.forEach(row => console.log('    ', row.join('')));

// Test 12: AutoDetect with influence
console.log('\n[TEST 12] AutoDetect with influence (invisible effect zone)');
const c12 = new Compositor();
c12.addObject('bg', {
  content: [['#', '#', '#', '#', '#', '#', '#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  layer: 0
});
c12.addObject('zone', {
  content: [
    ['  ', '  ', '  ', '  ', '  '],
    ['  ', ' ', ' ', ' ', '  '],
    ['  ', '  ', '  ', '  ', '  ']
  ],
  position: { x: 1, y: 1 },
  color: '#ff0000',
  layer: 1,
  autoDetectEdges: true,
  influence: {
    radius: 1,
    color: '#ff0000',
    transform: { type: 'lighten', strength: 0.5, falloff: 'linear' }
  }
});
const out12 = c12.render({ x: 0, y: 0, width: 7, height: 3 });
console.log('  Result (should see red influence on background):');
out12.characters.forEach(row => console.log('    ', row.join('')));
console.log('  Colors (should show red tint in middle):');
console.log('    Row 0:', out12.colors[0].slice(0, 7).join(', '));
console.log('    Row 1:', out12.colors[1].slice(0, 7).join(', '));
console.log('    Row 2:', out12.colors[2].slice(0, 7).join(', '));

console.log('\nAutoDetectEdges testing complete!');
