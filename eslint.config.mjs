import globals from "globals";
import js from "@eslint/js";
import minecraftLinting from "eslint-plugin-minecraft-linting";

export default [
  js.configs.recommended,
  {
    plugins: {
      "minecraft-linting": minecraftLinting
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Add any specific rules here if needed
    }
  },
  // Configuration for minecraft-linting plugin if it has its own configs
  // For example, if minecraftLinting.configs.recommended exists:
  // minecraftLinting.configs.recommended
  // Since "plugin:minecraft-linting/recommended" was in extends,
  // we need to see how the plugin expects to be configured in the new format.
  // Often, plugins expose a 'configs' object.
  // If 'minecraftLinting.configs.recommended' is the way, it would look like:
  // {
  //   ...minecraftLinting.configs.recommended,
  //   files: ["Anti Cheats BP/scripts/**/*.js"] // Apply only to specific files if needed
  // }
  // For now, I'll assume the plugin's rules are applied via the 'plugins' section
  // and its rules will be active. If not, I'll adjust after the first run.
  // A common pattern is to spread its recommended config if available.
  // Let's try to spread its rules directly if it exposes them,
  // or find its recommended config.
  // The plugin's documentation would clarify this.
  // Based on "plugin:minecraft-linting/recommended", it likely has a recommended config.
  // Let's assume it's available as minecraftLinting.configs.recommended
   ...(minecraftLinting.configs && minecraftLinting.configs.recommended ? [minecraftLinting.configs.recommended] : [])

];
