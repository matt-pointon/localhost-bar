import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const cache = new Map<string, { tags: string[]; expiry: number }>()
const TTL = 60_000

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function depsFromPkg(cwd: string): Record<string, string> {
  const pkg = readJson(join(cwd, 'package.json'))
  if (!pkg) return {}
  return {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined)
  }
}

const FRAMEWORK_RULES: [string, string][] = [
  ['next', 'Next.js'],
  ['nuxt', 'Nuxt'],
  ['@remix-run/react', 'Remix'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['vue', 'Vue'],
  ['react', 'React'],
  ['vite', 'Vite'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['@nestjs/core', 'NestJS'],
  ['django', 'Django'],
  ['flask', 'Flask'],
  ['rails', 'Rails']
]

const DB_RULES: [string, string][] = [
  ['prisma', 'Prisma'],
  ['@prisma/client', 'Prisma'],
  ['drizzle-orm', 'Drizzle'],
  ['mongoose', 'MongoDB'],
  ['pg', 'Postgres'],
  ['postgres', 'Postgres'],
  ['mysql2', 'MySQL'],
  ['redis', 'Redis'],
  ['@supabase/supabase-js', 'Supabase'],
  ['firebase', 'Firebase']
]

const UI_RULES: [string, string][] = [
  ['tailwindcss', 'Tailwind'],
  ['@chakra-ui/react', 'Chakra'],
  ['@mui/material', 'MUI'],
  ['antd', 'Ant Design'],
  ['@radix-ui/react', 'Radix'],
  ['shadcn', 'shadcn']
]

function firstMatch(deps: Record<string, string>, rules: [string, string][]): string | null {
  for (const [pkg, label] of rules) {
    if (deps[pkg]) return label
  }
  return null
}

function tagsFromPython(cwd: string): string[] {
  const tags: string[] = []
  if (existsSync(join(cwd, 'pyproject.toml'))) {
    try {
      const content = readFileSync(join(cwd, 'pyproject.toml'), 'utf-8')
      if (/django/i.test(content)) tags.push('Django')
      else if (/flask/i.test(content)) tags.push('Flask')
      else tags.push('Python')
    } catch {
      tags.push('Python')
    }
  } else if (existsSync(join(cwd, 'requirements.txt'))) {
    tags.push('Python')
  }
  return tags
}

function tagsFromRust(cwd: string): string[] {
  if (!existsSync(join(cwd, 'Cargo.toml'))) return []
  try {
    const content = readFileSync(join(cwd, 'Cargo.toml'), 'utf-8')
    if (/axum/i.test(content)) return ['Rust', 'Axum']
    if (/actix/i.test(content)) return ['Rust', 'Actix']
    return ['Rust']
  } catch {
    return ['Rust']
  }
}

export function detectStackTags(cwd: string | null): string[] {
  if (!cwd) return []

  const cached = cache.get(cwd)
  if (cached && Date.now() < cached.expiry) return cached.tags

  const tags: string[] = []
  const deps = depsFromPkg(cwd)

  if (Object.keys(deps).length > 0) {
    const framework = firstMatch(deps, FRAMEWORK_RULES)
    const db = firstMatch(deps, DB_RULES)
    const ui = firstMatch(deps, UI_RULES)
    if (framework) tags.push(framework)
    if (db) tags.push(db)
    if (ui) tags.push(ui)
  }

  if (tags.length < 3) {
    for (const t of tagsFromPython(cwd)) {
      if (!tags.includes(t) && tags.length < 3) tags.push(t)
    }
  }
  if (tags.length < 3) {
    for (const t of tagsFromRust(cwd)) {
      if (!tags.includes(t) && tags.length < 3) tags.push(t)
    }
  }

  const result = tags.slice(0, 3)
  cache.set(cwd, { tags: result, expiry: Date.now() + TTL })
  return result
}
