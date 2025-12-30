# Performance Optimization Log
Date: 2025-12-29
Module: @ascii-art-studio/compositor

## Baseline Benchmarks

### Raw Results

```
simple render (1 object, no effects)         287,231 hz  (0.0035ms mean)
medium complexity (10 objects)                30,899 hz   (0.0324ms mean)
high complexity (50 objects)                  7,159 hz    (0.1397ms mean)
large viewport (100x100)                      3,485 hz    (0.2870ms mean)
very large viewport (500x500)                 126 hz      (7.9581ms mean)
single object with influence                  41,399 hz   (0.0242ms mean)
multiple objects with overlapping influence   4,777 hz    (0.2093ms mean)
single layer with effect                      35,006 hz   (0.0286ms mean)
multiple layers with stacking effects         11,172 hz   (0.0895ms mean)
large content object (50x50 grid)             3,441 hz    (0.2906ms mean)
horizontal flip                               1,288,159 hz (0.0008ms mean)
vertical flip                                 535,565 hz  (0.0019ms mean)
autoDetectEdges on complex shape              159,404 hz  (0.0063ms mean)
cold cache: create new compositor each time   259,854 hz  (0.0038ms mean)
warm cache: reuse compositor instance         3,322,905 hz (0.0003ms mean)
viewport offset (panning simulation)          12,139 hz   (0.0824ms mean)
```

### Analysis

#### Performance Tiers

**Excellent (>100K ops/sec):**
- Warm cache (cached renders): 3.3M ops/sec
- Horizontal flip: 1.3M ops/sec
- Vertical flip: 535K ops/sec
- Simple render (1 object): 287K ops/sec
- Cold cache: 260K ops/sec
- autoDetectEdges: 159K ops/sec

**Good (10K-100K ops/sec):**
- Single object with influence: 41K ops/sec
- Single layer with effect: 35K ops/sec
- Medium complexity (10 objects): 31K ops/sec
- Viewport panning: 12K ops/sec
- Multiple layers with effects: 11K ops/sec

**Needs Optimization (1K-10K ops/sec):**
- High complexity (50 objects): 7.2K ops/sec
- Multiple overlapping influence: 4.8K ops/sec
- Large viewport (100x100): 3.5K ops/sec
- Large content (50x50): 3.4K ops/sec

**Critical (< 1K ops/sec):**
- Very large viewport (500x500): 126 ops/sec (7.96ms per render)

#### Key Findings

1. **Cache is highly effective**: 12.8x speedup (warm vs cold cache)
2. **Viewport size has major impact**: 500x500 viewport is 26,000x slower than cached render
3. **Object count scales reasonably**: 10 objects = 31K ops/sec, 50 objects = 7K ops/sec (4.3x slowdown for 5x objects)
4. **Influence is expensive**: Single influence = 41K ops/sec vs overlapping = 4.8K ops/sec (8.7x slowdown)
5. **Layer effects cheaper than influence**: Single layer effect = 35K ops/sec

#### Bottleneck Hypothesis

The 500x500 viewport test reveals the critical bottleneck:
- 250,000 cells to process
- Each cell requires layer iteration and color transformation
- 7.96ms total = ~32ns per cell
- This suggests render pipeline is the primary bottleneck

Expected optimization targets:
1. Render pipeline (renderCell function)
2. Influence calculations for large viewports
3. Layer iteration strategy
4. Memory allocations during render
5. Color transformation overhead

## Next Steps

1. Profile renderCell() to understand per-cell cost breakdown
2. Identify which operations dominate in large viewport scenario
3. Look for early-exit opportunities in layer iteration
4. Check for unnecessary allocations in hot path
5. Consider SIMD-like optimizations for color math

## Render Pipeline Analysis

### renderCell() Function (lines 721-885)

#### Structure
```
renderCell(x, y, layers):
  workingColor = black
  transformsToApply = []
  
  for each layer (top to bottom):
    if layer has effect:
      add to transformsToApply
    
    for each object on layer:
      calculate local coords
      check influence mask bounds
      
      if maskValue == 100 (content):
        if non-space char:
          apply all transforms to obj.color
          return {char, color}
        if space with influence:
          add transform, apply to workingColor
        if space without influence:
          apply all transforms to obj.color
          return {char, color}
      
      if maskValue in (0,100) (influence gradient):
        add transform, apply to workingColor
  
  apply all transforms to workingColor
  return {' ', workingColor}
```

#### Identified Bottlenecks

1. **Triple nested loops** (critical)
   - Outer: layers (typically 1-5 iterations)
   - Middle: objects on layer (varies widely)
   - Inner: transform application (can be many)
   - For 500x500 viewport = 250K cells × loops = millions of iterations

2. **Duplicate code** (medium)
   - Transform application code repeated 3 times (lines 790-799, 829-838, 876-882)
   - Should extract to helper function
   - Reduces code size and improves maintainability

3. **Function call overhead** (medium-high)
   - getObjectsOnLayer() called per layer per cell (line 747)
   - interpolateColor() and applyLayerMultiply() in hot path
   - Could cache layer object lists
   - Could inline color math

4. **Array allocations** (medium)
   - transformsToApply array created per cell (line 725)
   - Could pool/reuse arrays across cells
   - 250K allocations for 500x500 viewport

5. **Bounds checking overhead** (low-medium)
   - Multiple bounds checks per object (lines 765, 779-784)
   - Could pre-calculate visible object list per viewport

6. **String operations** (low)
   - Color strings parsed repeatedly
   - Type string comparisons (lines 792, 794, 796, etc.)
   - Could use numeric RGB internally

#### Optimization Opportunities (Prioritized)

