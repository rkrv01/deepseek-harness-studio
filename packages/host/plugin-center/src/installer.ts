/** Install/uninstall plugins via dsh plugin and self-restart the Host. @module @deepseek-ai/dsh-host-plugin-center/installer */

import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

/** Resolve the dsh CLI entry path relative to the package. */
function cliEntry(): string {
  const HERE = fileURLToPath(new URL('.', import.meta.url))
  const dev = join(HERE, '../../../../apps/cli/lib/bin.js')
  if (existsSync(dev)) return dev
  const prod = join(HERE, '../../node_modules/@deepseek-ai/dsh/lib/bin.js')
  if (existsSync(prod)) return prod
  throw new Error('dsh CLI entry not found')
}

/** Resolve the profile directory from DSH_HOME. */
function profileDir(): string {
  const home = process.env.DSH_HOME ?? join(process.env.HOME ?? '', '.dsh')
  return join(home, 'profiles', 'web')
}

/**
 * Convert a catalog pluginId (e.g. `npm.xmanrui.dsh-im.413158b73d87`) back to
 * the real npm package name (e.g. `@xmanrui/dsh-im`). Non-catalog IDs pass through.
 */
function pluginIdToPackageName(pluginId: string): string {
  if (!pluginId.startsWith('npm.')) return pluginId
  const rest = pluginId.slice(4)
  const withoutHash = rest.slice(0, -13)
  return withoutHash.includes('.')
    ? '@' + withoutHash.replace('.', '/')
    : withoutHash
}

/** Install a plugin by name into the web profile. */
export function installPlugin(pluginId: string, version: string): boolean {
  const packageName = pluginIdToPackageName(pluginId)
  const spec = version ? `${packageName}@${version}` : packageName
  const result = spawnSync(
    process.execPath,
    ['--expose-internals', cliEntry(), 'plugin', '--profile', 'web', 'add', spec],
    { cwd: profileDir(), stdio: 'inherit' },
  )
  return result.status === 0
}

/** Remove a plugin by name from the web profile. */
export function removePlugin(pluginName: string): boolean {
  const packageName = pluginIdToPackageName(pluginName)
  const result = spawnSync(
    process.execPath,
    ['--expose-internals', cliEntry(), 'plugin', '--profile', 'web', 'remove', packageName],
    { cwd: profileDir(), stdio: 'inherit' },
  )
  return result.status === 0
}

/**
 * Self-restart: write a helper script to a temp file, spawn it detached,
 * then SIGTERM self. The helper waits for the port to be free, then respawns.
 */
export function scheduleRestart(port: number | null): void {
  const script = restartHelperScript(port)
  const scriptPath = join(tmpdir(), `dsh-restart-${Date.now()}.mjs`)
  writeFileSync(scriptPath, script, 'utf8')
  const helper = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  helper.unref()
  setTimeout(() => { process.kill(process.pid, 'SIGTERM') }, 500)
}

function restartHelperScript(port: number | null): string {
  return [
    'import { spawn } from "node:child_process"',
    'import { appendFileSync } from "node:fs"',
    'import { connect } from "node:net"',
    'const note = (line) => { try { appendFileSync("/tmp/dsh-restart.log", `[dsh] ${line}\n`) } catch {} }',
    `const port = ${JSON.stringify(port)}`,
    `const file = ${JSON.stringify(process.execPath)}`,
    `const args = ${JSON.stringify(process.argv.slice(1))}`,
    `const cwd = ${JSON.stringify(process.cwd())}`,
    'const sleep = (ms) => new Promise(r => setTimeout(r, ms))',
    'const listening = () => new Promise((resolve) => {',
    '  const probe = connect({ host: "127.0.0.1", port })',
    '  const done = (value) => { probe.destroy(); resolve(value) }',
    '  probe.on("connect", () => done(true))',
    '  probe.on("error", () => done(false))',
    '  setTimeout(() => done(false), 500)',
    '})',
    'const main = async () => {',
    '  if (port) {',
    '    const until = Date.now() + 30000',
    '    while (Date.now() < until && await listening()) await sleep(250)',
    '    if (await listening()) note(`port ${port} was still in use after 30s; starting anyway`)',
    '    await sleep(300)',
    '  } else {',
    '    await sleep(1500)',
    '  }',
    '  try {',
    '    const child = spawn(file, args, { cwd, detached: true, stdio: "inherit" })',
    '    child.on("error", (err) => note(`spawn error: ${err.message}`))',
    '    child.unref()',
    '  } catch (err) {',
    '    note(`catch error: ${err.message}`)',
    '  }',
    '}',
    'main()',
  ].join('\n')
}
