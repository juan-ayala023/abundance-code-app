import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * eslint-config-next exporta flat config nativo: no usar FlatCompat
 * (produce un error de estructura circular al resolver los plugins).
 */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default eslintConfig
