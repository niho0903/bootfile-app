import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    // Snapshot diffs in this suite are product-thesis changes (see CLAUDE.md Hard Rule #5).
    // Never run vitest with -u in automation. Always review the diff by hand.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
