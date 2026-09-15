/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src/server'],
  testMatch: ['**/*.test.ts'],
  // Server source uses ESM-style `.js` relative imports; map them back to `.ts` for ts-jest.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
