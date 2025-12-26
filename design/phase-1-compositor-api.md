# Phase 1: ASCII Compositor - TypeScript API Design

## Overview

This document defines the complete TypeScript API for the ASCII Compositor module. The API prioritizes simplicity, type safety, and performance.

## Package Exports

```typescript
export { Compositor };
```

For initial implementation, only the Compositor class is exported. Types and interfaces remain internal.

## Core API

### Compositor Class

```typescript
class Compositor {
  constructor(initialObjects?: CompositorObject[], defaultViewport?: Viewport);

  // Object management
  addObject(id: string, options: AddObjectOptions): void;
  removeObject(id: string): void;
  moveObject(id: string, position: Position): void;
  flipHorizontal(id: string): void;
  flipVertical(id: string): void;
  setFlipHorizontal(id: string, flipped: boolean): void;
  setFlipVertical(id: string, flipped: boolean): void;
  getObject(id: string): CompositorObject;
  listObjects(): CompositorObject[];

  // Rendering
  render(viewport?: Viewport): RenderOutput;
  getCanvasBounds(): Bounds;
}
```

## Type Definitions

### Input Types

```typescript
/**
 * Content can be provided in three formats:
 * 1. Character matrix: [['a', 'b'], ['c', 'd']]
 * 2. String array: ['ab', 'cd'] (must be equal length)
 * 3. Newline string: 'ab\ncd' (lines must be equal length)
 *
 * null = transparent cell
 * ' ' = opaque space character
 */
type ContentInput = Cell[][] | string[] | string;
type Cell = string | null;

interface Position {
  x: number;  // Canvas position where object's (0,0) origin is placed (can be negative)
  y: number;  // Canvas position where object's (0,0) origin is placed (can be negative)
}

interface Influence {
  radius: number;  // Number of cells, must be positive integer
  transform: {
    type: 'lighten' | 'darken';  // Initial implementation only
    strength: number;  // 0.0 to 1.0, max effect at distance 0
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
  };
}

interface AddObjectOptions {
  content: ContentInput;
  position: Position;
  color?: string;  // Hex format: #RRGGBB (default: #000000)
  layer?: number;  // Integer, unlimited range (default: 0)
  influence?: Influence;  // Optional (default: none)
  autoDetectEdges?: boolean;  // Use flood fill for transparency (default: false)
}

interface Viewport {
  x: number;  // Top-left corner
  y: number;  // Top-left corner
  width: number;  // Must be positive
  height: number;  // Must be positive
}
```

### Output Types

```typescript
interface RenderOutput {
  characters: string[][];  // 2D grid [y][x], dimensions match viewport
  colors: string[][];      // 2D grid [y][x], hex colors, same dimensions
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface CompositorObject {
  id: string;
  content: Cell[][];  // Normalized to 2D array
  position: Position;
  layer: number;
  color: string;  // Always #RRGGBB format
  influence?: Influence;
  flipHorizontal: boolean;  // True if flipped horizontally
  flipVertical: boolean;    // True if flipped vertically
  bounds: Bounds;  // Cached bounds including influence
}
```

## Constructor

```typescript
new Compositor(initialObjects?: CompositorObject[], defaultViewport?: Viewport)
```

**Parameters:**
- `initialObjects` - Optional array of objects to add at construction
- `defaultViewport` - Optional default viewport for render() calls

**Behavior:**
- Creates empty compositor if no objects provided
- Processes initial objects same as addObject() calls
- Throws if any initial object is invalid
- Default viewport can be overridden on render() call

**Example:**
```typescript
const compositor = new Compositor(
  [
    {
      id: 'bg',
      content: ['####', '####'],
      position: {x: 0, y: 0},
      color: '#ff0000',
      layer: 0
    }
  ],
  { x: 0, y: 0, width: 10, height: 10 }
);
```

## Object Management Methods

### addObject

```typescript
addObject(id: string, options: AddObjectOptions): void
```

**Parameters:**
- `id` - Unique identifier (user-supplied, required)
- `options` - Object configuration

