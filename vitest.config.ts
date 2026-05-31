import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Two projects:
// - node: pure logic (.test.ts) — money math, status derivation, cn, variants. No DOM.
// - dom:  components/hooks (.test.tsx) — jsdom + Testing Library.
// Kept separate so the production build config (vite.config.ts) is untouched.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
});
