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
      // El build de verificación: código generado, no fuente nuestra.
      '.next-verify/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    // Las pruebas e2e no son React. El parámetro `use` de las fixtures de
    // Playwright dispara la regla de hooks por su nombre, no por lo que hace.
    files: ['e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]

export default eslintConfig
