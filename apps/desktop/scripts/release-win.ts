/** Build the Windows x64 installer, shortening NSIS template paths on macOS. */

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'

function run(command: string, args: readonly string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { env, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
}

function removePreviousWindowsArtifacts(): void {
  const distDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  if (!existsSync(distDirectory)) return
  rmSync(join(distDirectory, 'windows'), { recursive: true, force: true })
  for (const name of readdirSync(distDirectory)) {
    if (!name.startsWith('Starlight-Harness-Windows-')
      && !name.startsWith('Starlight-Harness-Desktop-Windows-x64-')
      && !name.startsWith('@deepseek-aidsh-desktop-')) continue
    const path = join(distDirectory, name)
    if (name.endsWith('.exe') || name.endsWith('.zip') || name.endsWith('.blockmap') || name.endsWith('.7z')) {
      unlinkSync(path)
    }
  }
}

function archiveLatestWindowsInstaller(): void {
  const distDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const scriptSource = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'uninstall-starlight-harness.bat')
  const deliveryDirectory = join(distDirectory, 'windows')
  mkdirSync(deliveryDirectory, { recursive: true })
  const installer = readdirSync(distDirectory)
    .find(name => name.startsWith('Starlight-Harness-Windows-') && name.endsWith('.exe'))
  if (installer === undefined) throw new Error('Windows installer was not produced')
  const installerPath = join(distDirectory, installer)
  const deliveryInstallerPath = join(deliveryDirectory, installer)
  const scriptPath = join(deliveryDirectory, 'uninstall.bat')
  copyFileSync(installerPath, deliveryInstallerPath)
  copyFileSync(scriptSource, scriptPath)
  const archivePath = join(deliveryDirectory, `${basename(installer, '.exe')}.zip`)
  writeFileSync(archivePath, zipSync({
    [installer]: readFileSync(deliveryInstallerPath),
    'uninstall.bat': readFileSync(scriptPath),
  }, { level: 0 }))
  unlinkSync(installerPath)
  const blockmapPath = `${installerPath}.blockmap`
  if (existsSync(blockmapPath)) unlinkSync(blockmapPath)
  console.log(`Windows installer archive written to ${archivePath}`)
}

/**
 * NSIS still uses a fixed 260-character buffer for POSIX include paths. pnpm's
 * content-addressed app-builder-lib path can exceed it, so macOS cross-builds
 * expose the same templates through a short temporary symlink.
 */
export function releaseWin(extraArgs: readonly string[] = []): void {
  const environment = { ...process.env }
  let temporaryRoot: string | undefined
  try {
    removePreviousWindowsArtifacts()
    if (process.platform === 'darwin') {
      const localRequire = createRequire(import.meta.url)
      const electronBuilderPackage = localRequire.resolve('electron-builder/package.json')
      const builderRequire = createRequire(electronBuilderPackage)
      const appBuilderPackage = builderRequire.resolve('app-builder-lib/package.json')
      const templateSource = join(dirname(appBuilderPackage), 'templates', 'nsis')
      temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-nsis-'))
      const shortTemplates = join(temporaryRoot, 'nsis')
      symlinkSync(templateSource, shortTemplates, 'dir')
      environment.ELECTRON_BUILDER_NSIS_TEMPLATE_DIR = shortTemplates
    }
    run('pnpm', ['exec', 'electron-builder', '--win', 'nsis', '--x64', ...extraArgs], environment)
    archiveLatestWindowsInstaller()
  } finally {
    if (temporaryRoot !== undefined) rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

try {
  releaseWin(process.argv.slice(2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
