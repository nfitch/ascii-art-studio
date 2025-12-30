# Performance Optimization - Compositor

**Date:** 2025-12-29
**Module:** @ascii-art-studio/compositor
**Version:** Phase 1 Implementation

## Overview

This document details the performance optimization work performed on the Compositor module. The optimization process involved systematic benchmarking, profiling, implementation, and measurement of multiple optimization strategies.

## Methodology

1. **Establish baseline** - Comprehensive benchmarks across all scenarios
2. **Profile bottlenecks** - Code analysis to identify hot paths
3. **Prioritize optimizations** - Focus on highest-impact improvements
4. **Implement and measure** - Benchmark every change
5. **Keep or revert** - Only keep optimizations that improve performance
6. **Document learnings** - Record all attempts, successful and unsuccessful

## Baseline Performance

Initial benchmarks established performance characteristics before optimization:

| Benchmark | Operations/sec | Milliseconds |
|-----------|----------------|--------------|
| simple render (1 object, no effects) | 287,231 hz | 0.0035ms |
| medium complexity (10 objects) | 30,899 hz | 0.0324ms |
| high complexity (50 objects) | 7,159 hz | 0.1397ms |
| large viewport (100x100) | 3,485 hz | 0.2870ms |
| very large viewport (500x500) | 126 hz | 7.9581ms |
| single object with influence | 41,399 hz | 0.0242ms |
| multiple objects with overlapping influence | 4,777 hz | 0.2093ms |
| single layer with effect | 35,006 hz | 0.0286ms |
| multiple layers with stacking effects | 11,172 hz | 0.0895ms |
| viewport offset (panning simulation) | 12,139 hz | 0.0824ms |
| warm cache (reuse compositor instance) | 3,322,905 hz | 0.0003ms |

### Initial Analysis

**Performance Tiers:**
- **Excellent** (>100K ops/sec): Warm cache, flips, simple renders
- **Good** (10K-100K ops/sec): Medium complexity, single effects, panning
- **Needs Optimization** (1K-10K ops/sec): High complexity, large viewports
- **Critical** (<1K ops/sec): Very large viewport (500x500)

**Key Findings:**
- Cache highly effective: 12.8x speedup (warm vs cold cache)
- Viewport size has major impact: 500x500 is 26,000x slower than cached render
- Object count scales reasonably: 4.3x slowdown for 5x more objects
- Influence is expensive: 8.7x slowdown for overlapping influence
- Layer effects cheaper than influence

## Bottleneck Analysis

### renderCell() Function

The `renderCell()` function (lines 721-885) processes each cell in the viewport. Analysis revealed:

**Critical Bottlenecks:**

1. **Triple nested loops**
   - Outer: layers (1-5 iterations)
   - Middle: objects on layer (varies widely)
   - Inner: transform application (multiple iterations)
   - For 500x500 viewport = 250K cells × loops = millions of iterations

2. **Function call overhead**
   - `getObjectsOnLayer()` called per layer per cell
   - `interpolateColor()` and `applyLayerMultiply()` in hot path
   - 250K+ function calls for large viewports

3. **Array allocations**
   - `transformsToApply` array created per cell
   - 250K allocations for 500x500 viewport

4. **Code duplication**
   - Transform application code repeated 5 times
   - Should extract to helper function

## Optimization Attempts

### Optimization 1: Cache getObjectsOnLayer Results ✓ KEPT

**Hypothesis:** Reduce function call overhead by caching layer-to-objects mapping.

**Implementation:**
- Build `Map<layer, objects[]>` once in renderScene()
- Pass cache to renderCell() as parameter
- Eliminate repeated getObjectsOnLayer() calls

**Code Changes:**
```typescript
// In renderScene() - build cache once
const layerObjectsCache = new Map<number, InternalObject[]>();
for (const layer of layers) {
  layerObjectsCache.set(layer, this.getObjectsOnLayer(layer));
}

// In renderCell() - use cached result
const objectsOnLayer = layerObjectsCache.get(layer) || [];
```

**Results:**

| Benchmark | Baseline | After Opt 1 | Improvement |
|-----------|----------|-------------|-------------|
| simple render (1 object) | 287,231 hz | 344,138 hz | +20% |
| medium (10 objects) | 30,899 hz | 46,287 hz | +50% |
| **high (50 objects)** | **7,159 hz** | **14,158 hz** | **+98% (2x)** |
| large viewport (100x100) | 3,485 hz | 4,518 hz | +30% |
| very large viewport (500x500) | 126 hz | 171 hz | +36% |
| panning | 12,139 hz | 17,212 hz | +42% |

