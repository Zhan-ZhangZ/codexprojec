import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      // Build output
      "dist/**",
      "build/**",
      // Node modules
      "node_modules/**",
      // Generated files
      "*.generated.ts",
      "*.min.js",
      // Third party code
      "**/third_party/**",
      "**/vendor/**",
      // Coverage directory
      "coverage/**"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-this-alias": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-useless-escape": "off"
    },
  },
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "script" } },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Buffer: true,
        process: true,
        setImmediate: true,
        global: true,
        WorkerGlobalScope: true
      }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
