import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { DeployTarget } from './store'

export function detectDeployTarget(cwd: string): DeployTarget {
  // Next.js config file → Vercel
  if (
    existsSync(join(cwd, 'next.config.js')) ||
    existsSync(join(cwd, 'next.config.ts')) ||
    existsSync(join(cwd, 'next.config.mjs'))
  ) return 'vercel'

  const pkgPath = join(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps['next']) return 'vercel'
      // Vite/React without a server framework → static → Netlify
      if (
        (deps['vite'] || deps['react-scripts']) &&
        !deps['express'] &&
        !deps['fastify'] &&
        !deps['koa'] &&
        !deps['hapi']
      ) return 'netlify'
    } catch {}
  }

  // Python project → Railway
  if (
    existsSync(join(cwd, 'requirements.txt')) ||
    existsSync(join(cwd, 'pyproject.toml'))
  ) return 'railway'

  // Default fallback
  return 'railway'
}