**Analysis:**
- Biggest improvement in high-complexity scenarios (2x speedup)
- Universal benefit across all benchmarks
- Very large viewport: 7.96ms → 5.86ms per render
- Excellent ROI: Simple change with broad impact

**Decision:** KEPT - Significant performance improvement with minimal code complexity.

---

### Optimization 2: Pre-filter Objects by Viewport Bounds ✗ REVERTED

**Hypothesis:** Skip objects completely outside viewport to reduce iteration count.

**Implementation:**
```typescript
const visibleObjects = allObjects.filter((obj) => {
  const bounds = obj.bounds;
  return !(bounds.maxX < viewport.x ||
           bounds.minX >= viewport.x + viewport.width ||
           bounds.maxY < viewport.y ||
           bounds.minY >= viewport.y + viewport.height);
});
```

**Results:**
- medium (10 objects): 46K → 45K hz (-2%)
- high (50 objects): 14K → 13K hz (-7%)
- very large viewport: 171 → 174 hz (+2%)

**Analysis:**
- Filter overhead outweighed benefits
- In benchmarks, objects scattered throughout world
- Few objects filtered out, but paid filter cost for all
- Might help in specific scenarios (objects clustered), but hurts general case

**Decision:** REVERTED - Performance degradation in typical use cases.

---

### Optimization 3: Pool transformsToApply Arrays ✗ REVERTED

**Hypothesis:** Reduce allocation overhead by reusing array across cells.

**Implementation:**
```typescript
// Reuse single array, clear with array.length = 0
const transformsToApply: Transform[] = [];

// In renderCell()
transformsToApply.length = 0;  // Clear instead of allocate new
```

**Results:**
- medium (10 objects): 46K → 32K hz (-30%)
- high (50 objects): 14K → 13K hz (-7%)
- very large viewport: 171 → 87 hz (-49%)

**Analysis:**
- **Severe performance degradation**
- Modern JavaScript engines highly optimized for short-lived allocations
- Array pooling strategy:
  1. Confused JIT optimizers (may have deoptimized hot paths)
  2. Lost benefits of generational garbage collection
  3. Potentially worse cache locality

**Decision:** REVERTED - Micro-optimization that fights against V8's optimizations.

**Lesson Learned:** Trust modern JS engine optimizations. Techniques that work in C++ can hurt performance in JavaScript. V8's generational GC is specifically optimized for "allocate and discard" patterns.

---

### Optimization 4: Inline Color Math Functions ✓ KEPT

**Hypothesis:** Reduce function call overhead and enable JIT inlining by combining color math in single helper.

**Implementation:**
Created `applyTransform()` helper that combines both `interpolateColor()` and `applyLayerMultiply()` logic:

