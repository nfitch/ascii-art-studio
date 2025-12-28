import { Compositor } from './dist/index.js';

console.log('Testing flip operations...\n');

// Test 1: Basic horizontal flip
console.log('[TEST 1] Basic horizontal flip');
const c1 = new Compositor();
c1.addObject('obj', {
  content: [['A', 'B', 'C']],
  position: { x: 0, y: 0 }
});
const before1 = c1.render({ x: 0, y: 0, width: 3, height: 1 });
c1.flipHorizontal('obj');
const after1 = c1.render({ x: 0, y: 0, width: 3, height: 1 });
console.log('  Before flip: ', before1.characters[0].join(''));
console.log('  After flip:  ', after1.characters[0].join(''));

// Test 2: Basic vertical flip
console.log('\n[TEST 2] Basic vertical flip');
const c2 = new Compositor();
c2.addObject('obj', {
  content: [['A'], ['B'], ['C']],
  position: { x: 0, y: 0 }
});
const before2 = c2.render({ x: 0, y: 0, width: 1, height: 3 });
c2.flipVertical('obj');
const after2 = c2.render({ x: 0, y: 0, width: 1, height: 3 });
console.log('  Before flip: ', before2.characters.map(r => r[0]).join(''));
console.log('  After flip:  ', after2.characters.map(r => r[0]).join(''));

// Test 3: Double flip (horizontal then vertical)
console.log('\n[TEST 3] Double flip');
const c3 = new Compositor();
c3.addObject('obj', {
  content: [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9']
  ],
  position: { x: 0, y: 0 }
});
const orig = c3.render({ x: 0, y: 0, width: 3, height: 3 });
c3.flipHorizontal('obj');
const h = c3.render({ x: 0, y: 0, width: 3, height: 3 });
c3.flipVertical('obj');
const hv = c3.render({ x: 0, y: 0, width: 3, height: 3 });
console.log('  Original:');
orig.characters.forEach(row => console.log('    ', row.join('')));
console.log('  Horizontal flip:');
h.characters.forEach(row => console.log('    ', row.join('')));
console.log('  H + V flip:');
hv.characters.forEach(row => console.log('    ', row.join('')));

// Test 4: Flip with transparency (nulls)
console.log('\n[TEST 4] Flip with null (transparency)');
const c4 = new Compositor();
c4.addObject('obj', {
  content: [['#', null, '@']],
  position: { x: 0, y: 0 }
});
const before4 = c4.render({ x: 0, y: 0, width: 3, height: 1 });
c4.flipHorizontal('obj');
const after4 = c4.render({ x: 0, y: 0, width: 3, height: 1 });
console.log('  Before: ', before4.characters[0].join(','));
console.log('  After:  ', after4.characters[0].join(','));

// Test 5: Flip with influence
console.log('\n[TEST 5] Flip with influence');
const c5 = new Compositor();
c5.addObject('obj', {
  content: [['#', '@']],
  position: { x: 0, y: 0 },
  color: '#ff0000',
  influence: { radius: 1, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } }
});
const before5 = c5.render({ x: 0, y: 0, width: 4, height: 2 });
c5.flipHorizontal('obj');
const after5 = c5.render({ x: 0, y: 0, width: 4, height: 2 });
console.log('  Before flip:');
before5.characters.forEach(row => console.log('    ', row.join('')));
console.log('  After flip:');
after5.characters.forEach(row => console.log('    ', row.join('')));

// Test 6: Flip back and forth (toggle)
console.log('\n[TEST 6] Flip toggle (3 times)');
const c6 = new Compositor();
c6.addObject('obj', {
  content: [['L', 'R']],
  position: { x: 0, y: 0 }
});
const flip0 = c6.render({ x: 0, y: 0, width: 2, height: 1 });
c6.flipHorizontal('obj');
const flip1 = c6.render({ x: 0, y: 0, width: 2, height: 1 });
c6.flipHorizontal('obj');
const flip2 = c6.render({ x: 0, y: 0, width: 2, height: 1 });
c6.flipHorizontal('obj');
const flip3 = c6.render({ x: 0, y: 0, width: 2, height: 1 });
console.log('  Flip 0: ', flip0.characters[0].join(''));
console.log('  Flip 1: ', flip1.characters[0].join(''));
console.log('  Flip 2: ', flip2.characters[0].join(''));
console.log('  Flip 3: ', flip3.characters[0].join(''));

