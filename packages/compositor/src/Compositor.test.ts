import { describe, test, expect, beforeEach } from 'vitest';
import { Compositor } from './Compositor';

describe('Compositor', () => {
  describe('Constructor', () => {
    test('creates empty compositor', () => {
      const compositor = new Compositor();
      expect(compositor.listObjects()).toEqual([]);
    });

    test('creates compositor with initial objects', () => {
      const compositor = new Compositor([
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
      const compositor = new Compositor([], { x: 0, y: 0, width: 10, height: 10 });
      const output = compositor.render();
      expect(output.characters).toHaveLength(10);
      expect(output.characters[0]).toHaveLength(10);
    });

    test('throws on invalid initial object', () => {
      expect(() => {
        new Compositor([
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
        new Compositor([
          {
            content: [['#']],
            position: { x: 0, y: 0 },
          } as any,
        ]);
      }).toThrow('Invalid initial object: missing required fields (id, content, position)');
    });

    test('throws on initial object missing content', () => {
      expect(() => {
        new Compositor([
          {
            id: 'obj1',
            position: { x: 0, y: 0 },
          } as any,
        ]);
      }).toThrow('Invalid initial object: missing required fields (id, content, position)');
    });

    test('throws on initial object missing position', () => {
      expect(() => {
        new Compositor([
          {
            id: 'obj1',
            content: [['#']],
          } as any,
        ]);
      }).toThrow('Invalid initial object: missing required fields (id, content, position)');
    });
  });

  describe('addObject', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('adds object with character matrix', () => {
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
        content: ['##', '##'],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content).toEqual([['#', '#'], ['#', '#']]);
    });

    test('adds object with newline string', () => {
      compositor.addObject('obj1', {
        content: '##\n##',
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content).toEqual([['#', '#'], ['#', '#']]);
    });

    test('adds object with custom color and layer', () => {
      compositor.addObject('obj1', {
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
        compositor.addObject('obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          layer: 1.5,
        });
      }).toThrow('Layer must be an integer');
    });

    test('adds object with null (transparent) cells', () => {
      compositor.addObject('obj1', {
        content: [['#', null], [null, '#']],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content[0][1]).toBe(null);
      expect(obj.content[1][0]).toBe(null);
    });

    test('adds object with negative position', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: -5, y: -10 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.position).toEqual({ x: -5, y: -10 });
    });

    test('adds object with influence', () => {
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      expect(() => {
        compositor.addObject('obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
        });
      }).toThrow("Object with id 'obj1' already exists");
    });

    test('throws on ragged character matrix', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: [['a', 'b'], ['c']],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on ragged string array', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: ['ab', 'c'],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on ragged newline string', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: 'ab\nc',
          position: { x: 0, y: 0 },
        });
      }).toThrow('Invalid content format: rows have unequal lengths');
    });

    test('throws on invalid color format', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: 'red',
        });
      }).toThrow('Invalid color format: must be #RRGGBB');
    });

    test('throws on short hex color', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: '#f00',
        });
      }).toThrow('Invalid color format: must be #RRGGBB');
    });

    test('throws on missing # in color', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: [['#']],
          position: { x: 0, y: 0 },
          color: 'ff0000',
        });
      }).toThrow('Invalid color format: must be #RRGGBB');
    });

    test('throws on non-positive influence radius', () => {
      expect(() => {
        compositor.addObject('obj1', {
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
        compositor.addObject('obj1', {
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
        compositor.addObject('obj1', {
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
        compositor.addObject('obj1', {
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
        compositor.addObject('obj1', {
          content: [],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Content must be non-empty');
    });

    test('throws on empty row', () => {
      expect(() => {
        compositor.addObject('obj1', {
          content: [[]],
          position: { x: 0, y: 0 },
        });
      }).toThrow('Content must be non-empty');
    });

    test('accepts content with only spaces', () => {
      compositor.addObject('obj1', {
        content: [[' ', ' '], [' ', ' ']],
        position: { x: 0, y: 0 },
      });

      const obj = compositor.getObject('obj1');
      expect(obj.content).toEqual([[' ', ' '], [' ', ' ']]);
    });

    test('renders spaces without influence as opaque', () => {
      compositor.addObject('bg', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('fg', {
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
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
    });

    test('moves object to new position', () => {
      compositor.moveObject('obj1', { x: 5, y: 10 });
      const obj = compositor.getObject('obj1');
      expect(obj.position).toEqual({ x: 5, y: 10 });
    });

    test('moves object to negative position', () => {
      compositor.moveObject('obj1', { x: -5, y: -10 });
      const obj = compositor.getObject('obj1');
      expect(obj.position).toEqual({ x: -5, y: -10 });
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.moveObject('nonexistent', { x: 0, y: 0 });
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('flipHorizontal', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      compositor.addObject('obj1', {
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

      compositor.flipHorizontal('obj1');
      const obj2 = compositor.getObject('obj1');
      expect(obj2.flipHorizontal).toBe(true);
      expect(obj2.content).toEqual([
        ['b', 'a'],
        ['d', 'c'],
      ]);

      compositor.flipHorizontal('obj1');
      const obj3 = compositor.getObject('obj1');
      expect(obj3.flipHorizontal).toBe(false);
      expect(obj3.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.flipHorizontal('nonexistent');
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('flipVertical', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      compositor.addObject('obj1', {
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

      compositor.flipVertical('obj1');
      const obj2 = compositor.getObject('obj1');
      expect(obj2.flipVertical).toBe(true);
      expect(obj2.content).toEqual([
        ['c', 'd'],
        ['a', 'b'],
      ]);

      compositor.flipVertical('obj1');
      const obj3 = compositor.getObject('obj1');
      expect(obj3.flipVertical).toBe(false);
      expect(obj3.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.flipVertical('nonexistent');
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('setFlipHorizontal', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      compositor.addObject('obj1', {
        content: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('sets horizontal flip to true', () => {
      compositor.setFlipHorizontal('obj1', true);
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(true);
      expect(obj.content).toEqual([
        ['b', 'a'],
        ['d', 'c'],
      ]);
    });

    test('sets horizontal flip to false', () => {
      compositor.flipHorizontal('obj1'); // Flip it first
      compositor.setFlipHorizontal('obj1', false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('no-op when setting to current state', () => {
      compositor.setFlipHorizontal('obj1', false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipHorizontal).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.setFlipHorizontal('nonexistent', true);
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('setFlipVertical', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      compositor.addObject('obj1', {
        content: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('sets vertical flip to true', () => {
      compositor.setFlipVertical('obj1', true);
      const obj = compositor.getObject('obj1');
      expect(obj.flipVertical).toBe(true);
      expect(obj.content).toEqual([
        ['c', 'd'],
        ['a', 'b'],
      ]);
    });

    test('sets vertical flip to false', () => {
      compositor.flipVertical('obj1'); // Flip it first
      compositor.setFlipVertical('obj1', false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipVertical).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('no-op when setting to current state', () => {
      compositor.setFlipVertical('obj1', false);
      const obj = compositor.getObject('obj1');
      expect(obj.flipVertical).toBe(false);
      expect(obj.content).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });

    test('throws on non-existent ID', () => {
      expect(() => {
        compositor.setFlipVertical('nonexistent', true);
      }).toThrow("Object with id 'nonexistent' not found");
    });
  });

  describe('Combined flips', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
      compositor.addObject('obj1', {
        content: [
          ['a', 'b', 'c'],
          ['d', 'e', 'f'],
          ['g', 'h', 'i'],
        ],
        position: { x: 0, y: 0 },
      });
    });

    test('applies both horizontal and vertical flips', () => {
      compositor.flipHorizontal('obj1');
      compositor.flipVertical('obj1');
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
      compositor.flipHorizontal('obj1');
      compositor.flipVertical('obj1');
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
      compositor.addObject('obj1', {
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

    test('returns immutable object', () => {
      const obj = compositor.getObject('obj1');
      obj.content[0][0] = 'X';

      const obj2 = compositor.getObject('obj1');
      expect(obj2.content[0][0]).toBe('#');
    });

    test('prevents influence corruption from user mutations', () => {
      // Test 1: Mutating influence object after addObject should not corrupt internal state
      const influence = {
        radius: 2,
        transform: { type: 'lighten' as const, strength: 0.5, falloff: 'linear' as const },
      };
      compositor.addObject('obj2', {
        content: [['#']],
        position: { x: 0, y: 0 },
        influence,
      });

      // Mutate the original influence object
      influence.radius = 10;
      influence.transform.strength = 1.0;
      influence.transform.type = 'darken';

      // Verify internal state not corrupted
      const obj = compositor.getObject('obj2');
      expect(obj.influence?.radius).toBe(2);
      expect(obj.influence?.transform.strength).toBe(0.5);
      expect(obj.influence?.transform.type).toBe('lighten');

      // Test 2: Mutating returned influence object should not corrupt internal state
      obj.influence!.radius = 20;
      obj.influence!.transform.strength = 0.9;
      obj.influence!.transform.falloff = 'cubic';

      const obj2 = compositor.getObject('obj2');
      expect(obj2.influence?.radius).toBe(2);
      expect(obj2.influence?.transform.strength).toBe(0.5);
      expect(obj2.influence?.transform.falloff).toBe('linear');
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
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
      compositor.addObject('obj2', {
        content: [['*']],
        position: { x: 5, y: 5 },
      });

      const objects = compositor.listObjects();
      expect(objects).toHaveLength(2);
      expect(objects.map(o => o.id).sort()).toEqual(['obj1', 'obj2']);
    });

    test('returns immutable objects', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const objects = compositor.listObjects();
      objects[0].content[0][0] = 'X';

      const obj = compositor.getObject('obj1');
      expect(obj.content[0][0]).toBe('#');
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
      compositor.addObject('obj1', {
        content: [['#', '#'], ['#', '#']],
        position: { x: 5, y: 10 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: 5, minY: 10, maxX: 6, maxY: 11 });
    });

    test('returns bounds for multiple objects', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });
      compositor.addObject('obj2', {
        content: [['#']],
        position: { x: 10, y: 20 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
    });

    test('includes negative positions', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: -5, y: -10 },
      });

      const bounds = compositor.getCanvasBounds();
      expect(bounds).toEqual({ minX: -5, minY: -10, maxX: -5, maxY: -10 });
    });

    test('includes influence radius in bounds', () => {
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
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
      compositor.addObject('bg', {
        content: [['*', '*'], ['*', '*']],
        position: { x: 0, y: 0 },
        color: '#0000ff',
        layer: 0,
      });
      compositor.addObject('fg', {
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
      compositor.addObject('layer0', {
        content: [['A']],
        position: { x: 0, y: 0 },
        layer: 0,
      });
      compositor.addObject('layer1', {
        content: [['B']],
        position: { x: 0, y: 0 },
        layer: 1,
      });
      compositor.addObject('layer-1', {
        content: [['C']],
        position: { x: 0, y: 0 },
        layer: -1,
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('B'); // Layer 1 on top
    });

    test('renders same-layer objects (first added wins)', () => {
      compositor.addObject('first', {
        content: [['A']],
        position: { x: 0, y: 0 },
        layer: 0,
      });
      compositor.addObject('second', {
        content: [['B']],
        position: { x: 0, y: 0 },
        layer: 0,
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('A'); // First added wins
    });

    test('renders with viewport larger than canvas', () => {
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 5, y: 5 },
      });

      const output = compositor.render({ x: 5, y: 5, width: 1, height: 1 });
      expect(output.characters[0][0]).toBe('#');
    });

    test('renders viewport entirely off canvas (all blanks)', () => {
      compositor.addObject('obj1', {
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
      const comp = new Compositor([], { x: 0, y: 0, width: 2, height: 2 });
      comp.addObject('obj1', {
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
      compositor.addObject('obj1', {
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
      compositor.addObject('obj1', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('upper', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('upper', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('upper', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('upper', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ffffff',
        layer: 0,
      });

      compositor.addObject('upper', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('layer1', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.3, falloff: 'linear' },
        },
      });

      compositor.addObject('layer2', {
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
      compositor.addObject('base', {
        content: [['#']],
        position: { x: 0, y: 0 },
        color: '#ff0000',
        layer: 0,
      });

      compositor.addObject('layer1', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 1,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.6, falloff: 'linear' },
        },
      });

      compositor.addObject('layer2', {
        content: [[' ']],
        position: { x: 0, y: 0 },
        layer: 2,
        influence: {
          radius: 1,
          transform: { type: 'lighten', strength: 0.5, falloff: 'linear' },
        },
      });

      const output = compositor.render({ x: 0, y: 0, width: 1, height: 1 });

      // Total transparency: 60 + 50 = 110% => should render as blank
      expect(output.characters[0][0]).toBe(' ');
    });
  });

  describe('Dirty region optimization', () => {
    let compositor: Compositor;

    beforeEach(() => {
      compositor = new Compositor();
    });

    test('caches render output when nothing changes', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      // Should return same cached result
      expect(output2.characters).toEqual(output1.characters);
    });

    test('prevents cache corruption from user mutations', () => {
      compositor.addObject('obj1', {
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

      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output2.characters).not.toEqual(output1.characters);
    });

    test('invalidates cache when object moved', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 3, height: 3 });

      compositor.moveObject('obj1', { x: 1, y: 1 });

      const output2 = compositor.render({ x: 0, y: 0, width: 3, height: 3 });
      expect(output2.characters).not.toEqual(output1.characters);
    });

    test('invalidates cache when object removed', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      const output1 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });

      compositor.removeObject('obj1');

      const output2 = compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      expect(output2.characters).not.toEqual(output1.characters);
    });

    test('invalidates cache when object flipped', () => {
      compositor.addObject('obj1', {
        content: [['a', 'b']],
        position: { x: 0, y: 0 },
      });

      compositor.render({ x: 0, y: 0, width: 2, height: 1 });

      compositor.flipHorizontal('obj1');

      const output = compositor.render({ x: 0, y: 0, width: 2, height: 1 });
      expect(output.characters[0]).toEqual(['b', 'a']);
    });

    test('re-renders when viewport changes', () => {
      compositor.addObject('obj1', {
        content: [['#']],
        position: { x: 0, y: 0 },
      });

      compositor.render({ x: 0, y: 0, width: 2, height: 2 });
      const output2 = compositor.render({ x: 1, y: 1, width: 2, height: 2 });

      // Different viewport should trigger re-render
      expect(output2.characters[0][0]).toBe(' ');
    });
  });
});
