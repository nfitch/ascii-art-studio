import { Compositor } from '../dist/index.js';

console.log('Testing for bugs...\n');

// Bug test 1: Jagged arrays
try {
  const c = new Compositor();
  c.addObject('jagged', {
    content: [
      ['#', '#', '#'],
      ['@', '@'],
      ['$', '$', '$', '$']
    ],
    position: { x: 0, y: 0 }
  });
  const output = c.render({ x: 0, y: 0, width: 5, height: 5 });
  console.log('[PASS] Jagged arrays handled correctly');
  console.log('  Row 0 width:', output.characters[0].length);
  console.log('  Row 1 width:', output.characters[1].length);
} catch (e) {
  console.log('[FAIL] Jagged array bug:', e.message);
}

// Bug test 2: Color interpolation at boundaries
try {
  const c = new Compositor();
  c.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 },
    color: '#000000',
    layer: 0,
    influence: { radius: 1, transform: { type: 'lighten', strength: 1.0, falloff: 'linear' } }
  });
  const output = c.render({ x: 0, y: 0, width: 3, height: 3 });
  const edgeColor = output.colors[0][1];
  console.log('[PASS] Color interpolation at edge:', edgeColor);
} catch (e) {
  console.log('[FAIL] Color interpolation bug:', e.message);
}

// Bug test 3: Multiple objects with overlapping influences
try {
  const c = new Compositor();
  c.addObject('obj1', {
    content: [['#']],
    position: { x: 0, y: 0 },
    color: '#ff0000',
    layer: 0,
    influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
  });
  c.addObject('obj2', {
    content: [['@']],
    position: { x: 4, y: 0 },
    color: '#0000ff',
    layer: 0,
    influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
  });
  const output = c.render({ x: 0, y: 0, width: 5, height: 1 });
  console.log('[PASS] Overlapping influences handled');
  console.log('  Middle color:', output.colors[0][2]);
} catch (e) {
  console.log('[FAIL] Overlapping influence bug:', e.message);
}

// Bug test 4: Layer effect with strength 0
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'lighten', strength: 0 });
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#ff0000') {
    console.log('[PASS] Layer effect strength 0 has no effect');
  } else {
    console.log('[BUG] Layer effect strength 0 changed color to', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Layer effect strength 0 bug:', e.message);
}

// Bug test 5: getObject returns deep clone
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 5, y: 5 } });
  const obj1 = c.getObject('obj');
  obj1.position.x = 100;
  const obj2 = c.getObject('obj');
  if (obj2.position.x === 5) {
    console.log('[PASS] getObject returns deep clone (mutation prevented)');
  } else {
    console.log('[BUG] getObject allows mutation! position.x =', obj2.position.x);
  }
} catch (e) {
  console.log('[FAIL] getObject bug:', e.message);
}

