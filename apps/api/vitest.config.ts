import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run each file in its own worker — isolates Prisma mock state
    isolate: true,
    // Load the .env.test file if present, otherwise use the mocked env below
    setupFiles: ['./tests/setup.ts'],
    // Coverage config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/chat/**', 'src/modules/offers/**'],
    },
    // Increase timeout for integration-style tests
    testTimeout: 20_000,
  },
});
