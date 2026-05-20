import tseslint from 'typescript-eslint';
import baseConfig from '@medschedule/eslint-config/base';

export default tseslint.config(...baseConfig, {
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  ignores: ['dist/', 'coverage/', 'node_modules/', 'prisma/generated/'],
});
