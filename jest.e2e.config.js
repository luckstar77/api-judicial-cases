/** E2E tests：需要真實 MySQL（npm run db:test:up） */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.e2e\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/database/test/setup-env.ts'],
  testTimeout: 30000,
  clearMocks: true,
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/test/**', '!main.ts', '!database/migrations/**', '!database/data-source.ts'],
  coverageDirectory: '../coverage',
};
