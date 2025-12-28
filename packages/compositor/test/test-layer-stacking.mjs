import { Compositor } from '../dist/index.js';

console.log('Testing layer effects stacking...\n');

// Test 1: Two layer effects stacking (lighten then darken)
console.log('[TEST 1] Two layer effects: lighten then darken');
const c1 = new Compositor();
c1.addObject('obj1', { content: [['#']], position: { x: 0, y: 0 }, color: '#808080', layer: 0 });
c1.addObject('obj2', { content: [['@']], position: { x: 1, y: 0 }, color: '#404040', layer: 1 });
c1.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.5 });
c1.setLayerEffect(1, { color: '#000000', type: 'darken', strength: 0.5 });
const out1 = c1.render({ x: 0, y: 0, width: 2, height: 1 });
console.log('  Layer 0 object (lightened):       ', out1.colors[0][0]);
console.log('  Layer 1 object (lightened+darkened):', out1.colors[0][1]);

// Test 2: Three layers with effects
console.log('\n[TEST 2] Three layers with different effects');
const c2 = new Compositor();
c2.addObject('bg', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000', layer: 0 });
c2.addObject('mid', { content: [['@']], position: { x: 0, y: 0 }, color: '#00ff00', layer: 1 });
c2.addObject('top', { content: [['$']], position: { x: 0, y: 0 }, color: '#0000ff', layer: 2 });
c2.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.3 });
c2.setLayerEffect(1, { color: '#ff00ff', type: 'multiply', strength: 0.5 });
c2.setLayerEffect(2, { color: '#00ffff', type: 'lighten', strength: 0.2 });
const out2 = c2.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Top object (all effects applied): ', out2.colors[0][0]);

// Test 3: Layer effects on background (no content)
console.log('\n[TEST 3] Layer effects on background cells (no content)');
const c3 = new Compositor();
c3.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff', layer: 0 });
c3.setLayerEffect(0, { color: '#ff0000', type: 'lighten', strength: 0.5 });
c3.setLayerEffect(1, { color: '#00ff00', type: 'lighten', strength: 0.5 });
const out3 = c3.render({ x: 0, y: 0, width: 2, height: 1 });
console.log('  Content cell (layer 0 effect):     ', out3.colors[0][0]);
console.log('  Background cell (both effects):    ', out3.colors[0][1]);

// Test 4: Same effect type on multiple layers
console.log('\n[TEST 4] Same effect type (lighten) on multiple layers');
const c4 = new Compositor();
c4.addObject('obj1', { content: [['#']], position: { x: 0, y: 0 }, color: '#000000', layer: 0 });
c4.addObject('obj2', { content: [['@']], position: { x: 1, y: 0 }, color: '#000000', layer: 1 });
c4.addObject('obj3', { content: [['$']], position: { x: 2, y: 0 }, color: '#000000', layer: 2 });
c4.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.33 });
c4.setLayerEffect(1, { color: '#ffffff', type: 'lighten', strength: 0.33 });
c4.setLayerEffect(2, { color: '#ffffff', type: 'lighten', strength: 0.33 });
const out4 = c4.render({ x: 0, y: 0, width: 3, height: 1 });
console.log('  Layer 0 (1x lighten):  ', out4.colors[0][0]);
console.log('  Layer 1 (2x lighten):  ', out4.colors[0][1]);
console.log('  Layer 2 (3x lighten):  ', out4.colors[0][2]);

// Test 5: Mixed transform types (multiply and lighten)
console.log('\n[TEST 5] Mixed transform types');
const c5 = new Compositor();
c5.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff', layer: 1 });
c5.setLayerEffect(0, { color: '#ff0000', type: 'multiply', strength: 1.0 });
c5.setLayerEffect(1, { color: '#0000ff', type: 'lighten', strength: 0.5 });
const out5 = c5.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Object with multiply then lighten: ', out5.colors[0][0]);

