const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: '.' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/test-results/'],
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/test-results/'],
  watchPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/test-results/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'middleware.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/test-results/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(config);
