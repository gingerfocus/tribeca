import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Downgrade certain warnings to not block builds
  {
    rules: {
      // Allow setState in effects (common pattern for initial data fetching)
      "react-hooks/set-state-in-effect": "warn",
      // Allow inline components in render (common pattern)
      "react-hooks/static-components": "warn",
      // Allow unused vars in certain cases
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      // Allow any in test files
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
