import tseslint from 'typescript-eslint';
import nextConfig from '@medschedule/eslint-config/next';

export default tseslint.config(...nextConfig, {
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  ignores: ['.next/', 'node_modules/', 'coverage/'],
});
