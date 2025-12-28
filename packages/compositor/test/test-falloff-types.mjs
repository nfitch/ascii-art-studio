import { Compositor } from '../dist/index.js';

console.log('Testing all falloff types at various distances...\n');

// Helper to test falloff at specific distances
function testFalloff(falloffType, radius, distance) {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    color: '#ffffff',
    influence: {
      radius,
      transform: { type: 'lighten', strength: 1.0, falloff: falloffType }
    }
  });
  // Object at (0,0), test at (distance, 0)
  const output = c.render({ x: 0, y: 0, width: radius * 2 + 1, height: 1 });
  return output.colors[0][distance];
}

// Test 1: Linear falloff at various distances
console.log('[TEST] Linear falloff with radius=5');
for (let d = 0; d <= 5; d++) {
  const color = testFalloff('linear', 5, d);
  console.log(`  distance ${d}: ${color}`);
}

// Test 2: Quadratic falloff at various distances
console.log('\n[TEST] Quadratic falloff with radius=5');
for (let d = 0; d <= 5; d++) {
  const color = testFalloff('quadratic', 5, d);
  console.log(`  distance ${d}: ${color}`);
}

// Test 3: Exponential falloff at various distances
console.log('\n[TEST] Exponential falloff with radius=5');
for (let d = 0; d <= 5; d++) {
  const color = testFalloff('exponential', 5, d);
  console.log(`  distance ${d}: ${color}`);
}

// Test 4: Cubic falloff at various distances
console.log('\n[TEST] Cubic falloff with radius=5');
for (let d = 0; d <= 5; d++) {
  const color = testFalloff('cubic', 5, d);
  console.log(`  distance ${d}: ${color}`);
}

// Test 5: Compare all falloff types at distance=2, radius=5
console.log('\n[TEST] All falloff types at distance=2, radius=5');
console.log('  Linear:      ', testFalloff('linear', 5, 2));
console.log('  Quadratic:   ', testFalloff('quadratic', 5, 2));
console.log('  Exponential: ', testFalloff('exponential', 5, 2));
console.log('  Cubic:       ', testFalloff('cubic', 5, 2));

// Test 6: Falloff at exact radius boundary
console.log('\n[TEST] Falloff at exact radius boundary (radius=3)');
console.log('  Linear at d=3:      ', testFalloff('linear', 3, 3));
console.log('  Quadratic at d=3:   ', testFalloff('quadratic', 3, 3));
console.log('  Exponential at d=3: ', testFalloff('exponential', 3, 3));
console.log('  Cubic at d=3:       ', testFalloff('cubic', 3, 3));

// Test 7: Falloff just inside boundary
console.log('\n[TEST] Falloff just inside boundary (d=2, radius=3)');
console.log('  Linear:      ', testFalloff('linear', 3, 2));
console.log('  Quadratic:   ', testFalloff('quadratic', 3, 2));
console.log('  Exponential: ', testFalloff('exponential', 3, 2));
console.log('  Cubic:       ', testFalloff('cubic', 3, 2));

// Test 8: Falloff at center (distance=0)
console.log('\n[TEST] All falloff types at center (distance=0)');
const c = new Compositor();
c.addObject('obj', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ff0000',
  influence: {
    radius: 3,
    transform: { type: 'lighten', strength: 1.0, falloff: 'linear' }
  }
});
const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Center color (should be object color): ', output.colors[0][0]);

// Test 9: Diagonal distance falloff
console.log('\n[TEST] Diagonal distance falloff (radius=3)');
const c2 = new Compositor();
c2.addObject('obj', {
  content: [['#']],
  position: { x: 0, y: 0 },
  color: '#ffffff',
  influence: {
    radius: 3,
    transform: { type: 'lighten', strength: 1.0, falloff: 'linear' }
  }
});
const output2 = c2.render({ x: 0, y: 0, width: 4, height: 4 });
console.log('  (0,0) center:           ', output2.colors[0][0]);
console.log('  (1,0) horizontal:       ', output2.colors[0][1]);
console.log('  (0,1) vertical:         ', output2.colors[1][0]);
console.log('  (1,1) diagonal:         ', output2.colors[1][1]);
console.log('  (2,2) far diagonal:     ', output2.colors[2][2]);

// Test 10: Very small radius (radius=1)
console.log('\n[TEST] Very small radius (radius=1)');
console.log('  Linear d=0:      ', testFalloff('linear', 1, 0));
console.log('  Linear d=1:      ', testFalloff('linear', 1, 1));
console.log('  Quadratic d=0:   ', testFalloff('quadratic', 1, 0));
console.log('  Quadratic d=1:   ', testFalloff('quadratic', 1, 1));

// Test 11: Large radius (radius=10)
console.log('\n[TEST] Large radius (radius=10) at midpoint');
console.log('  Linear d=5:      ', testFalloff('linear', 10, 5));
console.log('  Quadratic d=5:   ', testFalloff('quadratic', 10, 5));
console.log('  Exponential d=5: ', testFalloff('exponential', 10, 5));
console.log('  Cubic d=5:       ', testFalloff('cubic', 10, 5));

// Test 12: Strength variations with falloff
console.log('\n[TEST] Falloff with different strength values (radius=3, d=1)');
for (let strength of [0.0, 0.25, 0.5, 0.75, 1.0]) {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    color: '#ffffff',
    influence: {
      radius: 3,
      transform: { type: 'lighten', strength, falloff: 'linear' }
    }
  });
  const output = c.render({ x: 0, y: 0, width: 2, height: 1 });
  console.log(`  strength=${strength.toFixed(2)}: ${output.colors[0][1]}`);
}

console.log('\nFalloff type testing complete!');
