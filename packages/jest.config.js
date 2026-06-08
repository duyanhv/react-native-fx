module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  passWithNoTests: true,
  transformIgnorePatterns: [
    'node_modules/(?!' +
      '.*@react-native' +
      '|.*react-native' +
      '|.*expo' +
      ')/',
  ],
};
