import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import react from 'eslint-plugin-react';
import prettier from 'eslint-plugin-prettier';
import jsxa11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...fixupConfigRules(
    compat.extends(
      'plugin:react/recommended',
      'plugin:@next/next/recommended',
      'prettier',
      'plugin:@typescript-eslint/recommended',
    ),
  ),
  {
    plugins: {
      react: fixupPluginRules(react),
      prettier,
      'jsx-a11y': jsxa11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // Include Node.js globals
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        chrome: 'readonly',
      },
      ecmaVersion: 12,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    ignores: ['node_modules/*', '.git/', '.next/', 'yarn.lock', 'yarn-error.log'],
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: {
      'import/no-extraneous-dependencies': 0,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react/forbid-prop-types': [
        'off',
        {
          forbid: ['any'],
          checkContextTypes: true,
          checkChildContextTypes: true,
        },
      ],
      semi: [2, 'always'],
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
      'react/jsx-filename-extension': [
        1,
        {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      ],
      'no-unused-vars': 'error',
      'react/state-in-constructor': 'off',
      'react/function-component-definition': [
        2,
        {
          namedComponents: 'function-declaration',
        },
      ],
      'prefer-const': 'error',
      'default-param-last': 'off',
      'react/jsx-props-no-spreading': 'off',
      'no-console': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-undef': 'error',
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
    },
  },
];
