import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.js', '*.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      'dot-notation': 'error',
      'no-restricted-syntax': ['error', { selector: 'ImportNamespaceSpecifier', message: 'Use named imports instead of wildcard imports.' }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/test/**/*.ts'],
    rules: { '@typescript-eslint/no-unsafe-argument': 'off' },
  },
);