// Test 7: Flip asymmetric shape
console.log('\n[TEST 7] Flip asymmetric shape');
const c7 = new Compositor();
c7.addObject('arrow', {
  content: [
    [' ', ' ', '>', ' '],
    [' ', '>', '>', '>'],
    ['>', '>', '>', '>'],
    [' ', '>', '>', '>'],
    [' ', ' ', '>', ' ']
  ],
  position: { x: 0, y: 0 }
});
const arrow_orig = c7.render({ x: 0, y: 0, width: 4, height: 5 });
c7.flipHorizontal('arrow');
const arrow_flip = c7.render({ x: 0, y: 0, width: 4, height: 5 });
console.log('  Original:');
arrow_orig.characters.forEach(row => console.log('    ', row.join('')));
console.log('  Flipped:');
arrow_flip.characters.forEach(row => console.log('    ', row.join('')));

// Test 8: Flip with autoDetectEdges
console.log('\n[TEST 8] Flip with autoDetectEdges');
const c8 = new Compositor();
c8.addObject('obj', {
  content: [['  #  '], [' ### '], ['#####']],
  position: { x: 0, y: 0 },
  autoDetectEdges: true
});
const auto_before = c8.render({ x: 0, y: 0, width: 5, height: 3 });
c8.flipVertical('obj');
const auto_after = c8.render({ x: 0, y: 0, width: 5, height: 3 });
console.log('  Before vertical flip:');
auto_before.characters.forEach(row => console.log('    ', row.join('')));
console.log('  After vertical flip:');
auto_after.characters.forEach(row => console.log('    ', row.join('')));

// Test 9: Flip single character
console.log('\n[TEST 9] Flip single character (no-op)');
const c9 = new Compositor();
c9.addObject('dot', {
  content: [['*']],
  position: { x: 0, y: 0 }
});
const dot_before = c9.render({ x: 0, y: 0, width: 1, height: 1 });
c9.flipHorizontal('dot');
const dot_h = c9.render({ x: 0, y: 0, width: 1, height: 1 });
c9.flipVertical('dot');
const dot_hv = c9.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Original:   ', dot_before.characters[0][0]);
console.log('  H flip:     ', dot_h.characters[0][0]);
console.log('  H+V flip:   ', dot_hv.characters[0][0]);

// Test 10: Flip with colors
console.log('\n[TEST 10] Flip preserves colors');
const c10 = new Compositor();
c10.addObject('obj', {
  content: [['R', 'G', 'B']],
  position: { x: 0, y: 0 },
  color: '#ff00ff'
});
const col_before = c10.render({ x: 0, y: 0, width: 3, height: 1 });
c10.flipHorizontal('obj');
const col_after = c10.render({ x: 0, y: 0, width: 3, height: 1 });
console.log('  Before chars: ', col_before.characters[0].join(''));
console.log('  Before color: ', col_before.colors[0][0]);
console.log('  After chars:  ', col_after.characters[0].join(''));
console.log('  After color:  ', col_after.colors[0][0]);

// Test 11: Flip wide vs tall shapes
console.log('\n[TEST 11] Flip wide and tall shapes');
const c11 = new Compositor();
c11.addObject('wide', {
  content: [['#', '#', '#', '#', '#', '#']],
  position: { x: 0, y: 0 }
});
c11.addObject('tall', {
  content: [['|'], ['|'], ['|'], ['|'], ['|'], ['|']],
  position: { x: 0, y: 2 }
});
const wt_before = c11.render({ x: 0, y: 0, width: 6, height: 8 });
c11.flipHorizontal('wide');
c11.flipVertical('tall');
const wt_after = c11.render({ x: 0, y: 0, width: 6, height: 8 });
console.log('  Wide before: ', wt_before.characters[0].join(''));
console.log('  Wide after:  ', wt_after.characters[0].join(''));
console.log('  Tall before: ', wt_before.characters.slice(2).map(r => r[0]).join(''));
console.log('  Tall after:  ', wt_after.characters.slice(2).map(r => r[0]).join(''));

// Test 12: SetFlip methods
console.log('\n[TEST 12] setFlipHorizontal and setFlipVertical');
const c12 = new Compositor();
c12.addObject('obj', {
  content: [['A', 'B'], ['C', 'D']],
  position: { x: 0, y: 0 }
});
c12.setFlipHorizontal('obj', true);
const set_h = c12.render({ x: 0, y: 0, width: 2, height: 2 });
c12.setFlipHorizontal('obj', false);
const set_normal = c12.render({ x: 0, y: 0, width: 2, height: 2 });
c12.setFlipVertical('obj', true);
const set_v = c12.render({ x: 0, y: 0, width: 2, height: 2 });
console.log('  H flip set:');
set_h.characters.forEach(row => console.log('    ', row.join('')));
console.log('  Normal (H unset):');
set_normal.characters.forEach(row => console.log('    ', row.join('')));
console.log('  V flip set:');
set_v.characters.forEach(row => console.log('    ', row.join('')));

console.log('\nFlip operations testing complete!');