**Behavior:**
- Accepts content in any of three formats (matrix, string array, newline string)
- Normalizes content to Cell[][] internally
- If `autoDetectEdges` is true, applies flood fill algorithm to mark outer spaces as null
- Generates influence mask if influence provided
- Computes and caches object bounds (including influence radius)
- Marks affected regions as dirty
- Throws if ID already exists
- Throws if content format invalid (ragged arrays, empty content)
- Throws if color not valid #RRGGBB format
- Throws if influence radius not positive integer

**Content validation:**
- String array: All strings must have equal length
- Newline string: All lines must have equal length after split
- Character matrix: All rows must have equal length
- Content must be non-empty (at least one cell)

**Examples:**
```typescript
// Character matrix
compositor.addObject('obj1', {
  content: [['#', '#'], ['#', null]],  // null = transparent
  position: {x: 5, y: 5},
  color: '#ff0000',
  layer: 1
});

// String array
compositor.addObject('obj2', {
  content: ['####', '####'],
  position: {x: 0, y: 0},
  layer: 0
});

// Newline string with auto-edge detection
compositor.addObject('obj3', {
  content: '  ####  \n  #  #  \n  ####  ',
  position: {x: 10, y: 10},
  autoDetectEdges: true,  // Outer spaces become transparent
  influence: {
    radius: 2,
    transform: {
      type: 'lighten',
      strength: 0.5,
      falloff: 'linear'
    }
  }
});
```

**Errors thrown:**
- `Error: Object with id '${id}' already exists`
- `Error: Invalid content format: rows have unequal lengths`
- `Error: Invalid color format: must be #RRGGBB`
- `Error: Influence radius must be positive integer`

### removeObject

```typescript
removeObject(id: string): void
```

**Parameters:**
- `id` - Object identifier

**Behavior:**
- Removes object from scene
- Marks affected regions as dirty (including influence area)
- Throws if object ID not found

**Example:**
```typescript
compositor.removeObject('obj1');
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### moveObject

```typescript
moveObject(id: string, position: Position): void
```

**Parameters:**
- `id` - Object identifier
- `position` - New position {x, y}

**Behavior:**
- Updates object position
- Marks old and new regions as dirty (including influence areas)
- Allows moving objects to any position (including negative coordinates)
- Objects remain immutable (creates new internal object with updated position)
- Throws if object ID not found

**Example:**
```typescript
compositor.moveObject('obj1', {x: 10, y: 20});
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### flipHorizontal

```typescript
flipHorizontal(id: string): void
```

**Parameters:**
- `id` - Object identifier

**Behavior:**
- Toggles horizontal flip state (left-to-right mirror)
- Flips object content matrix horizontally
- Regenerates influence mask (if object has influence)
- Marks old and new regions as dirty (including influence areas)
- Throws if object ID not found

**Example:**
```typescript
compositor.flipHorizontal('obj1');  // Toggle flip state
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### flipVertical

```typescript
flipVertical(id: string): void
```

**Parameters:**
- `id` - Object identifier

**Behavior:**
- Toggles vertical flip state (top-to-bottom mirror)
- Flips object content matrix vertically
- Regenerates influence mask (if object has influence)
- Marks old and new regions as dirty (including influence areas)
- Throws if object ID not found

**Example:**
```typescript
compositor.flipVertical('obj1');  // Toggle flip state
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### setFlipHorizontal

```typescript
setFlipHorizontal(id: string, flipped: boolean): void
```

**Parameters:**
- `id` - Object identifier
- `flipped` - Desired flip state

**Behavior:**
- Sets horizontal flip to specific state
- If state unchanged, no-op (no dirty marking)
- If state changes, flips content and regenerates influence mask
- Marks old and new regions as dirty (including influence areas)
- Throws if object ID not found

