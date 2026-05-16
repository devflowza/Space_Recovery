import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { BANNED_TABLES } from './eslint-rules/banned-tables.js';
import noBannedEmbeds from './eslint-rules/no-banned-embeds-in-select.js';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'xsuite': { rules: { 'no-banned-embeds-in-select': noBannedEmbeds } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression[callee.property.name="from"][arguments.0.value=/^(' + BANNED_TABLES.join('|') + ')$/]',
        message: 'Legacy table name. Use catalog_*/master_*/geo_* prefix. See CLAUDE.md.',
      }],
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'src/types/database', message: 'Use src/types/database.types instead.' },
          { name: '../types/database', message: 'Use ../types/database.types instead.' },
          { name: '../../types/database', message: 'Use ../../types/database.types instead.' },
        ],
      }],
      'xsuite/no-banned-embeds-in-select': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  }
);
