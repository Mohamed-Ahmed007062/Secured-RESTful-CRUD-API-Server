import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false, // Run test files sequentially to ensure clean database state
    environment: 'node',
    testTimeout: 15000,
  },
});
