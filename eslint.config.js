import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import { includeIgnoreFile } from "@eslint/compat";
import eslintConfigPrettier from "eslint-config-prettier";
import { join } from "node:path";

export default [
  includeIgnoreFile(join(import.meta.dirname, ".gitignore")),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,

      // // React settings
      "react/react-in-jsx-scope": "off",

      // // TypeScript specific
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  eslintConfigPrettier, // Must be last to override other configs
];
