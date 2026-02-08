# Phase 1: ASCII Compositor - TypeScript API Design

## Overview

This document defines the complete TypeScript API for the ASCII Compositor module. The API prioritizes simplicity, type safety, and performance.

## Package Exports

```typescript
export { Compositor };
export type { AddObjectOptions, InitialObject, CompositorObject, RenderOutput, LayerEffect, Influence };
```

The Compositor class and essential TypeScript interfaces are exported for public use. Internal types (Cell, Position, Bounds, Viewport, InternalObject) remain private.

## Core API

### Compositor Class

```typescript
class Compositor {
  constructor(initialObjects?: InitialObject[], defaultViewport?: Viewport);

  // Object management
  addObject(id: string, options: AddObjectOptions): void;
  removeObject(id: string): void;
  moveObject(id: string, position: Position): void;
  getObject(id: string): AsciiObject;
  listObjects(): AsciiObject[];

  // Layer effects - uniform color transformations applied to entire layers
  setLayerEffect(layer: number, effect: LayerEffect | null): void;
  getLayerEffect(layer: number): LayerEffect | null;

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
  color?: string;  // Override color for influence (hex #RRGGBB). If not specified, uses object's color
  transform: {
    type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
    strength: number;  // 0.0 to 1.0, max effect at distance 0
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
    darkenFactor?: number;  // 0.0 to 1.0, only for multiply-darken (default: 0.8)
  };
}

interface LayerEffect {
  color: string;  // Target color for the effect (hex #RRGGBB)
  type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
  strength: number;  // 0.0 to 1.0, effect intensity
  darkenFactor?: number;  // 0.0 to 1.0, only for multiply-darken (default: 0.8)
}

interface AddObjectOptions {
  content: ContentInput;
  position: Position;
  color?: string;  // Hex format: #RRGGBB (default: #000000)
  layer?: number;  // Integer, unlimited range (default: 0)
  influence?: Influence;  // Optional (default: none)
  autoDetectEdges?: boolean;  // Use flood fill for transparency (default: false)
}

interface InitialObject extends AddObjectOptions {
  id: string;  // Unique identifier for the object
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
new Compositor(initialObjects?: Partial<CompositorObject>[], defaultViewport?: Viewport)
```

**Parameters:**
- `initialObjects` - Optional array of partial objects to add at construction. Only `id`, `content`, and `position` are required; computed fields like `bounds`, `flipHorizontal`, and `flipVertical` are generated automatically.
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

**Errors thrown:**
- `Error: Invalid initial object: missing required fields (id, content, position)`
- All errors from `addObject()` (see addObject error list)

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
- `Error: Content must be non-empty`
- `Error: Invalid content format: rows have unequal lengths`
- `Error: Invalid color format: must be #RRGGBB`
- `Error: Layer must be an integer`
- `Error: Influence radius must be positive integer`
- `Error: Influence strength must be between 0.0 and 1.0`

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

### flipHorizontalToggle

```typescript
flipHorizontalToggle(mirrorChars?: boolean): void
```

Called on AsciiObject returned from `getObject()`.

**Parameters:**
- `mirrorChars` - Optional. If true, applies character mirroring during flip (default: false)

**Behavior:**
- Toggles horizontal flip state (left-to-right mirror)
- Flips object content matrix horizontally
- If `mirrorChars` is true, transforms characters using horizontal mirror map (`<` ↔ `>`, `(` ↔ `)`, etc.)
- Regenerates influence mask (if object has influence)
- Marks old and new regions as dirty (including influence areas)

**Example:**
```typescript
// Without character mirroring (default)
const obj = compositor.getObject('obj1');
obj.flipHorizontalToggle();  // Positions flip, characters stay same

// With character mirroring
const obj2 = compositor.getObject('obj2');
obj2.flipHorizontalToggle(true);  // Positions AND characters flip
```

**Character mirroring:**
When `mirrorChars` is true, directional characters are replaced with their mirror equivalents:
- ASCII brackets: `<` ↔ `>`, `(` ↔ `)`, `[` ↔ `]`, `{` ↔ `}`
- ASCII slashes: `/` ↔ `\`
- Box drawing: `╔` ↔ `╗`, `╚` ↔ `╝`, `┌` ↔ `┐`, `└` ↔ `┘`, `├` ↔ `┤`
- Arrows: `←` ↔ `→`, `↖` ↔ `↗`, `↙` ↔ `↘`
- Unmapped characters pass through unchanged

### flipVerticalToggle

```typescript
flipVerticalToggle(mirrorChars?: boolean): void
```

Called on AsciiObject returned from `getObject()`.

**Parameters:**
- `mirrorChars` - Optional. If true, applies character mirroring during flip (default: false)

**Behavior:**
- Toggles vertical flip state (top-to-bottom mirror)
- Flips object content matrix vertically
- If `mirrorChars` is true, transforms characters using vertical mirror map (`^` ↔ `v`, `/` ↔ `\`, etc.)
- Regenerates influence mask (if object has influence)
- Marks old and new regions as dirty (including influence areas)

**Example:**
```typescript
// Without character mirroring (default)
const obj = compositor.getObject('obj1');
obj.flipVerticalToggle();  // Positions flip, characters stay same