**Example:**
```typescript
compositor.setFlipHorizontal('obj1', true);   // Ensure flipped
compositor.setFlipHorizontal('obj1', false);  // Ensure not flipped
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### setFlipVertical

```typescript
setFlipVertical(id: string, flipped: boolean): void
```

**Parameters:**
- `id` - Object identifier
- `flipped` - Desired flip state

**Behavior:**
- Sets vertical flip to specific state
- If state unchanged, no-op (no dirty marking)
- If state changes, flips content and regenerates influence mask
- Marks old and new regions as dirty (including influence areas)
- Throws if object ID not found

**Example:**
```typescript
compositor.setFlipVertical('obj1', true);   // Ensure flipped
compositor.setFlipVertical('obj1', false);  // Ensure not flipped
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### getObject

```typescript
getObject(id: string): CompositorObject
```

**Parameters:**
- `id` - Object identifier

**Returns:**
- Readonly view of object (deep clone to prevent mutation)

**Behavior:**
- Returns object details with normalized content (always Cell[][])
- Content is immutable - modifications won't affect compositor
- Throws if object ID not found

**Example:**
```typescript
const obj = compositor.getObject('obj1');
console.log(obj.position);        // {x: 5, y: 5}
console.log(obj.color);           // '#ff0000'
console.log(obj.layer);           // 1
console.log(obj.flipHorizontal);  // false
console.log(obj.flipVertical);    // true
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### listObjects

```typescript
listObjects(): CompositorObject[]
```

**Returns:**
- Array of all objects (readonly clones)

**Behavior:**
- Returns objects in no particular order (not sorted by layer)
- Each object is a deep clone to prevent mutation
- Empty array if no objects

**Example:**
```typescript
const objects = compositor.listObjects();
console.log(`Total objects: ${objects.length}`);
objects.forEach(obj => console.log(obj.id, obj.layer));
```

## Rendering Methods

### render

```typescript
render(viewport?: Viewport): RenderOutput
```

**Parameters:**
- `viewport` - Optional viewport (uses default from constructor if omitted)

**Returns:**
- `RenderOutput` with character and color grids

**Behavior:**
- Only recomputes dirty regions (optimization via dirty tracking)
- Returns cached result if nothing changed in viewport
- Viewport can extend beyond canvas - pads with blank spaces
- Viewport can be entirely off-canvas - returns all blank spaces
- Implements top-down rendering algorithm with transparency accumulation
- Applies influence masks and color transforms

**Rendering algorithm:**
1. For each cell in viewport:
   - Start at topmost layer
   - Accumulate transparency values (0-100%)
   - When content found, apply accumulated transforms to color
   - Return rendered character and transformed color
2. Cells outside canvas bounds render as ' ' with color '#000000'

**Example:**
```typescript
// Render specific viewport
const output = compositor.render({
  x: 0,
  y: 0,
  width: 20,
  height: 10
});

console.log(output.characters[0][0]);  // First character
console.log(output.colors[0][0]);      // Its color (hex)

// Render using default viewport (from constructor)
const output2 = compositor.render();
```

**Errors thrown:**
- `Error: No viewport specified and no default viewport set`
- `Error: Viewport width and height must be positive`

### getCanvasBounds

```typescript
getCanvasBounds(): Bounds
```

**Returns:**
- Current canvas bounds based on all objects

**Behavior:**
- Returns minimal bounding box containing all objects (including influence)
- If no objects, returns {minX: 0, minY: 0, maxX: 0, maxY: 0}
- Bounds update automatically as objects are added/moved/removed

**Example:**
```typescript
const bounds = compositor.getCanvasBounds();
console.log(`Canvas: ${bounds.minX},${bounds.minY} to ${bounds.maxX},${bounds.maxY}`);
const width = bounds.maxX - bounds.minX + 1;
const height = bounds.maxY - bounds.minY + 1;
```

## Error Handling

All methods throw standard JavaScript `Error` objects with descriptive messages.

**Common error categories:**
- Invalid input format
- Object not found
- Duplicate ID
- Invalid color format
- Invalid viewport dimensions

**Best practice:**
```typescript
try {
  compositor.addObject('obj1', options);
} catch (error) {
  console.error('Failed to add object:', error.message);
}
```

## Performance Characteristics

### Dirty Region Tracking

The compositor maintains a dirty region grid to optimize rendering:

- **addObject**: Marks object bounds (including influence) as dirty
- **removeObject**: Marks old object bounds as dirty
- **moveObject**: Marks both old and new bounds as dirty
- **flipHorizontal/flipVertical/setFlipHorizontal/setFlipVertical**: Marks old and new bounds as dirty (content dimensions may change after flip)
- **render**: Only recomputes dirty regions, returns cached for clean regions

### Layer Management

Layers are maintained in a sorted array for efficient rendering:

- Insertion: O(n) where n = number of unique layers (typically small)
- Rendering: O(objects) per dirty cell

### Space Complexity

- Base scene: O(objects)
- Influence masks: O(objects × (content_size + influence_radius²))
- Dirty grid: O(viewport_width × viewport_height) or canvas size
- Render cache: O(viewport_width × viewport_height)

## Usage Examples

### Basic Scene

```typescript
const compositor = new Compositor();

