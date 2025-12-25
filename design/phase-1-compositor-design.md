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
TBD - Will be determined during API design phase based on performance requirements for upstream consumers (animator, renderer).

## Open Questions

### 1. Same-Layer Overlap Behavior
When multiple objects on the same layer overlap, what happens?

**Options:**
- Last added wins (painter's algorithm)
- Error (force user to specify layers)
- Blend/merge (complex)
- Insertion order matters

**Resolution needed:** Work through examples to determine best approach.

### 2. Transparency Detection
How do we determine if a character cell is "inside" or "outside" an object?

**Challenge:** ASCII objects are irregular shapes. A space in the middle of an object should be opaque (part of the object), but spaces at the edges should be transparent.

**Possible approaches:**
- User-defined mask/bounds
- Algorithm to detect shape boundaries
- Explicit transparency markers

**Resolution needed:** Prototype different approaches, evaluate complexity vs correctness.

### 3. Output Format
What should the compositor return?

**Options:**
- Plain string (newline-delimited)
- Array of strings (one per line)
- 2D character array
- Styled output (with color codes)
- Multiple formats via different methods

**Resolution needed:** Determine based on animator and renderer requirements.

### 4. Continuous vs One-Shot Updates
How does the animator interact with the compositor?

**Chosen approach:** Scene graph with command-based updates
- Compositor maintains scene state
- Animator sends commands: "move object A", "add object B"
- Compositor tracks dirty regions
- Render only when requested

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

```
AsciiObject {
  id: string
  content: CharacterMatrix  // Internal representation
  position: { x: number, y: number }
  layer: number
  color?: string  // Hex code, optional
  bounds: { minX, minY, maxX, maxY }  // Cached bounds
}

Scene {
  objects: Map<string, AsciiObject>
  dirtyRegions: BooleanGrid
  canvasBounds: { minX, minY, maxX, maxY }
}

Viewport {
  x: number
  y: number
  width: number
  height: number
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

### Edge Detection Strategy
For determining transparent vs opaque regions in irregular ASCII objects:

**Approach TBD** - Requires prototyping and examples.

Potential strategies:
1. Flood fill from edges to find "outside" regions
2. User-provided bounding shape
3. Ray casting to determine inside/outside
4. Explicit transparency channel in input

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

1. Work through examples for same-layer overlap behavior
2. Prototype transparency detection approaches
3. Design TypeScript API in detail
4. Define exact data structures and algorithms
5. Write comprehensive test suite
6. Implement core compositor
7. Benchmark and optimize
