import globals from "globals";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Logic-focused rules only
      eqeqeq: "error",
      "no-console": "off",
    },
  },
  {
    // Ignore build or output folders
    ignores: ["dist/**"],
  },
];
// This ESLint configuration is designed to enforce best practices and maintain code quality in a Node.js environment.
// It includes recommended rules from ESLint, integrates Prettier for code formatting, and sets up the environment for Node.js.
// The configuration also allows for custom rules, such as enforcing strict equality
