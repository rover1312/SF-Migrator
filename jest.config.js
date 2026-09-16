/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src/server'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }],
  },
};
