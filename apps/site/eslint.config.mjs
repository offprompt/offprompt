import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

import root from '../../eslint.config.mjs'

export default tseslint.config(
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...root,
  nextPlugin.configs['core-web-vitals'],
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['postcss.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { parserOptions: { projectService: false } },
  },
)
