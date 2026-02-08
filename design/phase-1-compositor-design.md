# Phase 1: ASCII Compositor - Design Document

## Overview

The ASCII Compositor is the foundational module for the ASCII Art Studio. It manages a scene graph of ASCII objects, handles rendering with proper layering and transparency, and provides efficient updates through viewport caching.

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
**Decision:** Top-down rendering with cumulative color transformations.

**Rendering algorithm:**
```javascript
function renderCell(x, y) {
  let workingColor = '#000000';  // Track background color
  let transformsToApply = [];     // Collect transforms for content

  for (let layer of layers) {  // top → bottom
    // Collect layer effect as transform
    if (layerEffect[layer]) {
      transformsToApply.push(layerEffect[layer]);
    }

    for (let obj of objectsOnLayer) {
      let maskValue = obj.influenceMask[x][y];

      if (maskValue === 100) {
        // Solid content - apply all transforms to object color
        let finalColor = obj.color;
        for (let transform of transformsToApply) {
          finalColor = applyTransform(finalColor, transform);
        }
        return { char: obj.content[x][y], color: finalColor };
      }

      if (maskValue > 0 && maskValue < 100) {
        // Influence gradient - collect transform and apply to working color
        let strength = (maskValue / 100) * obj.influence.strength;
        let transform = { ...obj.influence.transform, strength };
        transformsToApply.push(transform);
        workingColor = applyTransform(workingColor, transform);
      }
    }
  }

  // No content - apply transforms to working color (background)
  let finalColor = workingColor;
  for (let transform of transformsToApply) {
    finalColor = applyTransform(finalColor, transform);
  }
  return { char: ' ', color: finalColor };
}
```

**Key points:**
- Traverse layers top to bottom
- Collect transforms (layer effects + influences) as we go
- Apply transforms iteratively to working color (background)
- When content found, apply all collected transforms to object color
- Transform types: lighten, darken, multiply, multiply-darken

**Rationale:**
- Color interpolation more flexible than transparency percentages
- Supports colored influences (blue object with red glow)
- Layer effects and object influences use same transform system
- Top-down traversal makes layer precedence clear

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

### Viewport Caching
Cache the entire rendered viewport and reuse when nothing has changed.

**Rationale:**
- Critical for animation performance
- ASCII rendering can be expensive for large canvases
- Most frames have no changes (static scenes)

**Implementation:**
- Cache complete viewport render result
- Track dirty regions using Set of coordinate strings
- Mark regions dirty on object move/modify/add/remove
- Return cached result if viewport unchanged and no dirty regions
- Otherwise re-render entire viewport and update cache

**Tradeoffs:**
- Whole-viewport re-render when any region dirty
- Could be optimized to per-cell dirty tracking (Future Experiment)
- Current approach simpler and sufficient for most use cases

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
  color?: string;  // Override color for influence (hex #RRGGBB). If not specified, uses object's color
  transform: {
    type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
    strength: number;  // 0.0-1.0, max effect at distance 0
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
    darkenFactor?: number;  // 0.0-1.0, only for multiply-darken (default: 0.8)
  };
}

interface AsciiObject {
  id: string;
  content: Cell[][];  // 2D grid, null = transparent
  position: { x: number; y: number };
  layer: number;
  color: string;  // Hex code at full opacity
  influence?: Influence;
  flipHorizontal: boolean;  // True if flipped horizontally
  flipVertical: boolean;    // True if flipped vertically

