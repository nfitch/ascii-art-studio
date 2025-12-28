import { bench, describe } from 'vitest';
import { Compositor } from '../src/Compositor';

describe('Compositor Performance', () => {
  // Baseline: Simple render without complexity
  bench('simple render (1 object, no effects)', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['#']],
      position: { x: 0, y: 0 }
    });
    c.render({ x: 0, y: 0, width: 10, height: 10 });
  });

  // Scene complexity: Multiple objects
  bench('medium complexity (10 objects)', () => {
    const c = new Compositor();
    for (let i = 0; i < 10; i++) {
      c.addObject(`obj${i}`, {
        content: [['#']],
        position: { x: i, y: i }
      });
    }
    c.render({ x: 0, y: 0, width: 20, height: 20 });
  });

  bench('high complexity (50 objects)', () => {
    const c = new Compositor();
    for (let i = 0; i < 50; i++) {
      c.addObject(`obj${i}`, {
        content: [['#']],
        position: { x: i % 10, y: Math.floor(i / 10) }
      });
    }
    c.render({ x: 0, y: 0, width: 20, height: 20 });
  });

  // Large viewport
  bench('large viewport (100x100)', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['#']],
      position: { x: 50, y: 50 }
    });
    c.render({ x: 0, y: 0, width: 100, height: 100 });
  });

  bench('very large viewport (500x500)', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['#']],
      position: { x: 250, y: 250 }
    });
    c.render({ x: 0, y: 0, width: 500, height: 500 });
  });

  // Influence effects
  bench('single object with influence', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['#']],
      position: { x: 5, y: 5 },
      color: '#ff0000',
      influence: {
        radius: 3,
        transform: { type: 'lighten', strength: 0.5, falloff: 'linear' }
      }
    });
    c.render({ x: 0, y: 0, width: 15, height: 15 });
  });

  bench('multiple objects with overlapping influence', () => {
    const c = new Compositor();
    for (let i = 0; i < 5; i++) {
      c.addObject(`obj${i}`, {
        content: [['#']],
        position: { x: i * 3, y: i * 3 },
        color: '#ff0000',
        influence: {
          radius: 5,
          transform: { type: 'lighten', strength: 0.3, falloff: 'linear' }
        }
      });
    }
    c.render({ x: 0, y: 0, width: 20, height: 20 });
  });

  // Layer effects
  bench('single layer with effect', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['#', '#', '#']],
      position: { x: 0, y: 0 },
      color: '#808080',
      layer: 0
    });
    c.setLayerEffect(0, {
      color: '#ffffff',
      type: 'lighten',
      strength: 0.5
    });
    c.render({ x: 0, y: 0, width: 10, height: 10 });
  });

  bench('multiple layers with stacking effects', () => {
    const c = new Compositor();
    for (let layer = 0; layer < 3; layer++) {
      c.addObject(`obj${layer}`, {
        content: [['#']],
        position: { x: layer, y: layer },
        color: '#808080',
        layer
      });
      c.setLayerEffect(layer, {
        color: '#ffffff',
        type: 'lighten',
        strength: 0.3
      });
    }
    c.render({ x: 0, y: 0, width: 10, height: 10 });
  });

  // Large content objects
  bench('large content object (50x50 grid)', () => {
    const c = new Compositor();
    const content: string[][] = [];
    for (let y = 0; y < 50; y++) {
      content.push(Array(50).fill('#'));
    }
    c.addObject('large', {
      content,
      position: { x: 0, y: 0 }
    });
    c.render({ x: 0, y: 0, width: 60, height: 60 });
  });

  // Flip operations
  bench('horizontal flip', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['A', 'B', 'C', 'D', 'E']],
      position: { x: 0, y: 0 }
    });
    c.flipHorizontal('obj');
  });

  bench('vertical flip', () => {
    const c = new Compositor();
    const content: string[][] = [];
    for (let i = 0; i < 10; i++) {
      content.push(['X']);
    }
    c.addObject('obj', {
      content,
      position: { x: 0, y: 0 }
    });
    c.flipVertical('obj');
  });

  // AutoDetectEdges
  bench('autoDetectEdges on complex shape', () => {
    const c = new Compositor();
    c.addObject('shape', {
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
    c.render({ x: 0, y: 0, width: 10, height: 10 });
  });

  // Cold cache vs warm cache
  bench('cold cache: create new compositor each time', () => {
    const c = new Compositor();
    c.addObject('obj', {
      content: [['#']],
      position: { x: 0, y: 0 }
    });
    c.render({ x: 0, y: 0, width: 10, height: 10 });
  });

  // Warm cache simulation - reuse compositor
  const warmCompositor = new Compositor();
  warmCompositor.addObject('obj', {
    content: [['#']],
    position: { x: 0, y: 0 }
  });

  bench('warm cache: reuse compositor instance', () => {
    warmCompositor.render({ x: 0, y: 0, width: 10, height: 10 });
  });

  // Viewport offset (dirty region simulation)
  bench('viewport offset (panning simulation)', () => {
    const c = new Compositor();
    for (let i = 0; i < 20; i++) {
      c.addObject(`obj${i}`, {
        content: [['#']],
        position: { x: i * 2, y: i * 2 }
      });
    }
    // Simulate panning by rendering different viewports
    c.render({ x: 10, y: 10, width: 20, height: 20 });
  });
});