// With character mirroring
const obj2 = compositor.getObject('obj2');
obj2.flipVerticalToggle(true);  // Positions AND characters flip
```

**Character mirroring:**
When `mirrorChars` is true, directional characters are replaced with their mirror equivalents:
- ASCII slashes: `/` ↔ `\`
- ASCII carets: `^` ↔ `v`
- Box drawing: `╔` ↔ `╚`, `╗` ↔ `╝`, `┌` ↔ `└`, `┐` ↔ `┘`, `┬` ↔ `┴`
- Arrows: `↑` ↔ `↓`, `↖` ↔ `↙`, `↗` ↔ `↘`
- Unmapped characters pass through unchanged

### setFlipHorizontal

```typescript
setFlipHorizontal(flipped: boolean, mirrorChars?: boolean): void
```

Called on AsciiObject returned from `getObject()`.

**Parameters:**
- `flipped` - Desired flip state
- `mirrorChars` - Optional. If true, applies character mirroring when flipping (default: false)

**Behavior:**
- Sets horizontal flip to specific state
- If state unchanged, no-op (no dirty marking)
- If state changes, calls `flipHorizontalToggle(mirrorChars)` to flip content
- Regenerates influence mask (if object has influence and state changed)
- Marks old and new regions as dirty (if state changed)

**Example:**
```typescript
const obj = compositor.getObject('obj1');
obj.setFlipHorizontal(true);         // Ensure flipped (no character mirroring)
obj.setFlipHorizontal(false, true);  // Ensure not flipped (with character mirroring if flipping)
```

### setFlipVertical

```typescript
setFlipVertical(flipped: boolean, mirrorChars?: boolean): void
```

Called on AsciiObject returned from `getObject()`.

**Parameters:**
- `flipped` - Desired flip state
- `mirrorChars` - Optional. If true, applies character mirroring when flipping (default: false)

**Behavior:**
- Sets vertical flip to specific state
- If state unchanged, no-op (no dirty marking)
- If state changes, calls `flipVerticalToggle(mirrorChars)` to flip content
- Regenerates influence mask (if object has influence and state changed)
- Marks old and new regions as dirty (if state changed)

**Example:**
```typescript
const obj = compositor.getObject('obj1');
obj.setFlipVertical(true);         // Ensure flipped (no character mirroring)
obj.setFlipVertical(false, true);  // Ensure not flipped (with character mirroring if flipping)
```

### getObject

```typescript
getObject(id: string): AsciiObject
```

**Parameters:**
- `id` - Object identifier

**Returns:**
- AsciiObject instance (mutable - can call methods to modify state)

**Behavior:**
- Returns reference to object in scene graph
- Object can be modified via method calls (setPosition, flipHorizontalToggle, etc.)
- Throws if object ID not found

**Example:**
```typescript
const obj = compositor.getObject('obj1');
console.log(obj.position);        // {x: 5, y: 5}
console.log(obj.color);           // '#ff0000'
console.log(obj.layer);           // 1
console.log(obj.flipHorizontal);  // false
console.log(obj.flipVertical);    // true

// Modify object
obj.setPosition(10, 10);
obj.flipHorizontalToggle(true);   // Flip with character mirroring
```

**Errors thrown:**
- `Error: Object with id '${id}' not found`

### Combined Flips with Character Mirroring

When both horizontal and vertical flips are applied with character mirroring, the transformations are applied sequentially:

1. Horizontal mirror (if flipHorizontal is true)
2. Vertical mirror (if flipVertical is true)

This produces correct four-state transformations for all directional characters.

**Example - Box Corner Transformations:**
```typescript
const obj = compositor.getObject('corner');
// Original content: [['╔']]

obj.flipHorizontalToggle(true);
// After H-flip: [['╗']]

obj.flipVerticalToggle(true);
// After V-flip: [['╝']]  (vertical mirror of ╗)

obj.flipHorizontalToggle(true);
// After H-flip again: [['╚']]  (horizontal mirror of ╝)

obj.flipVerticalToggle(true);
// After V-flip again: [['╔']]  (back to original)
```

**Example - Slash Transformations:**
```typescript
const obj = compositor.getObject('slash');
// Original content: [['/']]

obj.flipHorizontalToggle(true);
// After H-flip: [['\']]

obj.flipVerticalToggle(true);
// After V-flip: [['/']]  (back to original - slashes are symmetric)
```

### listObjects

```typescript
listObjects(): AsciiObject[]
```

**Returns:**
- Array of all AsciiObject instances (mutable references)

**Behavior:**
- Returns references to all objects in scene graph
- Objects in no particular order (not sorted by layer)
- Empty array if no objects
- Objects can be modified via method calls

**Example:**
```typescript
const objects = compositor.listObjects();
console.log(`Total objects: ${objects.length}`);
objects.forEach(obj => {
  console.log(obj.id, obj.layer);
  // Can call methods on objects
  if (obj.id.startsWith('arrow')) {
    obj.flipHorizontalToggle(true);  // Flip arrows with character mirroring
  }
});
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

### Viewport Caching

The compositor uses whole-viewport caching to optimize rendering:

- **addObject**: Marks object bounds (including influence) as dirty
- **removeObject**: Marks old object bounds as dirty
- **moveObject**: Marks both old and new bounds as dirty
- **flipHorizontal/flipVertical/setFlipHorizontal/setFlipVertical**: Marks bounds as dirty and regenerates influence mask if present
- **render**: Returns cached result if viewport unchanged and no dirty regions, otherwise re-renders entire viewport

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
- [performance-optimization.md](performance-optimization.md) - Performance optimization analysis and results
