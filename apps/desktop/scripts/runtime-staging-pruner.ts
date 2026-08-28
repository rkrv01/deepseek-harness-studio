/** Remove compile-time metadata from the packaged Desktop Host dependency tree. */

import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const NON_RUNTIME_SUFFIXES = ['.d.ts', '.d.mts', '.d.cts', '.map'] as const
const NON_RUNTIME_DIRECTORY_NAMES = new Set([
  '.github',
  '__tests__',
  'demo',
  'demos',
  'documentation',
  'docs',
  'example',
  'examples',
  'test',
  'tests',
])
const NON_RUNTIME_FILE_NAMES = new Set([
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.npmignore',
  'authors',
  'changelog',
  'contributing',
  'license',
  'notice',
  'readme',
])
const PLATFORM_PACKAGE_SCOPES = new Set(['@img', '@koromix', '@napi-rs', '@vscode'])
const PLATFORM_PACKAGE_PATTERN = /-(darwin|linux|win32)-(arm64|x64)(?:-[a-z0-9]+)?$/

export interface RuntimePruneOptions {
  readonly platform: string
  readonly arch: string
}

interface RuntimePruneStats {
  metadataFiles: number
  nonRuntimeFiles: number
  platformFiles: number
}

/**
 * Remove declaration and source-map files that Node never reads at runtime.
 * @param directory - Materialized production dependency directory.
 * @returns The number of files removed from the packaged runtime.
 */
export async function pruneRuntimeMetadata(directory: string): Promise<number> {
  const stats = { metadataFiles: 0, nonRuntimeFiles: 0, platformFiles: 0 }
  await pruneDirectory(directory, stats, false)
  return stats.metadataFiles
}

/**
 * Remove files that are not needed by the packaged Desktop Host.
 * @param directory - Materialized production dependency directory.
 * @param options - Target platform and architecture for native dependencies.
 * @returns Counts for metadata, non-runtime, and non-target platform files.
 */
export async function pruneRuntime(
  directory: string,
  options: RuntimePruneOptions,
): Promise<Readonly<RuntimePruneStats>> {
  const stats = { metadataFiles: 0, nonRuntimeFiles: 0, platformFiles: 0 }
  await pruneDirectory(directory, stats, true)
  await prunePlatformPackages(directory, options, stats)
  await pruneNativePrebuilds(directory, options, stats)
  return stats
}

async function pruneDirectory(
  directory: string,
  stats: RuntimePruneStats,
  removeNonRuntimeFiles: boolean,
): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (removeNonRuntimeFiles && NON_RUNTIME_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
        await rm(path, { recursive: true, force: true })
        stats.nonRuntimeFiles += 1
        continue
      }
      await pruneDirectory(path, stats, removeNonRuntimeFiles)
      continue
    }
    if (!entry.isFile() || !NON_RUNTIME_SUFFIXES.some(suffix => entry.name.endsWith(suffix))) continue
    await rm(path)
    stats.metadataFiles += 1
  }
  if (!removeNonRuntimeFiles) return
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const baseName = entry.name.toLowerCase().replace(/\.[^.]+$/, '')
    if (entry.name.toLowerCase().endsWith('.md') || NON_RUNTIME_FILE_NAMES.has(baseName)) {
      await rm(join(directory, entry.name), { force: true })
      stats.nonRuntimeFiles += 1
    }
  }
}

async function prunePlatformPackages(
  nodeModules: string,
  options: RuntimePruneOptions,
  stats: RuntimePruneStats,
): Promise<void> {
  for (const scope of PLATFORM_PACKAGE_SCOPES) {
    const scopeDirectory = join(nodeModules, scope)
    let entries
    try {
      entries = await readdir(scopeDirectory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !PLATFORM_PACKAGE_PATTERN.test(entry.name)) continue
      const expected = `-${options.platform}-${options.arch}`
      if (!entry.name.includes(expected)) {
        await rm(join(scopeDirectory, entry.name), { recursive: true, force: true })
        stats.platformFiles += 1
      }
    }
  }
}

async function pruneNativePrebuilds(
  nodeModules: string,
  options: RuntimePruneOptions,
  stats: RuntimePruneStats,
): Promise<void> {
  const sqlitePrebuilds = join(nodeModules, 'better-sqlite3', 'prebuilds')
  await removeNonTargetDirectories(sqlitePrebuilds, `${options.platform}-${options.arch}`, stats)

  const ptyPrebuilds = join(nodeModules, 'node-pty', 'prebuilds')
  await removeNonTargetDirectories(ptyPrebuilds, `${options.platform}-${options.arch}`, stats)

  const conpty = join(nodeModules, 'node-pty', 'third_party', 'conpty')
  if (options.platform === 'win32') {
    await removeNonTargetDirectories(conpty, `win10-${options.arch}`, stats)
  } else {
    await removeDirectoryIfPresent(conpty, stats)
  }
}

async function removeNonTargetDirectories(
  directory: string,
  targetName: string,
  stats: RuntimePruneStats,
): Promise<void> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === targetName) continue
    await rm(join(directory, entry.name), { recursive: true, force: true })
    stats.platformFiles += 1
  }
}

async function removeDirectoryIfPresent(directory: string, stats: RuntimePruneStats): Promise<void> {
  try {
    await rm(directory, { recursive: true, force: true })
    stats.platformFiles += 1
  } catch {
    // The optional native dependency is absent on platforms that do not use it.
  }
}
