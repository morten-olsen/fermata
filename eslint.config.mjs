// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// All feature types for convenience
const ALL_FEATURES = [
  "feature-playback",
  "feature-library",
  "feature-sources",
  "feature-sync",
  "feature-downloads",
  "feature-artwork",
  "feature-outputs",
  "feature-progress",
];

export default tseslint.config(
  // ---------------------------------------------------------------------------
  // Ignores
  // ---------------------------------------------------------------------------
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "build/",
      "drizzle/",
      "patches/",
      "public/",
      "storybook-static/",
      ".storybook/",
      "modules/",
      "scripts/",
      "*.config.js",
      "*.config.mjs",
      "babel.config.js",
      "metro.config.js",
      "nativewind-env.d.ts",
      "expo-env.d.ts",
    ],
  },
  // ---------------------------------------------------------------------------
  // Base: ESLint recommended + TypeScript strict
  // ---------------------------------------------------------------------------
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  // ---------------------------------------------------------------------------
  // Language & parser options (all TS/TSX files)
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        __DEV__: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
  },
  // ---------------------------------------------------------------------------
  // React & React Hooks
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      // React 17+ JSX transform — no need to import React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Pressable over TouchableOpacity
      "react/forbid-elements": [
        "error",
        {
          forbid: [
            {
              element: "TouchableOpacity",
              message: "Use <Pressable> instead of <TouchableOpacity>.",
            },
            {
              element: "TouchableHighlight",
              message: "Use <Pressable> instead of <TouchableHighlight>.",
            },
            {
              element: "TouchableWithoutFeedback",
              message: "Use <Pressable> instead of <TouchableWithoutFeedback>.",
            },
          ],
        },
      ],
    },
  },
  // ---------------------------------------------------------------------------
  // Import ordering & hygiene
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // Enforce import grouping per CODE-GUIDELINES.md:
      //   1. react / react-native
      //   2. Third-party (expo, zustand, etc.)
      //   3. @/src/features/ (other features via barrel)
      //   4. @/src/shared/
      //   5. Relative imports (within same feature)
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
          ],
          pathGroups: [
            {
              pattern: "{react,react-native,react-native/**,react-dom}",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/src/features/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/src/components/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@/src/shared/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
        },
      ],

      // No default exports (screens are exempted below)
      "import/no-default-export": "error",

      // Prevent duplicate imports
      "import/no-duplicates": "error",
    },
  },
  // ---------------------------------------------------------------------------
  // Allow default exports in screens (Expo Router requires them)
  // and in app.config.ts
  // ---------------------------------------------------------------------------
  {
    files: ["app/**/*.{ts,tsx}", "app.config.ts", "**/*.stories.{ts,tsx}"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  // ---------------------------------------------------------------------------
  // Feature boundaries — barrel import & dependency graph enforcement
  //
  // Uses eslint-plugin-boundaries v6 syntax (boundaries/dependencies).
  // Enforces two things:
  //   1. Cross-feature imports must go through the barrel ({feature}.ts)
  //   2. The dependency graph is a DAG (no circular feature deps)
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        // Each feature is a separate element type.
        // Sub-adapter dirs (jellyfin/) are internal to the sources feature.
        {
          type: "feature-playback",
          pattern: ["src/features/playback/**"],
        },
        {
          type: "feature-library",
          pattern: ["src/features/library/**"],
        },
        {
          type: "feature-sources",
          pattern: ["src/features/sources/**"],
        },
        {
          type: "feature-sync",
          pattern: ["src/features/sync/**"],
        },
        {
          type: "feature-downloads",
          pattern: ["src/features/downloads/**"],
        },
        {
          type: "feature-artwork",
          pattern: ["src/features/artwork/**"],
        },
        {
          type: "feature-outputs",
          pattern: ["src/features/outputs/**"],
        },
        {
          type: "feature-progress",
          pattern: ["src/features/progress/**"],
        },
        {
          type: "components",
          pattern: ["src/components/**"],
        },
        {
          type: "shared",
          pattern: ["src/shared/**"],
        },
        {
          type: "app",
          pattern: ["app/**"],
        },
      ],
      "boundaries/ignore": [
        "**/*.test.{ts,tsx}",
      ],
    },
    rules: {
      // -------------------------------------------------------------------
      // Barrel enforcement: cross-feature imports must use the barrel file.
      //
      // Within a feature, any file can import any sibling (relative imports).
      // From outside the feature, only the barrel is allowed.
      //
      // Barrel files follow the pattern: {feature}/{feature}.ts
      // e.g. src/features/playback/playback.ts
      // -------------------------------------------------------------------
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          rules: [
            // ---------------------------------------------------------------
            // Entry-point enforcement: when importing INTO a feature from
            // outside, only the barrel file ({feature}.ts) is allowed.
            // ---------------------------------------------------------------
            {
              // From any feature importing into playback — only barrel allowed
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-playback") },
              disallow: [
                { to: { type: "feature-playback", internalPath: "!playback.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-library") },
              disallow: [
                { to: { type: "feature-library", internalPath: "!library.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-sources") },
              disallow: [
                { to: { type: "feature-sources", internalPath: "!sources.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-sync") },
              disallow: [
                { to: { type: "feature-sync", internalPath: "!sync.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-downloads") },
              disallow: [
                { to: { type: "feature-downloads", internalPath: "!downloads.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-artwork") },
              disallow: [
                { to: { type: "feature-artwork", internalPath: "!artwork.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-outputs") },
              disallow: [
                { to: { type: "feature-outputs", internalPath: "!outputs.ts" } },
              ],
            },
            {
              from: { type: ALL_FEATURES.filter((f) => f !== "feature-progress") },
              disallow: [
                { to: { type: "feature-progress", internalPath: "!progress.ts" } },
              ],
            },
            // App screens must also go through barrels
            {
              from: { type: "app" },
              disallow: [
                { to: { type: "feature-playback", internalPath: "!playback.ts" } },
                { to: { type: "feature-library", internalPath: "!library.ts" } },
                { to: { type: "feature-sources", internalPath: "!sources.ts" } },
                { to: { type: "feature-sync", internalPath: "!sync.ts" } },
                { to: { type: "feature-downloads", internalPath: "!downloads.ts" } },
                { to: { type: "feature-artwork", internalPath: "!artwork.ts" } },
                { to: { type: "feature-outputs", internalPath: "!outputs.ts" } },
                { to: { type: "feature-progress", internalPath: "!progress.ts" } },
              ],
            },

            // ---------------------------------------------------------------
            // Dependency graph enforcement:
            //   sources     ← (leaf)
            //   outputs     ← sources
            //   artwork     ← sources
            //   library     ← sources, artwork, playback, downloads
            //   playback    ← sources, library, downloads, artwork, outputs
            //   sync        ← sources, library, artwork
            //   downloads   ← sources, library
            //   shared      ← no feature deps
            // ---------------------------------------------------------------

            // Sources: leaf — cannot import any other feature
            {
              from: { type: "feature-sources" },
              disallow: [
                { to: { type: "feature-playback" } },
                { to: { type: "feature-library" } },
                { to: { type: "feature-sync" } },
                { to: { type: "feature-downloads" } },
                { to: { type: "feature-artwork" } },
                { to: { type: "feature-outputs" } },
                { to: { type: "feature-progress" } },
              ],
            },
            // Progress: leaf — cannot import any other feature
            {
              from: { type: "feature-progress" },
              disallow: [
                { to: { type: "feature-playback" } },
                { to: { type: "feature-library" } },
                { to: { type: "feature-sources" } },
                { to: { type: "feature-sync" } },
                { to: { type: "feature-downloads" } },
                { to: { type: "feature-artwork" } },
                { to: { type: "feature-outputs" } },
              ],
            },
            // Outputs: can depend on sources
            {
              from: { type: "feature-outputs" },
              disallow: [
                { to: { type: "feature-playback" } },
                { to: { type: "feature-library" } },
                { to: { type: "feature-sync" } },
                { to: { type: "feature-downloads" } },
                { to: { type: "feature-artwork" } },
                { to: { type: "feature-progress" } },
              ],
            },
            // Artwork: can depend on sources
            {
              from: { type: "feature-artwork" },
              disallow: [
                { to: { type: "feature-playback" } },
                { to: { type: "feature-library" } },
                { to: { type: "feature-sync" } },
                { to: { type: "feature-downloads" } },
                { to: { type: "feature-outputs" } },
                { to: { type: "feature-progress" } },
              ],
            },
            // Library: can depend on sources, artwork, playback, downloads
            {
              from: { type: "feature-library" },
              disallow: [
                { to: { type: "feature-sync" } },
              ],
            },
            // Playback: can depend on sources, library, downloads, artwork
            {
              from: { type: "feature-playback" },
              disallow: [
                { to: { type: "feature-sync" } },
              ],
            },
            // Sync: can depend on sources, library, artwork
            {
              from: { type: "feature-sync" },
              disallow: [
                { to: { type: "feature-playback" } },
                { to: { type: "feature-downloads" } },
                { to: { type: "feature-outputs" } },
              ],
            },
            // Downloads: can depend on sources, library
            {
              from: { type: "feature-downloads" },
              disallow: [
                { to: { type: "feature-playback" } },
                { to: { type: "feature-sync" } },
                { to: { type: "feature-artwork" } },
                { to: { type: "feature-outputs" } },
                { to: { type: "feature-progress" } },
              ],
            },
            // Components: cannot import from any feature
            {
              from: { type: "components" },
              disallow: ALL_FEATURES.map((f) => ({ to: { type: f } })),
            },
            // Shared: cannot import from any feature or components
            {
              from: { type: "shared" },
              disallow: [
                ...ALL_FEATURES.map((f) => ({ to: { type: f } })),
                { to: { type: "components" } },
              ],
            },
          ],
        },
      ],
    },
  },
  // ---------------------------------------------------------------------------
  // TypeScript rules
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Enforce `import type` for type-only imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],

      // No enums — use string literal unions
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message:
            "Enums are not allowed. Use string literal unions instead: type Foo = 'a' | 'b'",
        },
      ],

      // Allow unused vars prefixed with _ (common for destructuring)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Relax some overly strict rules from strictTypeChecked
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // Allow require() for lazy-loading optional native modules (e.g. RNTP).
      // This is an intentional pattern for Expo Go compatibility.
      "@typescript-eslint/no-require-imports": "off",
      // The unsafe-* rules flag require()'d modules heavily. Keep as warnings
      // so they're visible but don't block — these are isolated to service files.
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
    },
  },
  // ---------------------------------------------------------------------------
  // General rules
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // No console.log — use shared/lib/log.ts
      "no-console": "error",

      // No StyleSheet.create — use NativeWind className
      "no-restricted-properties": [
        "error",
        {
          object: "StyleSheet",
          property: "create",
          message:
            "StyleSheet.create is not allowed. Use NativeWind className instead.",
        },
      ],

      // Prefer const
      "prefer-const": "error",

      // No var
      "no-var": "error",
    },
  },
  storybook.configs["flat/recommended"]
);
