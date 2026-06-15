module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 ships its Babel plugin from react-native-worklets; it rewrites
    // worklet functions and must stay last in the plugin list. Required by
    // @gorhom/bottom-sheet's reanimated-driven gestures on the coexistence screen.
    plugins: ['react-native-worklets/plugin'],
  };
};
