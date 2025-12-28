# Compositor Performance Baseline

**Date:** 2025-12-28
**Vitest:** v4.0.16
**Platform:** darwin

## Baseline Results

Performance measurements in operations per second (hz) and mean execution time:

| Benchmark | ops/sec | mean (ms) | p99 (ms) |
|-----------|---------|-----------|----------|
| Warm cache: reuse compositor instance | 3,345,982 | 0.0003 | 0.0007 |
| Horizontal flip | 1,357,634 | 0.0007 | 0.0011 |
| Vertical flip | 624,755 | 0.0016 | 0.0023 |
| Simple render (1 object, no effects) | 273,463 | 0.0037 | 0.0084 |
| Cold cache: create new compositor each time | 258,011 | 0.0039 | 0.0055 |
| AutoDetectEdges on complex shape | 158,166 | 0.0063 | 0.0092 |
| Single object with influence | 42,545 | 0.0235 | 0.0408 |
| Single layer with effect | 38,005 | 0.0263 | 0.0446 |
| Medium complexity (10 objects) | 30,729 | 0.0325 | 0.0537 |
| Multiple layers with stacking effects | 12,470 | 0.0802 | 0.1145 |
| Viewport offset (panning simulation) | 11,199 | 0.0893 | 0.2311 |
| High complexity (50 objects) | 6,934 | 0.1442 | 0.2075 |
| Multiple objects with overlapping influence | 4,925 | 0.2030 | 0.3275 |
| Large content object (50x50 grid) | 3,572 | 0.2799 | 0.4289 |
| Large viewport (100x100) | 3,470 | 0.2882 | 0.4211 |
| Very large viewport (500x500) | 126 | 7.9311 | 12.1701 |

## Performance Characteristics

### Fast Operations (>100K ops/sec)
- **Warm cache rendering**: 3.3M ops/sec - Extremely fast when reusing compositor instance
- **Flip operations**: 625K-1.3M ops/sec - Very lightweight transformations
- **Simple renders**: 258K-273K ops/sec - Basic rendering is highly optimized
- **AutoDetectEdges**: 158K ops/sec - Edge detection has minimal overhead

### Medium Performance (10K-100K ops/sec)
- **Single influence/layer effects**: 38K-42K ops/sec - Color transformations are moderately fast
- **Medium complexity scenes**: 30K ops/sec (10 objects) - Scales well with object count
- **Layer stacking**: 12K ops/sec - Multiple layer effects compound
- **Viewport panning**: 11K ops/sec - Dynamic viewport changes

### Slower Operations (<10K ops/sec)
- **High complexity**: 6.9K ops/sec (50 objects) - Linear degradation with object count
- **Overlapping influence**: 4.9K ops/sec - Multiple influences compound significantly
- **Large content/viewport**: 3.4K-3.5K ops/sec (100x100) - Area-dependent overhead
- **Very large viewport**: 126 ops/sec (500x500) - **Optimization target**

## Optimization Opportunities

1. **Very Large Viewports (500x500)**
   - Current: 126 ops/sec (7.9ms per render)
   - Most significant bottleneck
   - Consider: Chunking, spatial indexing, or viewport culling

2. **Overlapping Influence Effects**
   - Current: 4.9K ops/sec with 5 overlapping influences
   - ~6x slower than single influence
   - Consider: Influence caching or batch processing

3. **High Object Count Scaling**
   - 10 objects: 30K ops/sec
   - 50 objects: 6.9K ops/sec
   - ~4.3x degradation for 5x objects
   - Consider: Spatial partitioning or object pooling

## Measurement Notes

- Benchmarks use default Vitest bench configuration
- Each benchmark runs multiple iterations until statistical significance
- RME (Relative Margin of Error) ranges from 0.21% to 2.90%
- Results show good statistical stability (low RME values)

## Next Steps

Track performance improvements by comparing against these baseline numbers:
```bash
npm run bench
```

Monitor for regressions and aim to improve the slower operations identified above.
