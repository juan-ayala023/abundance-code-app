import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * `next dev` y `next build` comparten .next por defecto, y el build pisa los
   * artefactos del servidor de desarrollo: éste sigue vivo pero sirve CSS y
   * chunks que ya no existen. Dando al build de verificación su propia carpeta,
   * `npm run verify` deja de romper la sesión de desarrollo que tengas abierta.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Falla el build si hay errores de tipos o lint. No silenciar.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
}

export default nextConfig