// Add background
compositor.addObject('bg', {
  content: ['==========', '==========', '=========='],
  position: {x: 0, y: 0},
  color: '#0000ff',
  layer: 0
});

// Add foreground object with influence
compositor.addObject('hero', {
  content: ['@'],
  position: {x: 5, y: 1},
  color: '#ffff00',
  layer: 1,
  influence: {
    radius: 2,
    transform: {
      type: 'lighten',
      strength: 0.4,
      falloff: 'quadratic'
    }
  }
});

// Render
const output = compositor.render({x: 0, y: 0, width: 10, height: 3});
```

### Animation Loop

```typescript
const compositor = new Compositor([], {x: 0, y: 0, width: 40, height: 20});

compositor.addObject('player', {
  content: ['O', '|', '/\\'],
  position: {x: 10, y: 10},
  color: '#00ff00',
  layer: 1
});

// Animation frame
function update(dt: number) {
  const player = compositor.getObject('player');
  compositor.moveObject('player', {
    x: player.position.x + 1,
    y: player.position.y
  });

  const output = compositor.render();  // Uses default viewport
  displayOutput(output);
}
```

### Complex Scene with Edge Detection

```typescript
const compositor = new Compositor();

// Cloud with automatic edge detection
compositor.addObject('cloud', {
  content: [
    '    ###     ',
    '  #######   ',
    ' ######### ',
    '###########'
  ],
  position: {x: 5, y: 2},
  color: '#ffffff',
  layer: 2,
  autoDetectEdges: true,  // Outer spaces become transparent
  influence: {
    radius: 3,
    transform: {
      type: 'lighten',
      strength: 0.3,
      falloff: 'exponential'
    }
  }
});
```

## Implementation Notes

### Content Normalization

When accepting different content formats, normalize to Cell[][] immediately:

```typescript
function normalizeContent(content: ContentInput): Cell[][] {
  if (typeof content === 'string') {
    // Newline string
    const lines = content.split('\n');
    return normalizeStringArray(lines);
  } else if (Array.isArray(content) && typeof content[0] === 'string') {
    // String array
    return normalizeStringArray(content as string[]);
  } else {
    // Cell matrix - validate and clone
    return validateAndCloneMatrix(content as Cell[][]);
  }
}
```

### Color Validation

```typescript
function isValidColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
```

### Influence Mask Caching

Generate influence masks once when object is added, store with object:

```typescript
interface InternalObject {
  id: string;
  content: Cell[][];
  position: Position;
  layer: number;
  color: string;
  influence?: Influence;
  flipHorizontal: boolean;
  flipVertical: boolean;
  influenceMask: (number | null)[][];  // Pre-computed, reflects current flip state
  bounds: Bounds;  // Including influence radius
}
```

## Related Documents

- [phase-1-compositor-design.md](phase-1-compositor-design.md) - Design decisions and architecture