// Test 6: Layer effects with different strengths
console.log('\n[TEST 6] Layer effects with varying strengths');
const c6 = new Compositor();
c6.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#808080', layer: 2 });
c6.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.2 });
c6.setLayerEffect(1, { color: '#ffffff', type: 'lighten', strength: 0.5 });
c6.setLayerEffect(2, { color: '#ffffff', type: 'lighten', strength: 0.8 });
const out6 = c6.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Object (all three effects):        ', out6.colors[0][0]);

// Test 7: Multiply-darken on multiple layers
console.log('\n[TEST 7] Multiply-darken stacking');
const c7 = new Compositor();
c7.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ffffff', layer: 1 });
c7.setLayerEffect(0, { color: '#ff0000', type: 'multiply-darken', strength: 1.0, darkenFactor: 0.5 });
c7.setLayerEffect(1, { color: '#00ff00', type: 'multiply-darken', strength: 1.0, darkenFactor: 0.5 });
const out7 = c7.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Object with 2x multiply-darken:    ', out7.colors[0][0]);

// Test 8: Effect on middle layer only
console.log('\n[TEST 8] Effect on middle layer only');
const c8 = new Compositor();
c8.addObject('bottom', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000', layer: 0 });
c8.addObject('middle', { content: [['@']], position: { x: 0, y: 0 }, color: '#00ff00', layer: 1 });
c8.addObject('top', { content: [['$']], position: { x: 0, y: 0 }, color: '#0000ff', layer: 2 });
c8.setLayerEffect(1, { color: '#ffffff', type: 'lighten', strength: 0.5 });
const out8 = c8.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Top object (middle layer effect):  ', out8.colors[0][0]);

// Test 9: Many layers with effects
console.log('\n[TEST 9] Five layers, alternating effects');
const c9 = new Compositor();
c9.addObject('obj5', { content: [['#']], position: { x: 0, y: 0 }, color: '#808080', layer: 4 });
c9.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.1 });
c9.setLayerEffect(1, { color: '#000000', type: 'darken', strength: 0.1 });
c9.setLayerEffect(2, { color: '#ffffff', type: 'lighten', strength: 0.1 });
c9.setLayerEffect(3, { color: '#000000', type: 'darken', strength: 0.1 });
c9.setLayerEffect(4, { color: '#ffffff', type: 'lighten', strength: 0.1 });
const out9 = c9.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Object (5 alternating effects):    ', out9.colors[0][0]);

// Test 10: Zero strength effect (should have no impact)
console.log('\n[TEST 10] Zero strength in layer stack');
const c10 = new Compositor();
c10.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#ff0000', layer: 1 });
c10.setLayerEffect(0, { color: '#00ff00', type: 'lighten', strength: 0.0 });
c10.setLayerEffect(1, { color: '#0000ff', type: 'lighten', strength: 0.5 });
const out10 = c10.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Object (zero + normal effect):     ', out10.colors[0][0]);

// Test 11: Removing and re-adding layer effects
console.log('\n[TEST 11] Remove and re-add layer effects');
const c11 = new Compositor();
c11.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#808080', layer: 0 });
c11.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.5 });
const before = c11.render({ x: 0, y: 0, width: 1, height: 1 });
c11.setLayerEffect(0, null);
const after = c11.render({ x: 0, y: 0, width: 1, height: 1 });
c11.setLayerEffect(0, { color: '#000000', type: 'darken', strength: 0.5 });
const final = c11.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  With lighten effect:   ', before.colors[0][0]);
console.log('  Effect removed:        ', after.colors[0][0]);
console.log('  With darken effect:    ', final.colors[0][0]);

// Test 12: Effects on negative layers
console.log('\n[TEST 12] Effects on negative layers');
const c12 = new Compositor();
c12.addObject('obj', { content: [['#']], position: { x: 0, y: 0 }, color: '#808080', layer: 0 });
c12.setLayerEffect(-1, { color: '#ffffff', type: 'lighten', strength: 0.3 });
c12.setLayerEffect(0, { color: '#000000', type: 'darken', strength: 0.3 });
const out12 = c12.render({ x: 0, y: 0, width: 1, height: 1 });
console.log('  Object on layer 0 (neg + pos effects):', out12.colors[0][0]);

console.log('\nLayer stacking testing complete!');
