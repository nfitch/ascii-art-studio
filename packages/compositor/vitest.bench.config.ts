import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['benchmarks/**/*.bench.ts'],
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      // Output benchmark results to console with detailed stats
      outputFile: './benchmarks/results.json',
    },
  },
});
