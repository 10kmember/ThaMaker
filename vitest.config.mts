import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // PostgreSQL is a hard requirement of the application, so importing any
    // server module validates the environment. The unit suite never opens a
    // connection — the limiter it exercises uses its in-process counters — but
    // it must satisfy the same validation the application does.
    env: {
      DATABASE_URL: 'postgresql://palma:palma@127.0.0.1:5432/palma-unit-tests?schema=public',
      AUTH_SECRET: 'unit-test-secret-unit-test-secret-unit-test-0123',
    },
    include: ['tests/**/*.test.ts'],
    exclude: process.env.DATABASE_URL ? [] : ['tests/integration/**'],
    globals: false,
  },
});
