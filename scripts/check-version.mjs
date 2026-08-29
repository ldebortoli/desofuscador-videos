import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const currentVersion = String(packageJson.version ?? '')
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(currentVersion)) {
  throw new Error('package.json debe declarar una version SemVer valida')
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
const canResolve = (reference) => {
  try {
    git('rev-parse', '--verify', reference)
    return true
  } catch {
    return false
  }
}
const productPath = (path) =>
  path === 'package.json' || path === 'electron.vite.config.ts' || path.startsWith('src/') || path.startsWith('build/')

let base = null
let changed = []
if (canResolve('HEAD')) {
  changed = git('diff', '--name-only', 'HEAD', '--').split(/\r?\n/u).filter(Boolean)
  base = 'HEAD'
  if (changed.length === 0 && canResolve('HEAD^')) {
    changed = git('diff', '--name-only', 'HEAD^', 'HEAD', '--').split(/\r?\n/u).filter(Boolean)
    base = 'HEAD^'
  }
}

if (base && changed.some(productPath)) {
  const previousPackage = JSON.parse(git('show', `${base}:package.json`))
  if (previousPackage.version === currentVersion) {
    throw new Error(`Hay cambios ejecutables respecto de ${base} pero la version sigue en ${currentVersion}`)
  }
}

console.log(`Version gate OK: ${currentVersion}`)
