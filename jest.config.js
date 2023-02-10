module.exports = {
  testEnvironment: 'jsdom',
  reporters: ['default', 'github-actions'],
  clearMocks: true,
  preset: 'ts-jest/presets/js-with-babel',
  testPathIgnorePatterns: ['/dist/', '/node_modules/', '/.yalc/'],
  modulePathIgnorePatterns: ['/dist/', '/.yalc/'],
};
