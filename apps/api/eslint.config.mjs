import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config({
  files: ['src/**/*.ts', 'test/**/*.ts'],
  extends: tseslint.configs.recommended,
  languageOptions: {
    parserOptions: {
      project: resolve(__dirname, 'tsconfig.json'),
      tsconfigRootDir: __dirname,
    },
  },
  ignores: ['dist/', 'coverage/', 'node_modules/'],
});
