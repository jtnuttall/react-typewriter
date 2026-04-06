import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.direnv/**'],
    },
  },
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    environment: 'jsdom',
    include: ['src/**/*.test.{tsx,ts}'],
  },
});
