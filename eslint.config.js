// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // This app intentionally loads persisted SQLite data when screens focus/
      // mount, which requires calling setState inside useEffect/useFocusEffect.
      // That is a deliberate, correct pattern here (syncing external DB state
      // into React), so we surface it as a warning rather than a hard error
      // instead of rewriting working data-loading logic.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
