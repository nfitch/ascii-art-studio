# Phase 1: ASCII Compositor - Design Document

## Overview

The ASCII Compositor is the foundational module for the ASCII Art Studio. It manages a scene graph of ASCII objects, handles rendering with proper layering and transparency, and provides efficient updates through dirty region tracking.

## Core Concepts

### ASCII Objects
- Irregular shapes made of ASCII characters
- Each object has position, layer, and optional color
- Internal representation optimized for compositing
- Input formats: character matrix, string array, or newline-delimited string

### Scene Graph
- Compositor maintains stateful scene (objects, positions, layers)
- Objects are mutable - can be moved, modified without recreation
- Scene defines the canvas bounds

### Canvas and Viewport
- **Canvas**: The full area defined by the extent of all objects
- **Viewport**: The visible portion that gets rendered
- Viewport can be positioned anywhere (even off-canvas)
- Off-viewport areas render as blanks

### Coordinate System
- Standard 2D grid: (x, y) where (0, 0) is top-left
- Negative coordinates allowed
- Single character occupies one cell

### Layers
- Relative layer ordering (not absolute)
- Layer -1 renders below layer 1
- Layer 1 renders below layer 100
- Objects on higher layers occlude objects on lower layers

## Requirements

### Hard Requirements

1. **ASCII only** - No emoji support, standard ASCII character set only
2. **Object positioning** - Arbitrary (x, y) positioning, negatives allowed
3. **Layering** - Relative layer ordering with proper occlusion
4. **Color support** - Hex color codes, default black (#000000)
5. **Transparency** - Smart edge detection for irregular shapes
6. **Performance** - Dirty region tracking, only render visible viewport
7. **Size** - Minimal library footprint, simple and fast code
8. **Mutable objects** - Objects can be moved/modified after creation
9. **Scene management** - Compositor maintains scene graph state

### Input Format

Objects can be provided in three formats (all equivalent):
1. Character matrix: `[['a', 'b'], ['c', 'd']]`
2. String array: `['ab', 'cd']` (equal length strings)
3. Newline string: `'ab\ncd'` (split strings can be equal length)

### Output Format
Separate character and color grids for memory efficiency:
```javascript
{
  characters: string[][],  // 2D grid of characters
  colors: string[][]       // 2D grid of hex colors (same dimensions)
}
```

## Design Decisions

### 1. Same-Layer Overlap Behavior
**Decision:** First added wins.

When multiple objects on the same layer overlap, the first object added to that layer takes precedence. Later objects are clipped in overlapping regions.

**Rationale:**
- Deterministic and predictable
- Simple to implement
- Gives users control via insertion order
- No errors to handle

### 2. Transparency Detection
**Decision:** Explicit `null` markers with optional auto-edge detection.

**Primary method:** Use `null` values in content arrays to mark transparent cells:
```javascript
content: [['#', '#'], ['#', null]]  // null = transparent
```

**Convenience method:** Optional auto-edge detection using flood fill algorithm:
```javascript
{
  content: ['  ####  ', '  #  #  ', '  ####  '],
  autoDetectEdges: true
}
```

Auto-edge detection:
1. Start flood fill from all edge cells
2. Mark all spaces reachable from edges as transparent
3. Unreachable spaces (trapped inside) remain opaque

**Rationale:**
- Explicit control when needed (null markers)
- Convenience for common cases (auto-detect)
- Flood fill is intuitive and handles complex shapes

### 3. Proximity-Based Influence
**Decision:** Objects emit influence gradients that affect lower layers.

Each object has an **influence mask** extending beyond its visible characters. The mask defines how the object affects colors on lower layers based on distance.

**Key features:**
- Influence radius (how far the effect extends)
- Transform type (lighten, darken, multiply)
- Strength (maximum effect at distance 0)
- Falloff function (linear, quadratic, exponential, cubic)

**Example:**
Object with radius=2, lighten 50%, linear falloff creates mask:
```
null, null, 25%, 25%, 25%, null
null, 25%, 50%, 50%, 50%, 25%
25%, 50%, 100%, 100%, 100%, 50%
null, 25%, 50%, 50%, 50%, 25%
```
- 100% = opaque character position (blocks lower layer)
- <100% = influence strength (lightens color of lower layer)
- null = no influence

**Rationale:**
- Creates atmospheric effects (glows, shadows, halos)
- Core feature that makes compositor unique
- Essential for visual richness in ASCII art

### 4. Transform Accumulation
**Decision:** Top-down rendering with additive transparency accumulation.

**Rendering algorithm:**
```javascript
function renderCell(x, y) {
  let accumulatedTransparency = 0;

  for (let layer of layers) {  // top → bottom

    if (accumulatedTransparency >= 100) {
      return ' ';  // completely transparent
    }

    if (layer.content[x][y] !== null) {
      return applyTransparency(layer.content[x][y], accumulatedTransparency);
    }

    if (layer.transparencyMask[x][y] !== null) {
      accumulatedTransparency += layer.transparencyMask[x][y];
    }

    if (accumulatedTransparency >= 100) {
      return ' ';
    }
  }

  return ' ';  // no content found
}
```

**Key points:**
- Traverse layers top to bottom
- Accumulate transparency values (0-100%)
- When accumulated transparency >= 100, render blank
- When content found, apply accumulated transparency to its color
- `null` in mask = no influence from that layer

**Rationale:**
- Additive accumulation is intuitive
- Multiple objects can combine effects
- Top-down makes layer precedence clear

## Architecture Decisions

### Stateful Scene Manager
The compositor acts as a scene manager rather than a stateless renderer.

**Rationale:**
- Better performance for animation (primary use case)
- Dirty region tracking enables partial re-renders
- Less memory churn (no object recreation)
- Animator becomes simpler (sends deltas, not full state)

**Tradeoffs:**
- More complex compositor implementation
- Must maintain scene graph state
- Need proper object lifecycle management

### Dirty Region Tracking
Only recompute regions that have changed since last render.

**Rationale:**
- Critical for animation performance
- ASCII rendering can be expensive for large canvases
- Most animations change small portions of scene

**Implementation:**
- Boolean grid tracking which cells are dirty
- Mark regions dirty on object move/modify/add/remove
- Clear dirty flags after render

**Size impact:** Minimal (just a boolean array)

### Mutable Objects
Objects can be modified in place rather than recreated.

**Rationale:**
- Less garbage collection pressure
- Better performance for frequent updates (animation)
- More intuitive API for animator

**Tradeoffs:**
- More complex state management
- Need to track when objects change to mark regions dirty

## Domain Model

### Core Types (Conceptual)

```typescript
type Cell = string | null;  // string = character, null = transparent

interface Influence {
  radius: number;
  transform: {
    type: 'lighten' | 'darken' | 'multiply';
    strength: number;  // 0.0-1.0, max effect at distance 0
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
  };
}

interface AsciiObject {
  id: string;
  content: Cell[][];  // 2D grid, null = transparent
  position: { x: number; y: number };
  layer: number;
  color: string;  // Hex code at full opacity
  influence?: Influence;

  // Computed/cached
  transparencyMask: (number | null)[][];  // Influence mask (0-100% or null)
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface Scene {
  objects: Map<string, AsciiObject>;
  dirtyRegions: boolean[][];
  canvasBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderOutput {
  characters: string[][];  // 2D grid of characters
  colors: string[][];      // 2D grid of hex colors (same dimensions)
}
```

### Operations (Conceptual)

```
// Scene Management
addObject(id, content, position, layer, color?)
removeObject(id)
moveObject(id, newPosition)
updateObject(id, newContent)
setObjectLayer(id, newLayer)
setObjectColor(id, newColor)

// Rendering
render(viewport): Output
getCanvasBounds(): Bounds
```

## Technical Approach

### Transparency Mask Generation
When an object is added with `autoDetectEdges: true`:

**Flood Fill Algorithm:**
```javascript
function generateTransparencyMask(content: Cell[][]): Cell[][] {
  const mask = deepClone(content);
  const visited = new Set<string>();

  // Flood fill from all edge cells
  for (let y = 0; y < height; y++) {
    floodFill(mask, 0, y, visited);      // left edge
    floodFill(mask, width-1, y, visited); // right edge
  }
  for (let x = 0; x < width; x++) {
    floodFill(mask, x, 0, visited);         // top edge
    floodFill(mask, x, height-1, visited);  // bottom edge
  }

  return mask;
}

function floodFill(mask: Cell[][], x: number, y: number, visited: Set<string>) {
  if (out of bounds || visited.has(`${x},${y}`)) return;
  if (mask[y][x] !== ' ') return;  // not a space

  visited.add(`${x},${y}`);
  mask[y][x] = null;  // mark as transparent

  // Recursively fill adjacent cells
  floodFill(mask, x+1, y, visited);
  floodFill(mask, x-1, y, visited);
  floodFill(mask, x, y+1, visited);
  floodFill(mask, x, y-1, visited);
}
```

### Influence Mask Generation
When an object has an `influence` property, generate an extended mask:

**Algorithm:**
```javascript
function generateInfluenceMask(content: Cell[][], influence: Influence): (number | null)[][] {
  const { radius, transform } = influence;
  const { strength, falloff } = transform;

  // Create extended grid (content + radius padding on all sides)
  const maskWidth = contentWidth + (radius * 2);
  const maskHeight = contentHeight + (radius * 2);
  const mask = new Array(maskHeight).fill(null).map(() => new Array(maskWidth).fill(null));

  // For each content cell
  for (let cy = 0; cy < contentHeight; cy++) {
    for (let cx = 0; cx < contentWidth; cx++) {
      if (content[cy][cx] === null) continue;  // transparent cell, skip

      // Mark this position as 100 (opaque)
      const mx = cx + radius;
      const my = cy + radius;
      mask[my][mx] = 100;

      // Generate influence gradient around this cell
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;  // already set to 100

          const distance = Math.sqrt(dx*dx + dy*dy);
          if (distance > radius) continue;

          const influenceStrength = calculateFalloff(distance, radius, strength, falloff);
          const targetX = mx + dx;
          const targetY = my + dy;

          // Take maximum influence if multiple cells affect same position
          mask[targetY][targetX] = Math.max(mask[targetY][targetX] || 0, influenceStrength);
        }
      }
    }
  }

  return mask;
}

function calculateFalloff(distance: number, radius: number, strength: number, falloff: string): number {
  const normalized = distance / radius;  // 0.0 to 1.0

  let factor;
  switch (falloff) {
    case 'linear':
      factor = 1 - normalized;
      break;
    case 'quadratic':
      factor = 1 - (normalized * normalized);
      break;
    case 'exponential':
      factor = Math.exp(-normalized * 3);  // e^(-3x)
      break;
    case 'cubic':
      factor = 1 - (normalized * normalized * normalized);
      break;
  }

  return factor * strength * 100;  // return 0-100
}
```

### Performance Optimizations

1. **Spatial indexing** - Consider quadtree or grid-based indexing for large scenes
2. **Layer culling** - Skip layers completely occluded by higher layers
3. **Viewport culling** - Don't process objects outside viewport
4. **Dirty region merging** - Combine adjacent dirty regions to reduce overhead

### Memory Management

- Object pooling for frequently created/destroyed objects (if needed)
- Efficient character matrix representation (avoid 2D arrays if possible)
- Reuse buffers for rendering output

## Next Steps

1. ~~Work through examples for same-layer overlap behavior~~ ✓ **Complete** - First added wins
2. ~~Prototype transparency detection approaches~~ ✓ **Complete** - Null markers + flood fill
3. **IN PROGRESS:** Design TypeScript API in detail
4. Define exact data structures and algorithms
5. Write comprehensive test suite (TDD)
6. Implement core compositor
7. Benchmark and optimize
8. Build frontend examples