  // Computed/cached
  transparencyMask: (number | null)[][];  // Influence mask (0-100% or null)
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface Scene {
  objects: Map<string, AsciiObject>;
  dirtyRegions: Set<string>;  // Coordinate strings: "x,y"
  cachedOutput?: RenderOutput;
  lastViewport?: Viewport;
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

### Operations

**Implemented operations:**
```
// Object Management
addObject(id, options: { content, position, layer?, color?, influence?, autoDetectEdges? })
removeObject(id)
moveObject(id, newPosition)
flipHorizontal(id)           // Toggle horizontal flip state
flipVertical(id)             // Toggle vertical flip state
setFlipHorizontal(id, flipped)  // Set horizontal flip to specific state
setFlipVertical(id, flipped)    // Set vertical flip to specific state
getObject(id): CompositorObject
listObjects(): CompositorObject[]

// Rendering
render(viewport?): RenderOutput
getCanvasBounds(): Bounds
```

**Future operations (not implemented):**
```
// Potential enhancements for later phases
updateObject(id, newContent)    // Update content without recreating object
setObjectLayer(id, newLayer)    // Change layer without recreating object
setObjectColor(id, newColor)    // Change color without recreating object
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
  // Iterative implementation using queue to avoid stack overflow on large regions
  const queue = [{ x, y }];

  while (queue.length > 0) {
    const { x, y } = queue.shift();

    if (out of bounds || visited.has(`${x},${y}`)) continue;
    if (mask[y][x] !== ' ') continue;  // not a space

    visited.add(`${x},${y}`);
    mask[y][x] = null;  // mark as transparent

    // Add adjacent cells to queue (4-way connectivity)
    queue.push({ x: x+1, y });
    queue.push({ x: x-1, y });
    queue.push({ x, y: y+1 });
    queue.push({ x, y: y-1 });
  }
}
```

**Edge case:** If content is all spaces, all cells become transparent. This creates a fully transparent object that can still emit influence, useful for creating invisible "effect zones" (light sources, fog regions, etc.).

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

**Implemented optimizations:**
1. **Viewport caching** - Cache entire rendered viewport, reuse when scene unchanged
2. **Layer object caching** - Cache getObjectsOnLayer() results across cells in single render (2x speedup on complex scenes)
3. **Inline color math** - Combined transform functions to enable JIT optimization

See [performance-optimization.md](performance-optimization.md) for detailed analysis and benchmark results.

**Potential future optimizations:**
1. **Spatial indexing** - Quadtree or grid-based indexing for very large object counts
2. **Layer culling** - Skip layers completely occluded by higher layers
3. **Typed arrays** - Use Uint8Array for RGB color calculations
4. **SIMD operations** - Batch color transformations

### Memory Management

- Object pooling for frequently created/destroyed objects (if needed)
- Efficient character matrix representation (avoid 2D arrays if possible)
- Reuse buffers for rendering output

## Important Distinctions

### Space vs Null
**Critical:** `' '` (space character) is NOT the same as `null`.

- `null` = Transparent cell, allows lower layer to show through
- `' '` = Actual space character, blocks lower layer (opaque)

**Example:**
```javascript
// Transparent holes
content: [['#', null, '#']]  // Middle cell shows lower layer

// Opaque spaces
content: [['#', ' ', '#']]   // Middle cell blocks lower layer, renders as space
```

**Implemented behavior:**
- **Space characters WITH influence** act as transparent (glass pane effect)
  - The space itself is NOT rendered (transparent)
  - Lower layers show through (characters from below remain visible)
  - Influence transform modifies the color of content below
  - Enables atmospheric effects and tinted regions (colored fog, light beams, glass panes)
- **Space characters WITHOUT influence** render as opaque spaces
  - The space IS rendered as an opaque space character
  - Block lower layers completely (both character and color)
  - Display as space character with the object's color
  - Same as solid content, just renders space instead of a symbol

### Transform Type Semantics

The influence transform type determines how lower layer colors are affected:

- **lighten**: Interpolates toward target color (lightening effect)
- **darken**: Interpolates toward target color (darkening effect)
- **multiply**: Color filter multiplication (blends colors)
- **multiply-darken**: Multiply with additional darkening factor

All four transform types are fully implemented and tested.

### 4. Layer Effects

Layer effects apply uniform color transformations to entire layers. Unlike influence (which is localized around objects), layer effects affect every pixel in the viewport at a specific layer.

**Key characteristics:**
- Applied to entire viewport, not just around objects
- Effects stack: layer 2 effects apply after layer 1 effects
- Independent from object influence
- Can be used for atmospheric effects (lighting, fog, tinting)

**Transform types:**
- **lighten**: Interpolates all colors toward target color (brightening effect)
- **darken**: Interpolates all colors toward target color (dimming effect)
- **multiply**: Color filter multiplication (color tinting)
- **multiply-darken**: Multiply with additional darkening factor

**Use cases:**
- Daylight/nighttime transitions (lighten/darken toward white/black)
- Atmospheric tinting (sunset = multiply by orange)
- Depth fog effects (lighten distant layers)
- Color grading for entire scenes

### 5. Character Mirroring

**Decision:** Optional character mirroring during flip operations.

When objects are flipped horizontally or vertically, characters can optionally be mirrored to their directional equivalents. This creates more natural-looking flips for directional characters.

**Key features:**
- Opt-in via boolean parameter on flip methods
- Sequential application: horizontal mirror applied first, then vertical
- Unmapped characters pass through unchanged
- Default behavior (no mirroring) preserves backward compatibility

**Character mappings:**

Horizontal mirroring pairs:
- ASCII brackets: `< >`, `( )`, `[ ]`, `{ }`
- ASCII slashes: `/ \`
- Box drawing: `╔ ╗`, `╚ ╝`, `┌ ┐`, `└ ┘`, `├ ┤`, `╟ ╢`, `╞ ╡`
- Arrows: `← →`, `↖ ↗`, `↙ ↘`

Vertical mirroring pairs:
- ASCII slashes: `/ \`
- ASCII carets: `^ v`
- Box drawing: `╔ ╚`, `╗ ╝`, `┌ └`, `┐ ┘`, `┬ ┴`, `╤ ╧`, `╥ ╨`
- Arrows: `↑ ↓`, `↖ ↙`, `↗ ↘`

**Sequential application for combined flips:**

When both horizontal and vertical flips are active, mirrors are applied sequentially:
1. Apply horizontal mirror (if flipHorizontal is true)
2. Apply vertical mirror (if flipVertical is true)

Example: `╔` with both flips becomes `╝`:
- Horizontal mirror: `╔` → `╗`
- Vertical mirror: `╗` → `╝`

This approach ensures correct transformations for all four states (original, H-flipped, V-flipped, both-flipped).

**Rationale:**
- Creates natural-looking flips for arrows, brackets, and box-drawing characters
- Opt-in design preserves existing behavior and avoids breaking changes
- Sequential application is simple and mathematically correct
- Character maps can be extended over time without API changes

## Future Experiments

Potential enhancements for future consideration:

1. **Additional blend modes**
   - Screen, overlay, color dodge, etc.
   - Based on need and performance impact

2. **Per-cell dirty region optimization**
   - Current implementation uses whole-viewport caching
   - Could optimize to only recompute changed cells
   - Complexity: influence effects span multiple cells

3. **Gradient layer effects**
   - Variable strength across viewport (linear/radial gradients)
   - Useful for vignetting, spotlight effects

## Character Mirroring - Implementation Checklist

### Overview
Status: NOT STARTED
Add optional character mirroring to flip operations, allowing directional characters to transform naturally during horizontal and vertical flips.

### Success Criteria
- All existing 153 tests continue to pass
- Character mirroring is opt-in (default false preserves current behavior)
- At least 30 character pairs mapped (ASCII + common Unicode box drawing)
- Sequential application works correctly for combined H+V flips
- All new functionality has comprehensive test coverage
- API documentation updated with examples
- Design documentation includes character mirroring decision

---

### Phase 0: Design and Planning
- [x] Add character mirroring design decision to phase-1-compositor-design.md
- [x] Update phase-1-compositor-api.md with new optional parameters
- [x] Document character mapping tables in design doc

**REVIEW GATE:** Design documentation complete

---

### Phase 1: Tests First (TDD)

#### Character Mapping Tests
- [x] Test horizontal mirror map completeness (all pairs bidirectional)
- [x] Test vertical mirror map completeness (all pairs bidirectional)
- [x] Test unmapped characters pass through unchanged
- [x] Test null cells remain null after mirroring

#### Horizontal Flip with Mirroring
- [x] Test single character mirrored correctly (each ASCII pair)
- [x] Test single character mirrored correctly (box drawing pairs)
- [x] Test multi-character content with mixed mapped/unmapped chars
- [x] Test toggle twice returns to original (positions and characters)
- [x] Test default mirrorChars=false preserves current behavior

#### Vertical Flip with Mirroring
- [x] Test single character mirrored correctly (each pair)
- [x] Test multi-character content with mixed mapped/unmapped chars
- [x] Test toggle twice returns to original
- [x] Test default mirrorChars=false preserves current behavior

#### Combined Flip with Mirroring
- [x] Test sequential application: H then V
- [x] Test all four states (none, H, V, both) for corner chars
- [x] Test box corners: `╔` → `╗` → `╝` → `╚` → `╔`
- [x] Test slashes: `/` → `\` → `/` → `\` → `/`
- [x] Test arrows with diagonal directions

#### Integration Tests
- [x] Test flipHorizontalToggle(true) then flipVerticalToggle(true)
- [x] Test setFlipHorizontal(true, true) with existing object
- [x] Test object with influence maintains mask after mirrored flip
- [x] Test dirty bounds tracking with mirrored flips
- [x] Test rendering output contains mirrored characters

**REVIEW GATE:** All tests written and failing appropriately

---

### Phase 2: Implementation

#### Add Character Maps to AsciiObject.ts
- [x] Define HORIZONTAL_MIRROR_MAP constant (30+ pairs)
- [x] Define VERTICAL_MIRROR_MAP constant (20+ pairs)
- [x] Add applyHorizontalMirror() and applyVerticalMirror() private helper methods

#### Update Flip Methods
- [x] Modify flipHorizontalToggle(mirrorChars?: boolean)
- [x] Modify flipVerticalToggle(mirrorChars?: boolean)
- [x] Modify setFlipHorizontal(flipped: boolean, mirrorChars?: boolean)
- [x] Modify setFlipVertical(flipped: boolean, mirrorChars?: boolean)
- [x] Apply character mirroring during content transformation

#### Verify All Tests Pass
- [x] Run full test suite (153 existing + 37 new tests = 190 total)
- [x] Fix any regressions
- [x] Verify performance acceptable (no significant slowdown)

**REVIEW GATE:** All tests passing, implementation complete

---

### Phase 3: Documentation

#### API Documentation
- [x] Update phase-1-compositor-api.md flip method signatures
- [x] Add code examples showing mirrored vs non-mirrored flips
- [x] Document character mapping tables
- [x] Add usage notes about sequential application

#### Design Documentation
- [x] Verify character mirroring design decision is complete
- [x] Add examples of four-state transformations
- [x] Document future expansion approach (adding more pairs)

**REVIEW GATE:** Documentation complete

---

### Phase 4: Frontend Demo (Optional)

#### Update Flip Transform Demo
- [ ] Add checkbox: "Mirror characters during flip"
- [ ] Show side-by-side comparison when enabled
- [ ] Include example objects with directional characters
- [ ] Add arrows and box corners to demo objects

**REVIEW GATE:** Manual testing complete

---

### Final Checklist
- [x] All 153 existing tests pass
- [x] All new tests pass (37 new tests added)
- [x] No performance regression (opt-in feature, default behavior unchanged)
- [x] API documentation updated
- [x] Design documentation updated
- [ ] Frontend demo enhanced (optional)
- [x] Ready for commit

## Related Documents

- [phase-1-compositor-api.md](phase-1-compositor-api.md) - TypeScript API specification
- [performance-optimization.md](performance-optimization.md) - Performance optimization analysis and results

## Status

**Phase 1 Core Compositor:** COMPLETE
- 153 comprehensive tests (all passing)
- Full implementation with all features
- Performance optimized (24-101% improvement)
- 9 interactive frontend demos
- Complete API and design documentation

**Character Mirroring Enhancement:** COMPLETE
- 37 comprehensive tests (all passing)
- Full implementation with horizontal and vertical mirror maps
- Backward compatible (opt-in via mirrorChars parameter, default false)
- Complete API and design documentation
- Ready for commit
