// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const exampleModules = path.resolve(__dirname, 'node_modules');
const libModules = path.resolve(__dirname, '../packages/node_modules');
const rootModules = path.resolve(__dirname, '../node_modules');

// The library (../packages) ships its own react / react-native / expo for
// building and type-checking, and the workspace may hoist them to the repo root.
// Those must NOT enter the app bundle — a second copy of any of these singletons
// breaks the TurboModule registry and the Expo native-module registry. Block
// every copy outside the example, and force the example's via extraNodeModules.
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  // On Windows the path resolves with `\`; escape it for the RegExp.
  new RegExp(path.resolve(libModules, 'react').replace(/\\/g, '\\\\')), // react, react-native, react-*
  new RegExp(path.resolve(libModules, 'expo').replace(/\\/g, '\\\\')), // expo, expo-modules-core, expo-*
  new RegExp(path.resolve(rootModules, 'react').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve(rootModules, 'expo').replace(/\\/g, '\\\\')),
];

config.resolver.nodeModulesPaths = [
  exampleModules,
  path.resolve(__dirname, '../node_modules'),
];

config.resolver.extraNodeModules = {
  'react-native-fx': path.resolve(__dirname, '../packages'),
  react: path.resolve(exampleModules, 'react'),
  'react-native': path.resolve(exampleModules, 'react-native'),
  expo: path.resolve(exampleModules, 'expo'),
  'expo-modules-core': path.resolve(exampleModules, 'expo-modules-core'),
};

config.watchFolders = [path.resolve(__dirname, '../packages')];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
