// default vitest config
import { defineConfig } from 'vitest/config';

const testMode = process.env.TEST_MODE === 'pg' ? 'pg' : 'sqlite3';
const include = testMode === 'pg' ? ['./**/*.spec.ts'] : ['./**/*.test.ts'];

const config = defineConfig({
  test: {
    exclude: ['node_modules', 'dist', 'build', 'coverage'],
    include,
  }
});

export default config;
