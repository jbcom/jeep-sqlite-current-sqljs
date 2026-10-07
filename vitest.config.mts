import { defineVitestConfig } from '@stencil/vitest/config';
import { stencilVitestPlugin } from '@stencil/vitest/plugin';

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/components.d.ts', 'src/**/*.spec.tsx', 'src/interfaces/**'],
      reporter: ['text-summary', 'lcov'],
      // A floor, not a target: the component source is upstream's and mostly exercised through
      // its manual browser pages. Raise it as tests land; never lower it to pass a change.
      thresholds: { statements: 24, branches: 18, functions: 55, lines: 24 },
    },
    projects: [
      {
        // The element, mounted in Stencil's DOM environment.
        plugins: [stencilVitestPlugin()],
        test: {
          name: 'spec',
          include: ['src/**/*.spec.{ts,tsx}'],
          environment: 'stencil',
        },
      },
      {
        // The engine and persistence logic, run against the real sql.js in Node.
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
