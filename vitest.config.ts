import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        hookTimeout: 120000,
        include: ['test/**/*.test.ts'],
        testTimeout: 120000,
    },
});
