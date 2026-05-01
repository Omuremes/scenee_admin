import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Codebase uses `catch (err: any)` extensively for fetch error handling.
      '@typescript-eslint/no-explicit-any': 'off',
      // Many pages legitimately call setState from effects when fetching
      // data or resetting pagination on filter change.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