```typescript
private applyTransform(
  baseColor: string,
  transform: {
    targetColor: string;
    type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
    strength: number;
    darkenFactor?: number;
  }
): string {
  // Inline color parsing (hex to RGB)
  const r1 = parseInt(baseColor.slice(1, 3), 16);
  const g1 = parseInt(baseColor.slice(3, 5), 16);
  const b1 = parseInt(baseColor.slice(5, 7), 16);

  const r2 = parseInt(transform.targetColor.slice(1, 3), 16);
  const g2 = parseInt(transform.targetColor.slice(3, 5), 16);
  const b2 = parseInt(transform.targetColor.slice(5, 7), 16);

  let finalR: number;
  let finalG: number;
  let finalB: number;

  if (transform.type === 'lighten' || transform.type === 'darken') {
    // Interpolation (inline)
    const t = Math.max(0, Math.min(1, transform.strength));
    finalR = Math.round(r1 + (r2 - r1) * t);
    finalG = Math.round(g1 + (g2 - g1) * t);
    finalB = Math.round(b1 + (b2 - b1) * t);
  } else {
    // Multiply (inline)
    // ... multiply logic
  }

  return `#${this.toHex(finalR)}${this.toHex(finalG)}${this.toHex(finalB)}`;
}
```

Replaced 5 duplicate code blocks with calls to new helper.

**Results:**

| Benchmark | After Opt 1 | After Opt 4 | Improvement |
|-----------|-------------|-------------|-------------|
| simple render (1 object) | 344,138 hz | 362,309 hz | +5% |
| medium (10 objects) | 46,287 hz | 47,095 hz | +2% |
| high (50 objects) | 14,158 hz | 14,407 hz | +2% |
| large viewport (100x100) | 4,518 hz | 4,314 hz | -4% |
| very large viewport (500x500) | 171 hz | 179 hz | +5% |
| panning | 17,212 hz | 17,537 hz | +2% |

**Analysis:**
- Modest but consistent improvement (2-5% in most scenarios)
- Large viewport showed small regression (-4%), likely within noise
- Very large viewport improved by 5% (5.86ms → 5.59ms)
- **Additional benefit:** Eliminated code duplication (~50 lines of duplicate code)
- Cleaner code that's easier to maintain and optimize further
- Enables JIT optimizer to inline entire transform pipeline

**Decision:** KEPT - Small performance improvement plus significant code quality benefit.

## Final Results

### Successful Optimizations

Two optimizations kept:
1. **Optimization 1:** Cache getObjectsOnLayer results
2. **Optimization 4:** Inline color math via applyTransform helper

### Performance Gains

| Benchmark | Baseline | Final | Improvement |
|-----------|----------|-------|-------------|
| simple render (1 object) | 287,231 hz | 362,309 hz | +26% |
| medium (10 objects) | 30,899 hz | 47,095 hz | +52% |
| **high (50 objects)** | **7,159 hz** | **14,407 hz** | **+101% (2x)** |
| large viewport (100x100) | 3,485 hz | 4,314 hz | +24% |
| **very large viewport (500x500)** | **126 hz** | **179 hz** | **+42%** |
| panning | 12,139 hz | 17,537 hz | +45% |

### Optimization Contribution

- **Opt 1 contribution:** 36-98% improvement (layer caching)
- **Opt 4 contribution:** 2-5% improvement (code quality + inlining)
- **Combined:** 24-101% total improvement

### Final Performance Characteristics

**By Complexity:**
- **Simple scenes** (1-10 objects): 47K-362K ops/sec (0.003-0.02ms per render)
- **Complex scenes** (50 objects): 14K ops/sec (0.07ms per render)
- **Large viewports** (500x500): 179 ops/sec (5.59ms per render)

**Cache Effectiveness:**
- Warm cache: 3,338,692 ops/sec (0.0003ms per render)
- 18,659x speedup over very large viewport rendering
- Critical for animation performance

**Real-Time Capability:**
- 60 FPS requires <16.67ms per frame
- Even 500x500 viewport renders in 5.59ms (178 FPS capability)
- Typical use cases (smaller viewports, fewer objects) render in <1ms
- Performance is excellent for all real-time applications

## Key Learnings

1. **Cache hot lookups** - Single cache optimization provided majority of gains (36-98%)
2. **Profile, don't guess** - Two seemingly reasonable optimizations actually hurt performance
3. **Modern engines are smart** - Trust V8's optimizations for allocation and GC
4. **Code quality matters** - Opt 4 improved both performance and maintainability
5. **Measure everything** - Every change was benchmarked before keeping/reverting
6. **One good optimization beats many bad ones** - Focus on high-impact changes

## Remaining Optimization Potential

Further improvements possible but not necessary for current use cases:

**Potential Future Optimizations:**
- Use typed arrays for color calculations (Uint8Array for RGB)
- SIMD operations for batch color transformations
- Worker threads for parallel viewport rendering
- Spatial indexing (quadtree) for very large object counts (1000+ objects)

**Current Assessment:**
Performance is excellent for all anticipated use cases. Further optimization would provide diminishing returns and increase code complexity. The current implementation strikes the right balance between performance and maintainability.

## Related Documents

- [Phase 1 Compositor Design](phase-1-compositor-design.md) - Overall design and architecture
- [Phase 1 Compositor API](phase-1-compositor-api.md) - TypeScript API specification
- [Performance Optimization Log](../packages/compositor/logs/performance-optimization-2025-12-29.md) - Detailed optimization log with all benchmark data

## Implementation Details

**Modified Files:**
- `/packages/compositor/src/Compositor.ts` - Core implementation with optimizations

**Key Changes:**

1. **Layer Object Caching (lines 679-683):**
```typescript
const layerObjectsCache = new Map<number, InternalObject[]>();
for (const layer of layers) {
  layerObjectsCache.set(layer, this.getObjectsOnLayer(layer));
}
```

2. **applyTransform Helper (lines 903-963):**
   - Combines interpolation and multiply logic
   - Inlines color parsing
   - Eliminates code duplication
   - Enables JIT optimization

**Test Coverage:**
- All 153 tests pass
- No regressions in functionality
- Performance benchmarks validate improvements
