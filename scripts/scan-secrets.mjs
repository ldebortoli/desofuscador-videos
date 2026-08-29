import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'

const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
const files = output.toString('utf8').split('\0').filter(Boolean)
const textExtensions = new Set([
  '',
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ps1',
  '.svg',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml'
])
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/u
]

const findings = []
for (const file of files) {
  if (!textExtensions.has(extname(file).toLowerCase()) || (await stat(file)).size > 1_000_000) continue
  const content = await readFile(file, 'utf8')
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file)
}

if (findings.length > 0) throw new Error(`Posibles secretos detectados en: ${findings.join(', ')}`)
console.log(`Secret scan OK: ${files.length} archivos revisados`)
