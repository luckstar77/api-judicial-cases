/** Unit tests：不連任何外部資源 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '^(?!.*\\.e2e\\.spec\\.ts$).*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/test/**', '!main.ts', '!database/migrations/**', '!database/data-source.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  clearMocks: true,
};