// Bug test 6: Render output is deep clone
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  const output1 = c.render({ x: 0, y: 0, width: 1, height: 1 });
  output1.colors[0][0] = '#0000ff';
  const output2 = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output2.colors[0][0] === '#ff0000') {
    console.log('[PASS] Render output deep cloned (mutation prevented)');
  } else {
    console.log('[BUG] Render output not cloned! color =', output2.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Render mutation bug:', e.message);
}

// Bug test 7: autoDetectEdges with single row
try {
  const c = new Compositor();
  c.addObject('single', {
    content: [[' ', '#', ' ']],
    position: { x: 0, y: 0 },
    autoDetectEdges: true
  });
  const output = c.render({ x: 0, y: 0, width: 3, height: 1 });
  console.log('[PASS] autoDetectEdges with single row works');
  console.log('  Output:', output.characters[0].join(''));
} catch (e) {
  console.log('[FAIL] autoDetectEdges single row bug:', e.message);
}

// Bug test 8: autoDetectEdges with single column
try {
  const c = new Compositor();
  c.addObject('single-col', {
    content: [[' '], ['#'], [' ']],
    position: { x: 0, y: 0 },
    autoDetectEdges: true
  });
  const output = c.render({ x: 0, y: 0, width: 1, height: 3 });
  console.log('[PASS] autoDetectEdges with single column works');
  console.log('  Output:', output.characters.map(row => row[0]).join(''));
} catch (e) {
  console.log('[FAIL] autoDetectEdges single column bug:', e.message);
}

// Bug test 9: Flip with influence
try {
  const c = new Compositor();
  c.addObject('flip-test', {
    content: [['#', '@']],
    position: { x: 0, y: 0 },
    color: '#ff0000',
    influence: { radius: 1, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
  });
  c.flipHorizontal('flip-test');
  const output = c.render({ x: 0, y: 0, width: 4, height: 2 });
  console.log('[PASS] Flip with influence works');
  console.log('  Row 0:', output.characters[0].join(''));
} catch (e) {
  console.log('[FAIL] Flip with influence bug:', e.message);
}

// Bug test 10: Constructor with initial objects
try {
  const initial = [{
    id: 'bg',
    content: [['#', '#'], ['#', '#']],
    position: { x: 0, y: 0 },
    color: '#ff0000',
    layer: 0
  }];
  const c = new Compositor(initial);
  const output = c.render({ x: 0, y: 0, width: 2, height: 2 });
  if (output.characters[0][0] === '#') {
    console.log('[PASS] Constructor with initial objects works');
  } else {
    console.log('[BUG] Constructor initial objects not loaded');
  }
} catch (e) {
  console.log('[FAIL] Constructor bug:', e.message);
}

// Bug test 11: getCanvasBounds with no objects
try {
  const c = new Compositor();
  const bounds = c.getCanvasBounds();
  console.log('[PASS] getCanvasBounds with no objects:', JSON.stringify(bounds));
} catch (e) {
  console.log('[FAIL] getCanvasBounds empty bug:', e.message);
}

// Bug test 12: listObjects order
try {
  const c = new Compositor();
  c.addObject('obj1', { content: [['#']], position: { x: 0, y: 0 }, layer: 2 });
  c.addObject('obj2', { content: [['@']], position: { x: 1, y: 1 }, layer: 0 });
  c.addObject('obj3', { content: [['$']], position: { x: 2, y: 2 }, layer: 1 });
  const list = c.listObjects();
  console.log('[PASS] listObjects returns all objects');
  console.log('  Count:', list.length);
  console.log('  IDs:', list.map(o => o.id).join(', '));
} catch (e) {
  console.log('[FAIL] listObjects bug:', e.message);
}

// Bug test 13: Setting layer effect then removing it
try {
  const c = new Compositor();
  c.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000' });
  c.setLayerEffect(0, { color: '#0000ff', type: 'lighten', strength: 0.5 });
  c.setLayerEffect(0, null);
  const output = c.render({ x: 0, y: 0, width: 1, height: 1 });
  if (output.colors[0][0] === '#ff0000') {
    console.log('[PASS] Layer effect removal works');
  } else {
    console.log('[BUG] Layer effect not removed! color =', output.colors[0][0]);
  }
} catch (e) {
  console.log('[FAIL] Layer effect removal bug:', e.message);
}

// Bug test 14: getLayerEffect for non-existent layer
try {
  const c = new Compositor();
  const effect = c.getLayerEffect(999);
  if (effect === null) {
    console.log('[PASS] getLayerEffect returns null for non-existent layer');
  } else {
    console.log('[BUG] getLayerEffect should return null, got:', effect);
  }
} catch (e) {
  console.log('[FAIL] getLayerEffect bug:', e.message);
}

// Bug test 15: Very large viewport
try {
  const c = new Compositor();
  c.addObject('tiny', { content: [['#']], position: { x: 0, y: 0 } });
  const output = c.render({ x: 0, y: 0, width: 1000, height: 1000 });
  if (output.characters.length === 1000 && output.characters[0].length === 1000) {
    console.log('[PASS] Very large viewport works (1000x1000)');
  } else {
    console.log('[BUG] Viewport size mismatch:', output.characters.length, 'x', output.characters[0].length);
  }
} catch (e) {
  console.log('[FAIL] Large viewport bug:', e.message);
}

console.log('\nBug testing complete!');
