import { Compositor } from '../dist/index.js';

console.log('Testing complex influence overlaps...\n');

// Test 1: Two objects with overlapping influence (same layer)
console.log('[TEST 1] Two objects, same layer, overlapping influence');
const c1 = new Compositor();
c1.addObject('left', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c1.addObject('right', {
  content: [['@']],
  position: { x: 4, y: 0 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
const out1 = c1.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  Left object (0):     ', out1.colors[0][0]);
console.log('  Between (1):         ', out1.colors[0][1]);
console.log('  Middle (2):          ', out1.colors[0][2]);
console.log('  Between (3):         ', out1.colors[0][3]);
console.log('  Right object (4):    ', out1.colors[0][4]);

// Test 2: Three objects with influence in a line
console.log('\n[TEST 2] Three objects in a line, overlapping influence');
const c2 = new Compositor();
c2.addObject('a', {
  content: [['A']],
  position: { x: 0, y: 0 },
  color: '#ff0000',
  influence: { radius: 1, transform: { type: 'lighten', strength: 1.0, falloff: 'linear' } }
});
c2.addObject('b', {
  content: [['B']],
  position: { x: 2, y: 0 },
  color: '#00ff00',
  influence: { radius: 1, transform: { type: 'lighten', strength: 1.0, falloff: 'linear' } }
});
c2.addObject('c', {
  content: [['C']],
  position: { x: 4, y: 0 },
  color: '#0000ff',
  influence: { radius: 1, transform: { type: 'lighten', strength: 1.0, falloff: 'linear' } }
});
const out2 = c2.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  A (red):     ', out2.colors[0][0]);
console.log('  A-B gap:     ', out2.colors[0][1]);
console.log('  B (green):   ', out2.colors[0][2]);
console.log('  B-C gap:     ', out2.colors[0][3]);
console.log('  C (blue):    ', out2.colors[0][4]);

// Test 3: Overlapping influence with different strengths
console.log('\n[TEST 3] Overlapping influence with different strengths');
const c3 = new Compositor();
c3.addObject('weak', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: { radius: 3, transform: { type: 'lighten', strength: 0.2, falloff: 'linear' } }
});
c3.addObject('strong', {
  content: [['@']],
  position: { x: 6, y: 0 },
  color: '#ffffff',
  influence: { radius: 3, transform: { type: 'lighten', strength: 0.8, falloff: 'linear' } }
});
const out3 = c3.render({ x: 0, y: 0, width: 7, height: 1 });
console.log('  Weak object:    ', out3.colors[0][0]);
console.log('  Overlap middle: ', out3.colors[0][3]);
console.log('  Strong object:  ', out3.colors[0][6]);

// Test 4: Different falloff types overlapping
console.log('\n[TEST 4] Different falloff types overlapping');
const c4 = new Compositor();
c4.addObject('linear', {
  content: [['L']],
  position: { x: 0, y: 0 },
  color: '#ff0000',
  influence: { radius: 3, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c4.addObject('exponential', {
  content: [['E']],
  position: { x: 6, y: 0 },
  color: '#0000ff',
  influence: { radius: 3, transform: { type: 'lighten', strength: 0.5, falloff: 'exponential' } }
});
const out4 = c4.render({ x: 0, y: 0, width: 7, height: 1 });
console.log('  Linear:         ', out4.colors[0][0]);
console.log('  Overlap middle: ', out4.colors[0][3]);
console.log('  Exponential:    ', out4.colors[0][6]);

// Test 5: Influence from different layers overlapping
console.log('\n[TEST 5] Influence from different layers');
const c5 = new Compositor();
c5.addObject('bottom', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ff0000',
  layer: 0,
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c5.addObject('top', {
  content: [['@']],
  position: { x: 3, y: 0 },
  color: '#0000ff',
  layer: 1,
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
const out5 = c5.render({ x: 0, y: 0, width: 4, height: 1 });
console.log('  Bottom object:  ', out5.colors[0][0]);
console.log('  Overlap region: ', out5.colors[0][1]);
console.log('  Gap:            ', out5.colors[0][2]);
console.log('  Top object:     ', out5.colors[0][3]);

// Test 6: Many objects with small overlaps
console.log('\n[TEST 6] Five objects with small overlaps');
const c6 = new Compositor();
for (let i = 0; i < 5; i++) {
  c6.addObject(`obj${i}`, {
    content: [['#']],
    position: { x: i * 2, y: 0 },
    color: '#ffffff',
    influence: { radius: 1, transform: { type: 'lighten', strength: 0.3, falloff: 'linear' } }
  });
}
const out6 = c6.render({ x: 0, y: 0, width: 9, height: 1 });
for (let i = 0; i < 9; i++) {
  console.log(`  Position ${i}: ${out6.colors[0][i]}`);
}

// Test 7: Circular overlap pattern (2D)
console.log('\n[TEST 7] Four objects in square pattern, 2D overlap');
const c7 = new Compositor();
c7.addObject('tl', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c7.addObject('tr', {
  content: [['#']],
  position: { x: 3, y: 0 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c7.addObject('bl', {
  content: [['#']],
  position: { x: 0, y: 3 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c7.addObject('br', {
  content: [['#']],
  position: { x: 3, y: 3 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
const out7 = c7.render({ x: 0, y: 0, width: 4, height: 4 });
console.log('  Center (all 4 overlap): ', out7.colors[1][1]);
console.log('  Top-left:               ', out7.colors[0][0]);
console.log('  Top-right:              ', out7.colors[0][3]);
console.log('  Bottom-left:            ', out7.colors[3][0]);
console.log('  Bottom-right:           ', out7.colors[3][3]);

// Test 8: Mixed transform types overlapping (lighten + darken)
console.log('\n[TEST 8] Lighten and darken influence overlapping');
const c8 = new Compositor();
c8.addObject('light', {
  content: [['L']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
c8.addObject('dark', {
  content: [['D']],
  position: { x: 4, y: 0 },
  color: '#000000',
  influence: { radius: 2, transform: { type: 'darken', strength: 0.5, falloff: 'linear' } }
});
const out8 = c8.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  Lighten:        ', out8.colors[0][0]);
console.log('  Overlap middle: ', out8.colors[0][2]);
console.log('  Darken:         ', out8.colors[0][4]);

// Test 9: Multiply influence overlapping
console.log('\n[TEST 9] Two multiply influences overlapping');
const c9 = new Compositor();
c9.addObject('red', {
  content: [['R']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: {
    radius: 2,
    color: '#ff0000',
    transform: { type: 'multiply', strength: 1.0, falloff: 'linear' }
  }
});
c9.addObject('blue', {
  content: [['B']],
  position: { x: 4, y: 0 },
  color: '#ffffff',
  influence: {
    radius: 2,
    color: '#0000ff',
    transform: { type: 'multiply', strength: 1.0, falloff: 'linear' }
  }
});
const out9 = c9.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  Red influence:  ', out9.colors[0][0]);
console.log('  Overlap middle: ', out9.colors[0][2]);
console.log('  Blue influence: ', out9.colors[0][4]);

// Test 10: Dense overlap (many objects in small area)
console.log('\n[TEST 10] Dense packing (10 objects in 5x1 area)');
const c10 = new Compositor();
for (let i = 0; i < 10; i++) {
  c10.addObject(`dense${i}`, {
    content: [['#']],
    position: { x: i, y: 0 },
    color: '#ffffff',
    layer: i % 2,
    influence: { radius: 1, transform: { type: 'lighten', strength: 0.1, falloff: 'linear' } }
  });
}
const out10 = c10.render({ x: 0, y: 0, width: 10, height: 1 });
console.log('  First 5 positions:');
for (let i = 0; i < 5; i++) {
  console.log(`    Position ${i}: ${out10.colors[0][i]}`);
}

// Test 11: Influence with override colors overlapping
console.log('\n[TEST 11] Different influence colors overlapping');
const c11 = new Compositor();
c11.addObject('red-inf', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: {
    radius: 2,
    color: '#ff0000',
    transform: { type: 'lighten', strength: 0.5, falloff: 'linear' }
  }
});
c11.addObject('green-inf', {
  content: [['@']],
  position: { x: 4, y: 0 },
  color: '#ffffff',
  influence: {
    radius: 2,
    color: '#00ff00',
    transform: { type: 'lighten', strength: 0.5, falloff: 'linear' }
  }
});
const out11 = c11.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  Red influence:    ', out11.colors[0][0]);
console.log('  Overlap (yellow): ', out11.colors[0][2]);
console.log('  Green influence:  ', out11.colors[0][4]);

// Test 12: Glass pane overlaps (space with influence)
console.log('\n[TEST 12] Glass pane effects overlapping');
const c12 = new Compositor();
c12.addObject('bg', {
  content: [['#', '#', '#', '#', '#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  layer: 0
});
c12.addObject('glass1', {
  content: [[' ']],
  position: { x: 1, y: 0 },
  color: '#ff0000',
  layer: 1,
  influence: {
    radius: 1,
    color: '#ff0000',
    transform: { type: 'lighten', strength: 0.5, falloff: 'linear' }
  }
});
c12.addObject('glass2', {
  content: [[' ']],
  position: { x: 3, y: 0 },
  color: '#0000ff',
  layer: 1,
  influence: {
    radius: 1,
    color: '#0000ff',
    transform: { type: 'lighten', strength: 0.5, falloff: 'linear' }
  }
});
const out12 = c12.render({ x: 0, y: 0, width: 5, height: 1 });
console.log('  Background:      ', out12.colors[0][0]);
console.log('  Red glass:       ', out12.colors[0][1]);
console.log('  Both glass:      ', out12.colors[0][2]);
console.log('  Blue glass:      ', out12.colors[0][3]);
console.log('  Background:      ', out12.colors[0][4]);

console.log('\nInfluence overlap testing complete!');
