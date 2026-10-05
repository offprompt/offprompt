import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.preview/**',
      '**/node_modules/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'packages/e2e/runs/**',
      '.context/**',
      '.turbo/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'arrow-parens': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: true, classes: true, variables: true },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ForStatement', message: 'Use a declarative iteration helper.' },
        { selector: 'ForInStatement', message: 'Use Object.entries.' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['**/scripts/**/*.mjs', '**/tests/helpers/**/*.mjs', 'packages/playground/**/*.mjs', 'packages/e2e/projects/**/*.mjs', 'eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', URL: 'readonly' },
      // Scripts that nothing imports are outside the TypeScript project.
      parserOptions: { projectService: false },
    },
  },
)