**High Impact:**
1. Cache getObjectsOnLayer() results across cells in same render
2. Pre-filter objects by viewport bounds (skip objects completely outside viewport)
3. Early exit when no more objects/effects on remaining layers
4. Pool transformsToApply arrays (reuse across cells)

**Medium Impact:**
5. Extract duplicate transform application code to helper
6. Inline hot path color math functions
7. Cache layer list across renders (only rebuild on layer changes)

**Low Impact (profile first):**
8. Use numeric RGB instead of hex strings internally
9. Lookup tables for common color transformations
10. SIMD-like batch processing for blocks of cells

### Estimated Impact

For 500x500 viewport (250K cells):
- Current: 7.96ms (125 ops/sec)
- Target after optimization: <1ms (>1000 ops/sec)
- Expected improvement: 8-10x speedup

Most impact will come from reducing redundant work:
- Caching getObjectsOnLayer: 2-3x
- Pre-filtering objects: 1.5-2x
- Pooling arrays: 1.2-1.5x
- Early exits: 1.2-1.5x
- Combined: 5-10x total


## Optimization 1: Cache getObjectsOnLayer Results

### Implementation
Added layer-to-objects cache in renderScene() that is built once and passed to renderCell():
- Cache built in renderScene() before cell iteration
- Passed to renderCell() as parameter
- Eliminates 250,000+ getObjectsOnLayer() calls for 500x500 viewport

### Results

| Benchmark | Baseline | After Opt 1 | Improvement |
|-----------|----------|-------------|-------------|
| simple render (1 object) | 287,231 hz | 344,138 hz | +20% |
| medium (10 objects) | 30,899 hz | 46,287 hz | +50% |
| high (50 objects) | 7,159 hz | 14,158 hz | **+98% (2x)** |
| large viewport (100x100) | 3,485 hz | 4,518 hz | +30% |
| **very large viewport (500x500)** | **126 hz** | **171 hz** | **+36%** |
| panning | 12,139 hz | 17,212 hz | +42% |

### Analysis
- Biggest improvement in high-complexity scenarios (50 objects: 2x speedup)
- All benchmarks improved, showing universal benefit
- Very large viewport improved from 7.96ms to 5.86ms per render
- Medium complexity (10 objects) improved by 50%

### Impact
- Excellent ROI: Simple change with broad impact
- Reduces function call overhead significantly
- Opens door for further optimizations (can now filter cached list)


## Optimization 2: Pre-filter Objects by Viewport Bounds (REVERTED)

### Implementation
Attempted to filter objects to only those whose bounds intersect the viewport:
```typescript
const visibleObjects = allObjects.filter((obj) => {
  const bounds = obj.bounds;
  return !(bounds.maxX < viewport.x || bounds.minX >= viewport.x + viewport.width || 
           bounds.maxY < viewport.y || bounds.minY >= viewport.y + viewport.height);
});
```

### Results
- medium (10 objects): 46K → 45K hz (-2%)
- high (50 objects): 14K → 13K hz (-7%)  
- very large viewport: 171 → 174 hz (+2%)

### Decision: REVERTED
The filter() overhead outweighed the benefits. In benchmarks, objects are scattered throughout the world, so few objects are filtered out. The bounds checking added per-object overhead without sufficient payoff.

### Lesson Learned
Not all optimizations help in practice. The filter() call itself has overhead, and when most objects pass the filter (common case), we pay the cost without benefit. This optimization might help in specific scenarios (e.g., objects clustered in one corner), but hurts the general case.


## Optimization 3: Pool transformsToApply Arrays (REVERTED)

### Implementation
Attempted to reuse a single transformsToApply array across all cells by clearing it with `array.length = 0`.

### Results
- medium (10 objects): 46K → 32K hz (-30%)
- high (50 objects): 14K → 13K hz (-7%)
- very large viewport: 171 → 87 hz (-49%!)

### Decision: REVERTED
Severe performance degradation. Modern JavaScript engines are highly optimized for short-lived allocations. The array pooling strategy:
1. Confused JIT optimizers (may have deoptimized hot paths)
2. Lost benefits of generational garbage collection
3. Potentially worse cache locality

### Lesson Learned
Trust modern JS engine optimizations. Micro-optimizations like object pooling that work in languages like C++ can actually hurt performance in JavaScript. The V8 engine's generational GC is specifically optimized for "allocate and discard" patterns.

## Final Results

### Successful Optimizations
Only **Optimization 1** (Cache getObjectsOnLayer) was kept.

### Performance Gains

| Benchmark | Baseline | Final | Improvement |
|-----------|----------|-------|-------------|
| simple render (1 object) | 287,231 hz | 344,138 hz | +20% |
| medium (10 objects) | 30,899 hz | 46,287 hz | +50% |
| **high (50 objects)** | **7,159 hz** | **14,158 hz** | **+98% (2x)** |
| large viewport (100x100) | 3,485 hz | 4,518 hz | +30% |
| very large viewport (500x500) | 126 hz | 171 hz | +36% |
| panning | 12,139 hz | 17,212 hz | +42% |

### Key Takeaways
1. **One good optimization is better than many bad ones** - The single cache optimization provided substantial gains
2. **Profile, don't guess** - Both rejected optimizations seemed reasonable but hurt performance
3. **Modern engines are smart** - Trust V8's optimizations for allocation and GC
4. **Measure everything** - Every change was benchmarked before keeping/reverting

### Remaining Optimization Potential
For further improvements, consider:
- Inline hot-path color math functions
- Use typed arrays for color calculations (Uint8Array for RGB)
- SIMD operations for batch color transformations
- Worker threads for parallel viewport rendering

But current performance is reasonable:
- 500x500 viewport renders in 5.86ms (171 fps)
- 50 objects render at 14K ops/sec (0.07ms per render)
- Good enough for most real-time applications

