import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/tests/**' // Exclude existing Jest tests only
    ],
    include: [
      'src/test/*.test.ts'
    ]
  }
})