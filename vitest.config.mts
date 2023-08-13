// default vitest config
import { defineConfig } from 'vitest/config';

const config = defineConfig({
  test: {
    exclude: ['node_modules', 'dist', 'build', 'coverage'],
    include: ['./**/*.test.ts'],
  }
});

export default config;
