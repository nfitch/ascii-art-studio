import { describe, test, expect, beforeEach } from 'vitest';
import { Compositor } from './Compositor';
import { AsciiObject, type AsciiObjectOptions } from './AsciiObject';

// Helper function for backwards compatibility in tests
function addObjectLegacy(
  compositor: Compositor,
  id: string,
  options: Omit<AsciiObjectOptions, 'id'>
): void {
  const obj = new AsciiObject({ id, ...options });
  compositor.addObject(obj);
}

// Helper to create compositor with legacy initial objects format
function createCompositorLegacy(
  initialObjects?: Array<{ id: string; [key: string]: any }>,
  defaultViewport?: any
): Compositor {
  if (!initialObjects) {
    return createCompositorLegacy([], defaultViewport);
  }

  const objects = initialObjects.map(obj => new AsciiObject(obj as AsciiObjectOptions));
  return new Compositor(objects, defaultViewport);
}

describe('Compositor', () => {
  describe('Constructor', () => {
    test('creates empty compositor', () => {
      const compositor = new Compositor();
      expect(compositor.listObjects()).toEqual([]);
    });

    test('creates compositor with initial objects', () => {
      const compositor = createCompositorLegacy([
        {
          id: 'obj1',
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#ff0000',
          layer: 0,
        },
      ]);

      const objects = compositor.listObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0].id).toBe('obj1');
    });

    test('creates compositor with default viewport', () => {
      const compositor = createCompositorLegacy([], { x: 0, y: 0, width: 10, height: 10 });
      const output = compositor.render();
      expect(output.characters).toHaveLength(10);
      expect(output.characters[0]).toHaveLength(10);
    });

    test('throws on invalid initial object', () => {
      expect(() => {
        createCompositorLegacy([
          {
            id: 'obj1',
            content: [['a', 'b'], ['c']], // Ragged array
            position: { x: 0, y: 0 },
            color: '#ff0000',
            layer: 0,
          },
        ]);
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on initial object missing id', () => {
      expect(() => {
        createCompositorLegacy([
          {
            content: [['#']],
            position: { x: 0, y: 0 },
          } as any,
        ]);
      }).toThrow('Invalid initial object: missing required fields (id)');
    });

    test('throws on initial object missing content', () => {
      expect(() => {
        createCompositorLegacy([
          {
            id: 'obj1',
            position: { x: 0, y: 0 },
          } as any,
        ]);
      }).toThrow('Invalid initial object: missing required fields (content)');
    });

    test('throws on initial object missing position', () => {
      expect(() => {
        createCompositorLegacy([
          {
            id: 'obj1',
            content: [['#']],
          } as any,
        ]);
      }).toThrow('Invalid initial object: missing required fields (position)');
    });
  });

  describe('addObject', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('adds object with character matrix', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#', '#'], ['#', '#']],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.id).toBe('obj1');
      expect(obj.content).toEqual([['#', '#'], ['#', '#']]);
      expect(obj.color).toBe('#000000'); // Default color
      expect(obj.layer).toBe(0); // Default layer
    });

    test('adds object with string array', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: ['##', '##'],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content).toEqual([['#', '#'], ['#', '#']]);
    });

    test('adds object with newline string', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: '##\n##',
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content).toEqual([['#', '#'], ['#', '#']]);
    });

    test('adds object with custom color and layer', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 5,
      });

      const obj = compositor.getObject('obj1');
      expect(obj.color).toBe('#ff0000');
      expect(obj.layer).toBe(5);
    });

    test('throws on non-integer layer', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          layer: 1.5,
        });
      }).toThrow('Layer must be an integer');
    });

    test('adds object with null (transparent) cells', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#', null], [null, '#']],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content[0][1]).toBe(null);
      expect(obj.content[1][0]).toBe(null);
    });

    test('adds object with negative position', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: -5, y: -10 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.position).toEqual({ x: -5, y: -10 });
    });

    test('adds object with influence', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
        influence: {
          radius: 2,
          transform: {
            type: 'lighten',
            strength: 0.5,
            falloff: 'linear',
          },
        },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.influence).toBeDefined();
      expect(obj.influence?.radius).toBe(2);
    });

    test('throws on duplicate ID', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
        });
      }).toThrow("Object with id 'obj1' already exists");
    });

    test('throws on ragged character matrix', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['a', 'b'], ['c']],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on ragged string array', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: ['ab', 'c'],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on ragged newline string', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: 'ab\nc',
          position: { x: 0, y: 0 },
        });
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on invalid color format', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: 'red',
        });
      }).toThrow('Invalid color format: must be #RRGGBB');
    });

    test('throws on short hex color', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: '#f00',
        });
      }).toThrow('Invalid color format: must be #RRGGBB');
    });

    test('throws on missing # in color', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: 'ff0000',
        });
      }).toThrow('Invalid color format: must be #RRGGBB');
    });

    test('throws on non-positive influence radius', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          influence: {
            radius: 0,
            transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
          },
        });
      }).toThrow('Influence radius must be positive integer');
    });

    test('throws on non-integer influence radius', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          influence: {
            radius: 1.5,
            transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
          },
        });
      }).toThrow('Influence radius must be positive integer');
    });

    test('throws on influence strength below 0', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          influence: {
            radius: 1,
            transform: { type: 'lighten', strength: -0.1, falloff: 'linear' },
          },
        });
      }).toThrow('Influence strength must be between 0.0 and 1.0');
    });

    test('throws on influence strength above 1.0', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          influence: {
            radius: 1,
            transform: { type: 'lighten', strength: 1.1, falloff: 'linear' },
          },
        });
      }).toThrow('Influence strength must be between 0.0 and 1.0');
    });

    test('throws on empty content', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Content must be non-empty');
    });

    test('throws on empty row', () => {
      expect(() => {
        addObjectLegacy(compositor, 'obj1', {
          content: [[]],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Content must be non-empty');
    });

    test('accepts content with only spaces', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [[' ', ' '], [' ', ' ']],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content).toEqual([[' ', ' '], [' ', ' ']]);
    });

    test('renders spaces without influence as opaque', () => {
      addObjectLegacy(compositor, 'bg', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'fg', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        color: '#00ff00',
        layer: 1,
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe(' ');
      expect(output.colors[0][0]).toBe('#00ff00');
    });
  });

  describe('removeObject', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
    });

    test('removes object', () => {
      compositor.removeObject('obj1');
      expect(compositor.listObjects()).toHaveLength(0);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.removeObject('nonexistent');
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('moveObject', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
    });

    test('moves object to new position', () => {
      compositor.getObject('obj1').setPosition(5, 10 );
      const obj = compositor.getObject('obj1');
      expect(obj.position).toEqual({ x: 5, y: 10 });
    });

    test('moves object to negative position', () => {
      compositor.getObject('obj1').setPosition(-5, -10 );
      const obj = compositor.getObject('obj1');
      expect(obj.position).toEqual({ x: -5, y: -10 });
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.getObject('nonexistent').setPosition(0, 0 );
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('flipHorizontal', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('toggles horizontal flip', () => {
      const obj1 = compositor.getObject('obj1');
      expect(obj1.flipHorizontal).toBe(false);

      compositor.getObject('obj1').flipHorizontalToggle();
      const obj2 = compositor.getObject('obj1');
      expect(obj2.flipHorizontal).toBe(true);
      expect(obj2.content).toEqual([
        ['b', 'a'],
        ['d', 'c'],
      ]);

      compositor.getObject('obj1').flipHorizontalToggle();
      const obj3 = compositor.getObject('obj1');
      expect(obj3.flipHorizontal).toBe(false);
      expect(obj3.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.getObject('nonexistent').flipHorizontalToggle();
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('flipVertical', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('toggles vertical flip', () => {
      const obj1 = compositor.getObject('obj1');
      expect(obj1.flipVertical).toBe(false);

      compositor.getObject('obj1').flipVerticalToggle();
      const obj2 = compositor.getObject('obj1');
      expect(obj2.flipVertical).toBe(true);
      expect(obj2.content).toEqual([
        ['c', 'd'],
        ['a', 'b'],
      ]);

      compositor.getObject('obj1').flipVerticalToggle();
      const obj3 = compositor.getObject('obj1');
      expect(obj3.flipVertical).toBe(false);
      expect(obj3.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.getObject('nonexistent').flipVerticalToggle();
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('setFlipHorizontal', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('sets horizontal flip to true', () => {
      compositor.getObject('obj1').setFlipHorizontal(true);
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(true);
      expect(obj.content).toEqual([
        ['b', 'a'],
        ['d', 'c'],
      ]);
    });

    test('sets horizontal flip to false', () => {
      compositor.getObject('obj1').flipHorizontalToggle(); // Flip it first
      compositor.getObject('obj1').setFlipHorizontal(false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('no-op when setting to current state', () => {
      compositor.getObject('obj1').setFlipHorizontal(false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.getObject('nonexistent').setFlipHorizontal(true);
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('setFlipVertical', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('sets vertical flip to true', () => {
      compositor.getObject('obj1').setFlipVertical(true);
      const obj = compositor.getObject('obj1');
      expect(obj.flipVertical).toBe(true);
      expect(obj.content).toEqual([
        ['c', 'd'],
        ['a', 'b'],
      ]);
    });

    test('sets vertical flip to false', () => {
      compositor.getObject('obj1').flipVerticalToggle(); // Flip it first
      compositor.getObject('obj1').setFlipVertical(false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipVertical).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('no-op when setting to current state', () => {
      compositor.getObject('obj1').setFlipVertical(false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipVertical).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.getObject('nonexistent').setFlipVertical(true);
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('Combined flips', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [
          ['a', 'b', 'c'],
          ['d', 'e', 'f'],
          ['g', 'h', 'i'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('applies both horizontal and vertical flips', () => {
      compositor.getObject('obj1').flipHorizontalToggle();
      compositor.getObject('obj1').flipVerticalToggle();
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(true);
      expect(obj.flipVertical).toBe(true);
      expect(obj.content).toEqual([
        ['i', 'h', 'g'],
        ['f', 'e', 'd'],
        ['c', 'b', 'a'],
      ]);
    });

    test('renders with combined flips', () => {
      compositor.getObject('obj1').flipHorizontalToggle();
      compositor.getObject('obj1').flipVerticalToggle();
      const output = compositor.render({ x: 0, y: 0, width: 3, height: 3 });
      expect(output.characters).toEqual([
        ['i', 'h', 'g'],
        ['f', 'e', 'd'],
        ['c', 'b', 'a'],
      ]);
    });
  });

  describe('getObject', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 5, y: 10 },
        color: '#ff0000',
        layer: 3,
      });
    });

    test('returns object details', () => {
      const obj = compositor.getObject('obj1');
      expect(obj.id).toBe('obj1');
      expect(obj.position).toEqual({ x: 5, y: 10 });
      expect(obj.color).toBe('#ff0000');
      expect(obj.layer).toBe(3);
      expect(obj.flipHorizontal).toBe(false);
      expect(obj.flipVertical).toBe(false);
    });

    test('returns mutable object that can be modified', () => {
      const obj = compositor.getObject('obj1');
      obj.content[0][0] = 'X';

      const obj2 = compositor.getObject('obj1');
      expect(obj2.content[0][0]).toBe('X'); // Same object, mutation visible
    });

    test('clones input influence to prevent external mutations', () => {
      // Test: Mutating influence object after addObject should not affect internal state
      const influence = {
        radius: 2,
        transform: { type: 'lighten' as const, strength: 0.5, falloff: 'linear' as const },
      };
      addObjectLegacy(compositor, 'obj2', {
        content: [['#']],
        position: { x: 0, y: 0 },
        influence,
      });

      // Mutate the original influence object
      influence.radius = 10;
      influence.transform.strength = 1.0;
      influence.transform.type = 'darken';

      // Verify internal state not affected by external mutation
      const obj = compositor.getObject('obj2');
      expect(obj.influence?.radius).toBe(2);
      expect(obj.influence?.transform.strength).toBe(0.5);
      expect(obj.influence?.transform.type).toBe('lighten');

      // Test 2: Object influence is mutable after retrieval
      obj.influence!.radius = 20;
      obj.influence!.transform.strength = 0.9;
      obj.influence!.transform.falloff = 'cubic';

      const obj2 = compositor.getObject('obj2');
      expect(obj2.influence?.radius).toBe(20); // Mutations are visible
      expect(obj2.influence?.transform.strength).toBe(0.9);
      expect(obj2.influence?.transform.falloff).toBe('cubic');
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.getObject('nonexistent');
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('listObjects', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('returns empty array for empty compositor', () => {
      expect(compositor.listObjects()).toEqual([]);
    });

    test('returns all objects', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
      addObjectLegacy(compositor, 'obj2', {
        content: [['*']],
        position: { x: 5, y: 5 },
      });

      const objects = compositor.listObjects();
      expect(objects).toHaveLength(2);
      expect(objects.map(o => o.id).sort()).toEqual(['obj1', 'obj2']);
    });

    test('returns mutable objects that can be modified', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const objects = compositor.listObjects();
      objects[0].content[0][0] = 'X';

      const obj = compositor.getObject('obj1');
      expect(obj.content[0][0]).toBe('X'); // Mutations are visible
    });
  });

  describe('getCanvasBounds', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('returns zero bounds for empty compositor', () => {
      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
    });

    test('returns bounds for single object', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#', '#'], ['#', '#']],
        position: { x: 5, y: 10 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: 5, minY: 10, maxX: 6, maxY: 11 });
    });

    test('returns bounds for multiple objects', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
      addObjectLegacy(compositor, 'obj2', {
        content: [['#']],
        position: { x: 10, y: 20 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
    });

    test('includes negative positions', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: -5, y: -10 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: -5, minY: -10, maxX: -5, maxY: -10 });
    });

    test('includes influence radius in bounds', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 5, y: 5 },
        influence: {
          radius: 2,
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });

      const bounds = compositor.getCanvasBounds();
      // Object at (5,5), 1x1 size, influence radius 2
      // Bounds should be (5-2, 5-2) to (5+2, 5+2) = (3, 3) to (7, 7)
      expect(bounds).toEqual({ minX: 3, minY: 3, maxX: 7, maxY: 7 });
    });
  });

  describe('render', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('renders empty scene', () => {
      const output = compositor.render({ x: 0, y: 0, width: 3, height: 2 });
      expect(output.characters).toEqual([
        [' ', ' ', ' '],
        [' ', ' ', ' '],
      ]);
      expect(output.colors).toEqual([
        ['#000000', '#000000', '#000000'],
        ['#000000', '#000000', '#000000'],
      ]);
    });

    test('renders single object', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#', '#'], ['#', '#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
      });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output.characters).toEqual([
        ['#', '#'],
        ['#', '#'],
      ]);
      expect(output.colors).toEqual([
        ['#ff0000', '#ff0000'],
        ['#ff0000', '#ff0000'],
      ]);
    });

    test('renders object with offset position', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 1, y: 1 },
        color: '#ff0000',
      });

      const output = compositor.render({ x: 0, y: 0, width: 3, height: 3 });
      expect(output.characters).toEqual([
        [' ', ' ', ' '],
        [' ', '#', ' '],
        [' ', ' ', ' '],
      ]);
      expect(output.colors[1][1]).toBe('#ff0000');
    });

    test('renders with transparent cells', () => {
      addObjectLegacy(compositor, 'bg', {
        content: [['*', '*'], ['*', '*']],
        position: { x: 0, y: 0 },
        color: '#0000ff',
        layer: 0,
      });
      addObjectLegacy(compositor, 'fg', {
        content: [['#', null], [null, '#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
      });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output.characters).toEqual([
        ['#', '*'],
        ['*', '#'],
      ]);
      expect(output.colors[0][0]).toBe('#ff0000');
      expect(output.colors[0][1]).toBe('#0000ff');
      expect(output.colors[1][0]).toBe('#0000ff');
      expect(output.colors[1][1]).toBe('#ff0000');
    });

    test('renders layers in correct order (higher layers on top)', () => {
      addObjectLegacy(compositor, 'layer0', {
        content: [['A']],
        position: { x: 0, y: 0 },
        layer: 0,
      });
      addObjectLegacy(compositor, 'layer1', {
        content: [['B']],
        position: { x: 0, y: 0 },
        layer: 1,
      });
      addObjectLegacy(compositor, 'layer-1', {
        content: [['C']],
        position: { x: 0, y: 0 },
        layer: -1,
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('B'); // Layer 1 on top
    });

    test('renders same-layer objects (first added wins)', () => {
      addObjectLegacy(compositor, 'first', {
        content: [['A']],
        position: { x: 0, y: 0 },
        layer: 0,
      });
      addObjectLegacy(compositor, 'second', {
        content: [['B']],
        position: { x: 0, y: 0 },
        layer: 0,
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('A'); // First added wins
    });

    test('renders with viewport larger than canvas', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output = compositor.render({ x: 0, y: 0, width: 5, height: 5 });
      expect(output.characters).toHaveLength(5);
      expect(output.characters[0]).toHaveLength(5);
      expect(output.characters[0][0]).toBe('#');
      expect(output.characters[0][1]).toBe(' ');
    });

    test('renders with viewport offset', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 5, y: 5 },
      });

      const output = compositor.render({ x: 5, y: 5, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
    });

    test('renders viewport entirely off canvas (all blanks)', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output = compositor.render({ x: 100, y: 100, width: 2, height: 2 });
      expect(output.characters).toEqual([
        [' ', ' '],
        [' ', ' '],
      ]);
    });

    test('uses default viewport from constructor', () => {
      const comp = createCompositorLegacy([], { x: 0, y: 0, width: 2, height: 2 });
      addObjectLegacy(comp, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output = comp.render();
      expect(output.characters).toHaveLength(2);
      expect(output.characters[0]).toHaveLength(2);
    });

    test('throws when no viewport and no default', () => {
      expect(() => {
        compositor.render();
      }).toThrow('No viewport specified and no default viewport set');
    });

    test('throws on negative viewport dimensions', () => {
      expect(() => {
        compositor.render({ x: 0, y: 0, width: -1, height: 5 });
      }).toThrow('Viewport width and height must be positive');
    });
  });

  describe('autoDetectEdges', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('detects edges with flood fill', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [
          '  ###  ',
          '  # #  ',
          '  ###  ',
        ],
        position: { x: 0, y: 0 },
        autoDetectEdges: true,
      });

      const obj = compositor.getObject('obj1');
      // Outer spaces should be null (transparent)
      expect(obj.content[0][0]).toBe(null);
      expect(obj.content[0][6]).toBe(null);
      // Inner space should remain opaque
      expect(obj.content[1][3]).toBe(' ');
    });

    test('detects leading spaces as transparent', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [
          ' ###',
          '  ##',
        ],
        position: { x: 0, y: 0 },
        autoDetectEdges: true,
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content[0][0]).toBe(null);
      expect(obj.content[1][0]).toBe(null);
      expect(obj.content[1][1]).toBe(null);
    });
  });

  describe('Influence and color transforms', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('applies lighten transform with linear falloff', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'upper', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
      expect(output.colors[0][0]).not.toBe('#ff0000');
    });

    test('applies lighten transform with quadratic falloff', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'upper', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.5, falloff: 'quadratic' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
      expect(output.colors[0][0]).not.toBe('#ff0000');
    });

    test('applies lighten transform with exponential falloff', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'upper', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.5, falloff: 'exponential' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
      expect(output.colors[0][0]).not.toBe('#ff0000');
    });

    test('applies lighten transform with cubic falloff', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'upper', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.5, falloff: 'cubic' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
      expect(output.colors[0][0]).not.toBe('#ff0000');
    });

    test('applies darken transform', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });

      addObjectLegacy(compositor, 'upper', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'darken', strength: 0.5, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
      expect(output.colors[0][0]).not.toBe('#ffffff');
    });

    test('accumulates transparency from multiple layers', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'layer1', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.3, falloff: 'linear' },
        },
      });

      addObjectLegacy(compositor, 'layer2', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 2,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.3, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      // Both layers should contribute to lightening
      expect(output.characters[0][0]).toBe('#');
      // Color should be significantly lightened (0.3 + 0.3 = 0.6 transparency)
    });

    test('renders blank when accumulated transparency >= 100', () => {
      addObjectLegacy(compositor, 'base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      addObjectLegacy(compositor, 'layer1', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.6, falloff: 'linear' },
        },
      });

      addObjectLegacy(compositor, 'layer2', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 2,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      // Two glass panes with lighten affecting the '#' beneath
      // Red (#ff0000) lightened 60% then 50% should be very light (close to white)
      expect(output.characters[0][0]).toBe('#');
      expect(output.colors[0][0]).not.toBe('#ff0000'); // Should be lightened from red
    });

    test('applies custom influence color (blue object with red glow)', () => {
      // Create two blue objects close together, first one has red influence
      addObjectLegacy(compositor, 'obj1', {
        content: ['###', '###', '###'],
        position: { x: 2, y: 2 },
        color: '#0000ff', // Blue
        layer: 0,
        influence: {
          radius: 2,
          color: '#ff0000', // Red influence
          transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' },
        },
      });

      addObjectLegacy(compositor, 'obj2', {
        content: ['@@@', '@@@', '@@@'],
        position: { x: 5, y: 2 }, // 1 cell gap, within radius 2
        color: '#0000ff', // Blue
        layer: 0,
        influence: {
          radius: 2,
          color: '#ff0000', // Red influence
          transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 10, height: 6 });

      // obj2's left edge at (5,2) should be influenced by obj1's red glow
      const influencedColor = output.colors[2][5];

      // Should NOT be pure blue (no influence)
      expect(influencedColor).not.toBe('#0000ff');

      // Should NOT be white/light (would indicate lightening toward white instead of red)
      expect(influencedColor).not.toBe('#ffffff');
      expect(influencedColor).not.toMatch(/^#[c-f][c-f][c-f]/); // Not very light colors

      // Should be purple-ish (blue lightened toward red)
      // Parse the color
      const r = parseInt(influencedColor.slice(1, 3), 16);
      const g = parseInt(influencedColor.slice(3, 5), 16);
      const b = parseInt(influencedColor.slice(5, 7), 16);

      // Red component should be significant (not near 0)
      expect(r).toBeGreaterThan(50);
      // Blue component should still be present but reduced
      expect(b).toBeGreaterThan(0);
      // Green should be low (both blue and red have low green)
      expect(g).toBeLessThan(100);
      // Red should be >= blue (more red than blue due to red influence)
      expect(r).toBeGreaterThanOrEqual(b);
    });
  });

  describe('Dirty region optimization', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('caches render output when nothing changes', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      // Should return same cached result
      expect(output2.characters).toEqual(output1.characters);
    });

    test('prevents cache corruption from user mutations', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      // Mutate the returned output
      output1.characters[0][0] = 'X';
      output1.colors[0][0] = '#ff0000';

      // Second render should not be affected by mutations
      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output2.characters[0][0]).toBe('#');
      expect(output2.colors[0][0]).toBe('#000000');
    });

    test('invalidates cache when object added', () => {
      const output1 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output2.characters).not.toEqual(output1.characters);
    });

    test('invalidates cache when object moved', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 3, height: 3 });

      compositor.getObject('obj1').setPosition(1, 1 );

      const output2 = compositor.render({ x: 0, y: 0, width: 3, height: 3 });
      expect(output2.characters).not.toEqual(output1.characters);
    });

    test('invalidates cache when object removed', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      compositor.removeObject('obj1');

      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output2.characters).not.toEqual(output1.characters);
    });

    test('invalidates cache when object flipped', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['a', 'b']],
        position: { x: 0, y: 0 },
      });

      compositor.render({ x: 0, y: 0, width: 2, height: 1 });

      compositor.getObject('obj1').flipHorizontalToggle();

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 1 });
      expect(output.characters[0]).toEqual(['b', 'a']);
    });

    test('re-renders when viewport changes', () => {
      addObjectLegacy(compositor, 'obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      const output2 = compositor.render({ x: 1, y: 1, width: 2, height: 2 });

      // Different viewport should trigger re-render
      expect(output2.characters[0][0]).toBe(' ');
    });
  });

  describe('Multiply and Multiply-Darken Blend Modes', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('multiply blend mode combines colors', () => {
      // White object on bottom layer
      addObjectLegacy(compositor, 'bottom', {
        content: [['*']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });

      // Red glass pane (spaces) on top layer with multiply influence
      addObjectLegacy(compositor, 'top', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'multiply', strength: 1.0, falloff: 'linear' }
        }
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      // The white character should be tinted red by multiply influence
      // White (#ffffff) multiplied by red (#ff0000) should give red (#ff0000)
      expect(output.characters[0][0]).toBe('*');
      expect(output.colors[0][0]).toBe('#ff0000');
    });

    test('multiply-darken is darker than multiply', () => {
      // Setup two identical scenes, one with multiply, one with multiply-darken
      const comp1 = new Compositor();
      addObjectLegacy(comp1, 'bottom', {
        content: [['*']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });
      addObjectLegacy(comp1, 'top', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'multiply', strength: 1.0, falloff: 'linear' }
        }
      });

      const comp2 = new Compositor();
      addObjectLegacy(comp2, 'bottom', {
        content: [['*']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });
      addObjectLegacy(comp2, 'top', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'multiply-darken', strength: 1.0, falloff: 'linear', darkenFactor: 0.5 }
        }
      });

      const output1 = comp1.render({ x: 0, y: 0, width: 1, height: 1 });
      const output2 = comp2.render({ x: 0, y: 0, width: 1, height: 1 });

      // Both should have the same character
      expect(output1.characters[0][0]).toBe('*');
      expect(output2.characters[0][0]).toBe('*');

      // Colors should be different - multiply-darken should be darker
      expect(output1.colors[0][0]).not.toBe(output2.colors[0][0]);

      // Parse colors and verify multiply-darken is darker
      const color1 = output1.colors[0][0];
      const color2 = output2.colors[0][0];

      const r1 = parseInt(color1.slice(1, 3), 16);
      const g1 = parseInt(color1.slice(3, 5), 16);
      const b1 = parseInt(color1.slice(5, 7), 16);

      const r2 = parseInt(color2.slice(1, 3), 16);
      const g2 = parseInt(color2.slice(3, 5), 16);
      const b2 = parseInt(color2.slice(5, 7), 16);

      // Multiply-darken should have lower RGB values (darker)
      expect(r2).toBeLessThanOrEqual(r1);
      expect(g2).toBeLessThanOrEqual(g1);
      expect(b2).toBeLessThanOrEqual(b1);
    });

    test('multiply-darken respects darkenFactor parameter', () => {
      const comp1 = new Compositor();
      addObjectLegacy(comp1, 'bottom', {
        content: [['*']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });
      addObjectLegacy(comp1, 'top', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'multiply-darken', strength: 1.0, falloff: 'linear', darkenFactor: 0.8 }
        }
      });

      const comp2 = new Compositor();
      addObjectLegacy(comp2, 'bottom', {
        content: [['*']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });
      addObjectLegacy(comp2, 'top', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'multiply-darken', strength: 1.0, falloff: 'linear', darkenFactor: 0.5 }
        }
      });

      const output1 = comp1.render({ x: 0, y: 0, width: 1, height: 1 });
      const output2 = comp2.render({ x: 0, y: 0, width: 1, height: 1 });

      // Different darkenFactors should produce different colors
      expect(output1.colors[0][0]).not.toBe(output2.colors[0][0]);

      // Lower darkenFactor (0.5) should be darker than higher (0.8)
      const r1 = parseInt(output1.colors[0][0].slice(1, 3), 16);
      const r2 = parseInt(output2.colors[0][0].slice(1, 3), 16);
      expect(r2).toBeLessThan(r1);
    });

    test('multiply with glass pane effect', () => {
      // Object beneath glass
      addObjectLegacy(compositor, 'bg', {
        content: [['#', '#']],
        position: { x: 0, y: 0 },
        color: '#0000ff',
        layer: 0,
      });

      // Glass pane (spaces with multiply influence)
      addObjectLegacy(compositor, 'glass', {
        content: [[' ', ' '], [' ', ' ']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'multiply', strength: 1.0, falloff: 'linear' }
        }
      });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      // Background should be visible through glass with multiply effect
      expect(output.characters[0][0]).toBe('#');
      // Blue multiplied by red should give black
      expect(output.colors[0][0]).toBe('#000000');
    });
  });

  describe('Layer Effects', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    describe('setLayerEffect and getLayerEffect', () => {
      test('sets and retrieves layer effect', () => {
        const effect = {
          color: '#ff0000',
          type: 'lighten' as const,
          strength: 0.5,
        };

        compositor.setLayerEffect(1, effect);
        const retrieved = compositor.getLayerEffect(1);

        expect(retrieved).toEqual(effect);
      });

      test('returns null for layer with no effect', () => {
        expect(compositor.getLayerEffect(5)).toBeNull();
      });

      test('removes layer effect when set to null', () => {
        compositor.setLayerEffect(1, {
          color: '#ff0000',
          type: 'lighten',
          strength: 0.5,
        });

        compositor.setLayerEffect(1, null);
        expect(compositor.getLayerEffect(1)).toBeNull();
      });

      test('returns deep clone of layer effect', () => {
        const effect = {
          color: '#ff0000',
          type: 'multiply-darken' as const,
          strength: 0.8,
          darkenFactor: 0.5,
        };

        compositor.setLayerEffect(1, effect);
        const retrieved = compositor.getLayerEffect(1);

        effect.strength = 1.0;
        expect(retrieved?.strength).toBe(0.8);
      });

      test('allows multiple layer effects on different layers', () => {
        compositor.setLayerEffect(0, {
          color: '#ff0000',
          type: 'lighten',
          strength: 0.3,
        });

        compositor.setLayerEffect(2, {
          color: '#00ff00',
          type: 'multiply',
          strength: 0.7,
        });

        expect(compositor.getLayerEffect(0)).toEqual({
          color: '#ff0000',
          type: 'lighten',
          strength: 0.3,
        });

        expect(compositor.getLayerEffect(2)).toEqual({
          color: '#00ff00',
          type: 'multiply',
          strength: 0.7,
        });
      });

      test('overwrites existing layer effect', () => {
        compositor.setLayerEffect(1, {
          color: '#ff0000',
          type: 'lighten',
          strength: 0.5,
        });

        compositor.setLayerEffect(1, {
          color: '#00ff00',
          type: 'darken',
          strength: 0.8,
        });

        expect(compositor.getLayerEffect(1)).toEqual({
          color: '#00ff00',
          type: 'darken',
          strength: 0.8,
        });
      });
    });

    describe('Layer effect validation', () => {
      test('throws on invalid color format', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: 'red',
            type: 'lighten',
            strength: 0.5,
          });
        }).toThrow('Invalid color format: must be #RRGGBB');
      });

      test('throws on strength less than 0', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: '#ff0000',
            type: 'lighten',
            strength: -0.1,
          });
        }).toThrow('Strength must be between 0.0 and 1.0');
      });

      test('throws on strength greater than 1', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: '#ff0000',
            type: 'lighten',
            strength: 1.5,
          });
        }).toThrow('Strength must be between 0.0 and 1.0');
      });

      test('throws on darkenFactor less than 0', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: '#ff0000',
            type: 'multiply-darken',
            strength: 0.5,
            darkenFactor: -0.1,
          });
        }).toThrow('darkenFactor must be between 0.0 and 1.0');
      });

      test('throws on darkenFactor greater than 1', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: '#ff0000',
            type: 'multiply-darken',
            strength: 0.5,
            darkenFactor: 1.5,
          });
        }).toThrow('darkenFactor must be between 0.0 and 1.0');
      });

      test('allows strength of exactly 0', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: '#ff0000',
            type: 'lighten',
            strength: 0.0,
          });
        }).not.toThrow();
      });

      test('allows strength of exactly 1', () => {
        expect(() => {
          compositor.setLayerEffect(1, {
            color: '#ff0000',
            type: 'lighten',
            strength: 1.0,
          });
        }).not.toThrow();
      });
    });

    describe('Layer effect rendering', () => {
      test('applies lighten effect uniformly to viewport', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#000000',
          layer: 0,
        });

        compositor.setLayerEffect(1, {
          color: '#ffffff',
          type: 'lighten',
          strength: 0.5,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // All cells should be lightened by 50% toward white
        expect(output.colors[0][0]).toBe('#808080');
        expect(output.colors[0][1]).toBe('#808080');
        expect(output.colors[1][0]).toBe('#808080');
        expect(output.colors[1][1]).toBe('#808080');
      });

      test('applies darken effect uniformly to viewport', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#ffffff',
          layer: 0,
        });

        compositor.setLayerEffect(1, {
          color: '#000000',
          type: 'darken',
          strength: 0.5,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // All cells should be darkened by 50% toward black
        expect(output.colors[0][0]).toBe('#808080');
        expect(output.colors[0][1]).toBe('#808080');
        expect(output.colors[1][0]).toBe('#808080');
        expect(output.colors[1][1]).toBe('#808080');
      });

      test('applies multiply effect uniformly to viewport', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#ffffff',
          layer: 0,
        });

        compositor.setLayerEffect(1, {
          color: '#ff0000',
          type: 'multiply',
          strength: 1.0,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // White multiplied by red at full strength should be red
        expect(output.colors[0][0]).toBe('#ff0000');
        expect(output.colors[0][1]).toBe('#ff0000');
        expect(output.colors[1][0]).toBe('#ff0000');
        expect(output.colors[1][1]).toBe('#ff0000');
      });

      test('applies multiply-darken effect uniformly to viewport', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#ffffff',
          layer: 0,
        });

        compositor.setLayerEffect(1, {
          color: '#ff0000',
          type: 'multiply-darken',
          strength: 1.0,
          darkenFactor: 0.5,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // White multiplied by red, then darkened by 50%
        expect(output.colors[0][0]).toBe('#800000');
      });

      test('layer effect applied before rendering layer objects', () => {
        // Layer 0: white background
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#ffffff',
          layer: 0,
        });

        // Layer 1 effect: darken everything below
        compositor.setLayerEffect(1, {
          color: '#000000',
          type: 'darken',
          strength: 0.5,
        });

        // Layer 1 object: black character (should NOT be affected by layer 1 effect)
        addObjectLegacy(compositor, 'top', {
          content: [['@']],
          position: { x: 0, y: 0 },
          color: '#000000',
          layer: 1,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // [0,0] has layer 1 object '@' - should be black (not affected by its own layer effect)
        expect(output.characters[0][0]).toBe('@');
        expect(output.colors[0][0]).toBe('#000000');

        // [0,1] shows layer 0 through layer 1 effect - should be darkened
        expect(output.characters[0][1]).toBe('#');
        expect(output.colors[0][1]).toBe('#808080');
      });

      test('multiple layer effects stack correctly', () => {
        // Layer 0: white background
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#'], ['#', '#']],
          position: { x: 0, y: 0 },
          color: '#ffffff',
          layer: 0,
        });

        // Layer 1 effect: darken by 50%
        compositor.setLayerEffect(1, {
          color: '#000000',
          type: 'darken',
          strength: 0.5,
        });

        // Layer 2 effect: darken by 50% again
        compositor.setLayerEffect(2, {
          color: '#000000',
          type: 'darken',
          strength: 0.5,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // After first darken: #ffffff -> #808080
        // After second darken: #808080 -> #404040
        expect(output.colors[0][0]).toBe('#404040');
      });

      test('layer effect affects empty viewport cells', () => {
        // No objects, just a layer effect
        compositor.setLayerEffect(0, {
          color: '#ff0000',
          type: 'lighten',
          strength: 1.0,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // Empty cells default to black, then lightened toward red
        expect(output.colors[0][0]).toBe('#ff0000');
        expect(output.colors[0][1]).toBe('#ff0000');
      });

      test('layer effect with strength 0 has no effect', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#']],
          position: { x: 0, y: 0 },
          color: '#808080',
          layer: 0,
        });

        compositor.setLayerEffect(1, {
          color: '#ffffff',
          type: 'lighten',
          strength: 0.0,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // Original color unchanged
        expect(output.colors[0][0]).toBe('#808080');
      });

      test('layer effect interacts with object influence', () => {
        // Layer 0: black character with white lighten influence
        addObjectLegacy(compositor, 'obj', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: '#000000',
          layer: 0,
          influence: {
            radius: 2,  // Radius 2 so position [0,1] has 50% influence with linear falloff
            transform: { type: 'lighten', strength: 1.0, falloff: 'linear' }
          }
        });

        // Layer 1: multiply effect (red tint)
        compositor.setLayerEffect(1, {
          color: '#ff0000',
          type: 'multiply',
          strength: 1.0,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

        // [0,0] is black, layer effect multiplies: black * red = black
        expect(output.colors[0][0]).toBe('#000000');

        // [0,1] is influenced to be lighter (50% with linear falloff at distance 1, radius 2)
        // then multiplied by red - should have some red tint
        const color = output.colors[0][1];
        expect(color).not.toBe('#000000');
        // Red channel should be present
        const r = parseInt(color.slice(1, 3), 16);
        expect(r).toBeGreaterThan(0);
      });

      test('removing layer effect removes its rendering effect', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: '#000000',
          layer: 0,
        });

        compositor.setLayerEffect(1, {
          color: '#ffffff',
          type: 'lighten',
          strength: 1.0,
        });

        let output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
        expect(output.colors[0][0]).toBe('#ffffff');

        compositor.setLayerEffect(1, null);
        output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
        expect(output.colors[0][0]).toBe('#000000');
      });

      test('mixed effect types on different layers', () => {
        addObjectLegacy(compositor, 'bg', {
          content: [['#', '#']],
          position: { x: 0, y: 0 },
          color: '#808080',
          layer: 0,
        });

        // Layer 1: lighten toward white
        compositor.setLayerEffect(1, {
          color: '#ffffff',
          type: 'lighten',
          strength: 0.5,
        });

        // Layer 2: multiply by blue
        compositor.setLayerEffect(2, {
          color: '#0000ff',
          type: 'multiply',
          strength: 1.0,
        });

        const output = compositor.render({ x: 0, y: 0, width: 2, height: 1 });

        // Gray lightened 50% toward white: #808080 -> #c0c0c0
        // Then multiplied by blue: #c0c0c0 * #0000ff = #0000c0
        expect(output.colors[0][0]).toBe('#0000c0');
      });
    });
  });

  describe('Color Normalization', () => {
    test('normalizes uppercase hex colors to lowercase', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#FFFFFF',
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.colors[0][0]).toBe('#ffffff');
    });

    test('normalizes mixed case hex colors to lowercase', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#AbC123',
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.colors[0][0]).toBe('#abc123');
    });

    test('normalizes influence colors to lowercase', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#000000',
        influence: {
          radius: 1,
          color: '#FF0000',
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 1 });
      // Influence colors are normalized internally
      expect(output.colors[0][1]).not.toBe('#FF0000'); // Should be processed
    });

    test('normalizes layer effect colors to lowercase', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#808080',
      });
      compositor.setLayerEffect(0, { color: '#00FF00', type: 'lighten', strength: 0.5 });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      // Result should be normalized lowercase
      const color = output.colors[0][0];
      expect(color).toBe(color.toLowerCase());
    });
  });

  describe('Falloff Types', () => {
    test('linear falloff decreases steadily', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 3, transform: { type: 'lighten', strength: 1.0, falloff: 'linear' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 4, height: 1 });
      const colors = output.colors[0];

      // Linear falloff should show steady decrease
      expect(colors[0]).toBe('#ffffff'); // Object
      expect(colors[1] > colors[2]).toBe(true); // Decreasing
      expect(colors[2] > colors[3]).toBe(true); // Decreasing
    });

    test('quadratic falloff is gentler near center', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 5, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 6, height: 1 });
      expect(output.colors[0][0]).toBe('#ffffff');
      expect(output.colors[0][5]).toBe('#000000');
    });

    test('exponential falloff is steeper overall', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 5, transform: { type: 'lighten', strength: 1.0, falloff: 'exponential' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 6, height: 1 });
      expect(output.colors[0][0]).toBe('#ffffff');
      // Exponential should leave some influence at edge
      expect(output.colors[0][5]).not.toBe('#000000');
    });

    test('cubic falloff is very gentle near center', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 5, transform: { type: 'lighten', strength: 1.0, falloff: 'cubic' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 6, height: 1 });
      expect(output.colors[0][0]).toBe('#ffffff');
      expect(output.colors[0][5]).toBe('#000000');
    });

    test('diagonal distance calculation works correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 3, transform: { type: 'lighten', strength: 1.0, falloff: 'linear' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 3, height: 3 });
      const horizontal = output.colors[0][1];
      const diagonal = output.colors[1][1];

      // Diagonal should be darker (farther away)
      expect(diagonal < horizontal).toBe(true);
    });
  });

  describe('Layer Effects Stacking', () => {
    test('multiple layer effects accumulate correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#808080',
        layer: 2,
      });

      compositor.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.2 });
      compositor.setLayerEffect(1, { color: '#ffffff', type: 'lighten', strength: 0.3 });
      compositor.setLayerEffect(2, { color: '#ffffff', type: 'lighten', strength: 0.4 });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      // Should be lighter than original due to 3 stacked effects
      expect(output.colors[0][0] > '#808080').toBe(true);
    });

    test('layer effects on background cells', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });

      compositor.setLayerEffect(0, { color: '#ff0000', type: 'lighten', strength: 0.5 });
      compositor.setLayerEffect(1, { color: '#00ff00', type: 'lighten', strength: 0.5 });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 1 });

      // Both effects should apply to background
      expect(output.colors[0][1]).not.toBe('#000000');
    });

    test('removing layer effect works correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#808080',
        layer: 0,
      });

      compositor.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.5 });
      const withEffect = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      compositor.setLayerEffect(0, null);
      const withoutEffect = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      expect(withEffect.colors[0][0]).toBe('#c0c0c0');
      expect(withoutEffect.colors[0][0]).toBe('#808080');
    });

    test('effects on negative layer numbers work', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#808080',
        layer: 0,
      });

      compositor.setLayerEffect(-1, { color: '#ffffff', type: 'lighten', strength: 0.3 });
      compositor.setLayerEffect(0, { color: '#000000', type: 'darken', strength: 0.3 });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.colors[0][0]).not.toBe('#808080');
    });
  });

  describe('Influence Overlaps', () => {
    test('same-layer influences both affect background', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'left', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 3, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } },
      });
      addObjectLegacy(compositor, 'right', {
        content: [['@']],
        position: { x: 4, y: 0 },
        color: '#ffffff',
        influence: { radius: 3, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 5, height: 1 });

      // Position 1 should be influenced by left object
      expect(output.colors[0][1]).not.toBe('#000000');
    });

    test('different strength influences overlap', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'weak', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        influence: { radius: 3, transform: { type: 'lighten', strength: 0.2, falloff: 'linear' } },
      });
      addObjectLegacy(compositor, 'strong', {
        content: [['@']],
        position: { x: 6, y: 0 },
        color: '#ffffff',
        influence: { radius: 3, transform: { type: 'lighten', strength: 0.8, falloff: 'linear' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 7, height: 1 });
      // Position near weak object should show weak influence
      expect(output.colors[0][1]).not.toBe('#000000');
    });

    test('cross-layer influence works', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'bottom', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
        influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } },
      });
      addObjectLegacy(compositor, 'top', {
        content: [['@']],
        position: { x: 3, y: 0 },
        color: '#0000ff',
        layer: 1,
        influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } },
      });

      const output = compositor.render({ x: 0, y: 0, width: 4, height: 1 });
      expect(output.colors[0][1]).not.toBe('#000000');
    });

    test('multiply influences work with non-black backgrounds', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'bg', {
        content: [['#', '#', '#', '#', '#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });
      addObjectLegacy(compositor, 'red', {
        content: [['R']],
        position: { x: 1, y: 0 },
        color: '#ffffff',
        layer: 1,
        influence: {
          radius: 2,
          color: '#ff0000',
          transform: { type: 'multiply', strength: 1.0, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 5, height: 1 });
      // Position 0 should show red multiply influence on white background
      expect(output.colors[0][0]).not.toBe('#ffffff');
      expect(output.colors[0][0]).not.toBe('#000000');
    });

    test('glass pane effects can overlap', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'bg', {
        content: [['#', '#', '#', '#', '#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });
      addObjectLegacy(compositor, 'glass1', {
        content: [[' ']],
        position: { x: 1, y: 0 },
        color: '#ff0000',
        layer: 1,
        influence: {
          radius: 1,
          color: '#ff0000',
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });
      addObjectLegacy(compositor, 'glass2', {
        content: [[' ']],
        position: { x: 3, y: 0 },
        color: '#0000ff',
        layer: 1,
        influence: {
          radius: 1,
          color: '#0000ff',
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 5, height: 1 });

      // Glass position 1 should be tinted red
      expect(output.colors[0][1]).not.toBe('#ffffff');
      expect(output.characters[0][1]).toBe('#'); // Background shows through
    });
  });

  describe('Flip Operations', () => {
    test('horizontal flip reverses content correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['A', 'B', 'C']],
        position: { x: 0, y: 0 },
      });

      const before = compositor.render({ x: 0, y: 0, width: 3, height: 1 });
      compositor.getObject('obj').flipHorizontalToggle();
      const after = compositor.render({ x: 0, y: 0, width: 3, height: 1 });

      expect(before.characters[0].join('')).toBe('ABC');
      expect(after.characters[0].join('')).toBe('CBA');
    });

    test('vertical flip reverses rows correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['A'], ['B'], ['C']],
        position: { x: 0, y: 0 },
      });

      const before = compositor.render({ x: 0, y: 0, width: 1, height: 3 });
      compositor.getObject('obj').flipVerticalToggle();
      const after = compositor.render({ x: 0, y: 0, width: 1, height: 3 });

      expect(before.characters.map(r => r[0]).join('')).toBe('ABC');
      expect(after.characters.map(r => r[0]).join('')).toBe('CBA');
    });

    test('double flip works correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [
          ['1', '2'],
          ['3', '4'],
        ],
        position: { x: 0, y: 0 },
      });

      compositor.getObject('obj').flipHorizontalToggle();
      compositor.getObject('obj').flipVerticalToggle();
      const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      expect(output.characters[0].join('')).toBe('43');
      expect(output.characters[1].join('')).toBe('21');
    });

    test('flip preserves transparency', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#', null, '@']],
        position: { x: 0, y: 0 },
      });

      compositor.getObject('obj').flipHorizontalToggle();
      const output = compositor.render({ x: 0, y: 0, width: 3, height: 1 });

      expect(output.characters[0][0]).toBe('@');
      expect(output.characters[0][1]).toBe(' ');
      expect(output.characters[0][2]).toBe('#');
    });

    test('flip toggle returns to original', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['L', 'R']],
        position: { x: 0, y: 0 },
      });

      const orig = compositor.render({ x: 0, y: 0, width: 2, height: 1 });
      compositor.getObject('obj').flipHorizontalToggle();
      compositor.getObject('obj').flipHorizontalToggle();
      const toggled = compositor.render({ x: 0, y: 0, width: 2, height: 1 });

      expect(orig.characters[0].join('')).toBe(toggled.characters[0].join(''));
    });

    test('setFlipHorizontal sets specific state', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['A', 'B']],
        position: { x: 0, y: 0 },
      });

      compositor.getObject('obj').setFlipHorizontal(true);
      const flipped = compositor.render({ x: 0, y: 0, width: 2, height: 1 });

      compositor.getObject('obj').setFlipHorizontal(false);
      const normal = compositor.render({ x: 0, y: 0, width: 2, height: 1 });

      expect(flipped.characters[0].join('')).toBe('BA');
      expect(normal.characters[0].join('')).toBe('AB');
    });
  });

  describe('AutoDetectEdges', () => {
    test('detects edge spaces and makes them transparent', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [
          [' ', '#', ' '],
          ['#', '#', '#'],
          [' ', '#', ' '],
        ],
        position: { x: 0, y: 0 },
        autoDetectEdges: true,
      });

      const output = compositor.render({ x: 0, y: 0, width: 3, height: 3 });

      // Edge spaces should be transparent
      expect(output.characters[0][0]).toBe(' ');
      expect(output.characters[0][2]).toBe(' ');
    });

    test('preserves trapped spaces inside shape', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'donut', {
        content: [
          [' ', ' ', ' ', ' ', ' '],
          [' ', '#', '#', '#', ' '],
          [' ', '#', ' ', '#', ' '],
          [' ', '#', '#', '#', ' '],
          [' ', ' ', ' ', ' ', ' '],
        ],
        position: { x: 0, y: 0 },
        autoDetectEdges: true,
      });

      const output = compositor.render({ x: 0, y: 0, width: 5, height: 5 });

      // Middle space should be visible (trapped inside)
      expect(output.characters[2][2]).toBe(' ');
      expect(output.characters[1][1]).toBe('#');
    });

    test('all-spaces becomes fully transparent', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'invisible', {
        content: [
          [' ', ' '],
          [' ', ' '],
        ],
        position: { x: 0, y: 0 },
        autoDetectEdges: true,
        color: '#ff0000',
      });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      // All cells should be blank
      expect(output.characters.every(row => row.every(c => c === ' '))).toBe(true);
    });

    test('no spaces means autoDetect has no effect', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'solid', {
        content: [
          ['#', '#'],
          ['#', '#'],
        ],
        position: { x: 0, y: 0 },
        autoDetectEdges: true,
      });

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      // All cells should have content
      expect(output.characters.every(row => row.every(c => c === '#'))).toBe(true);
    });
  });

  describe('Negative Coordinates', () => {
    test('object at negative position renders correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: -5, y: -3 },
      });

      const output = compositor.render({ x: -6, y: -4, width: 3, height: 3 });
      expect(output.characters[1][1]).toBe('#');
    });

    test('negative viewport with positive objects shows blanks', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['A']],
        position: { x: 5, y: 5 },
      });

      const output = compositor.render({ x: -2, y: -2, width: 3, height: 3 });
      expect(output.characters.every(row => row.every(c => c === ' '))).toBe(true);
    });

    test('object spanning origin works correctly', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [
          ['1', '2'],
          ['3', '4'],
        ],
        position: { x: -1, y: -1 },
      });

      const output = compositor.render({ x: -1, y: -1, width: 2, height: 2 });
      expect(output.characters[0].join('')).toBe('12');
      expect(output.characters[1].join('')).toBe('34');
    });

    test('canvas bounds include negative coordinates', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'neg', {
        content: [['#']],
        position: { x: -10, y: -5 },
      });
      addObjectLegacy(compositor, 'pos', {
        content: [['@']],
        position: { x: 10, y: 5 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds.minX).toBe(-10);
      expect(bounds.minY).toBe(-5);
      expect(bounds.maxX).toBe(10);
      expect(bounds.maxY).toBe(5);
    });

    test('moving object to negative coordinates works', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['M']],
        position: { x: 0, y: 0 },
      });

      compositor.getObject('obj').setPosition(-3, -3 );
      const output = compositor.render({ x: -4, y: -4, width: 2, height: 2 });

      expect(output.characters[1][1]).toBe('M');
    });

    test('influence at negative coordinates works', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['#']],
        position: { x: -5, y: 0 },
        color: '#ff0000',
        influence: { radius: 2, transform: { type: 'lighten', strength: 0.5, falloff: 'linear' } },
      });

      const output = compositor.render({ x: -7, y: 0, width: 5, height: 1 });

      // Should see influence gradient
      expect(output.colors[0].some(c => c !== '#000000')).toBe(true);
    });

    test('layer effects work with negative viewport', () => {
      const compositor = new Compositor();
      addObjectLegacy(compositor, 'obj', {
        content: [['X']],
        position: { x: -3, y: -3 },
        color: '#808080',
        layer: 0,
      });
      compositor.setLayerEffect(0, { color: '#ffffff', type: 'lighten', strength: 0.5 });

      const output = compositor.render({ x: -4, y: -4, width: 2, height: 2 });
      expect(output.colors[1][1]).toBe('#c0c0c0');
    });
  });

  describe('Character Mirroring', () => {
    describe('Horizontal Mirror Map', () => {
      test('ASCII brackets mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '>', '(', ')', '[', ']', '{', '}']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['{', '}', '[', ']', '(', ')', '<', '>']]);
      });

      test('ASCII slashes mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['/', '\\']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['/', '\\']]);
      });

      test('box drawing corners mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['╔', '╗', '╚', '╝']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['╚', '╝', '╔', '╗']]);
      });

      test('box drawing light corners mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['┌', '┐', '└', '┘']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['└', '┘', '┌', '┐']]);
      });

      test('box drawing T-junctions mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['├', '┤', '╟', '╢', '╞', '╡']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['╞', '╡', '╟', '╢', '├', '┤']]);
      });

      test('arrows mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['←', '→', '↖', '↗', '↙', '↘']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['↙', '↘', '↖', '↗', '←', '→']]);
      });

      test('unmapped characters pass through unchanged', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['#', 'X', 'a', '1', '@']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['@', '1', 'a', 'X', '#']]);
      });

      test('null cells remain null', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', null, '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['<', null, '>']]);
      });

      test('mixed mapped and unmapped characters', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '#', '>', 'X']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['X', '<', '#', '>']]);
      });
    });

    describe('Vertical Mirror Map', () => {
      test('ASCII slashes mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['/'], ['\\']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['/'], ['\\']]);
      });

      test('ASCII carets mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['^'], ['v']]);
      });

      test('box drawing corners mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['╔', '╗'], ['╚', '╝']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['╔', '╗'], ['╚', '╝']]);
      });

      test('box drawing light corners mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['┌', '┐'], ['└', '┘']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['┌', '┐'], ['└', '┘']]);
      });

      test('box drawing T-junctions mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['┬', '╤', '╥'], ['┴', '╧', '╨']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['┬', '╤', '╥'], ['┴', '╧', '╨']]);
      });

      test('arrows mirror correctly', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['↑', '↖', '↗'], ['↓', '↙', '↘']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['↑', '↖', '↗'], ['↓', '↙', '↘']]);
      });

      test('unmapped characters pass through unchanged', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['#'], ['X'], ['a']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['a'], ['X'], ['#']]);
      });

      test('null cells remain null', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], [null], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['^'], [null], ['v']]);
      });
    });

    describe('Horizontal Flip with Mirroring', () => {
      test('default mirrorChars=false preserves current behavior', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '-', '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle();

        expect(obj.content).toEqual([['>', '-', '<']]);
        expect(obj.flipHorizontal).toBe(true);
      });

      test('mirrorChars=true transforms characters', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '-', '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['<', '-', '>']]);
        expect(obj.flipHorizontal).toBe(true);
      });

      test('toggle twice returns to original with mirroring', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '-', '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);
        obj.flipHorizontalToggle(true);

        expect(obj.content).toEqual([['<', '-', '>']]);
        expect(obj.flipHorizontal).toBe(false);
      });

      test('regenerates influence mask after mirrored flip', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<']],
          position: { x: 0, y: 0 },
          influence: {
            radius: 1,
            transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
          },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        const mask = obj.getInfluenceMask();
        expect(mask).toBeDefined();
        expect(mask.length).toBeGreaterThan(0);
      });

      test('marks dirty regions after mirrored flip', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.clearDirty();
        expect(obj.isDirty()).toBe(false);

        obj.flipHorizontalToggle(true);
        expect(obj.isDirty()).toBe(true);
      });
    });

    describe('Vertical Flip with Mirroring', () => {
      test('default mirrorChars=false preserves current behavior', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], ['|'], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle();

        expect(obj.content).toEqual([['v'], ['|'], ['^']]);
        expect(obj.flipVertical).toBe(true);
      });

      test('mirrorChars=true transforms characters', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], ['|'], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['^'], ['|'], ['v']]);
        expect(obj.flipVertical).toBe(true);
      });

      test('toggle twice returns to original with mirroring', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], ['|'], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipVerticalToggle(true);
        obj.flipVerticalToggle(true);

        expect(obj.content).toEqual([['^'], ['|'], ['v']]);
        expect(obj.flipVertical).toBe(false);
      });
    });

    describe('Combined Flip with Mirroring', () => {
      test('sequential application: H then V for corner chars', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['╔']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['╗']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['╝']]);
      });

      test('all four states for box corners', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['╔']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');

        expect(obj.content).toEqual([['╔']]);

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['╗']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['╝']]);

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['╚']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['╔']]);
      });

      test('slashes with combined flips', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['/']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['\\']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['/']]);

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['\\']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['/']]);
      });

      test('arrows with diagonal directions', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['↗']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['↖']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['↙']]);

        obj.flipHorizontalToggle(true);
        expect(obj.content).toEqual([['↘']]);

        obj.flipVerticalToggle(true);
        expect(obj.content).toEqual([['↗']]);
      });
    });

    describe('setFlipHorizontal with Mirroring', () => {
      test('sets flip state with mirroring', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.setFlipHorizontal(true, true);

        expect(obj.flipHorizontal).toBe(true);
        expect(obj.content).toEqual([['<', '>']]);
      });

      test('no-op when state unchanged', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.clearDirty();

        obj.setFlipHorizontal(false, true);

        expect(obj.isDirty()).toBe(false);
      });

      test('flips when state changes', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '>']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);
        expect(obj.flipHorizontal).toBe(true);

        obj.setFlipHorizontal(false, true);

        expect(obj.flipHorizontal).toBe(false);
        expect(obj.content).toEqual([['<', '>']]);
      });
    });

    describe('setFlipVertical with Mirroring', () => {
      test('sets flip state with mirroring', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.setFlipVertical(true, true);

        expect(obj.flipVertical).toBe(true);
        expect(obj.content).toEqual([['^'], ['v']]);
      });

      test('no-op when state unchanged', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['^'], ['v']],
          position: { x: 0, y: 0 },
        });

        const obj = compositor.getObject('obj');
        obj.clearDirty();

        obj.setFlipVertical(false, true);

        expect(obj.isDirty()).toBe(false);
      });
    });

    describe('Integration Tests', () => {
      test('object with influence maintains mask after mirrored flip', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '>']],
          position: { x: 0, y: 0 },
          influence: {
            radius: 2,
            transform: { type: 'lighten', strength: 0.5, falloff: 'quadratic' },
          },
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);
        obj.flipVerticalToggle(true);

        const mask = obj.getInfluenceMask();
        expect(mask).toBeDefined();
        expect(mask.length).toBeGreaterThan(0);
      });

      test('rendering output contains mirrored characters', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<', '>', '╔']],
          position: { x: 0, y: 0 },
          color: '#ffffff',
        });

        const obj = compositor.getObject('obj');
        obj.flipHorizontalToggle(true);

        const output = compositor.render({ x: 0, y: 0, width: 3, height: 1 });
        expect(output.characters[0]).toEqual(['╗', '<', '>']);
      });

      test('dirty bounds tracking with mirrored flips', () => {
        const compositor = new Compositor();
        addObjectLegacy(compositor, 'obj', {
          content: [['<']],
          position: { x: 5, y: 5 },
        });

        const obj = compositor.getObject('obj');
        obj.clearDirty();

        obj.flipHorizontalToggle(true);

        const dirtyBounds = obj.getDirtyBounds();
        expect(dirtyBounds).not.toBeNull();
        expect(dirtyBounds!.minX).toBe(5);
        expect(dirtyBounds!.minY).toBe(5);
      });
    });
  });
});
