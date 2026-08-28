import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pruneRuntime, pruneRuntimeMetadata } from '../scripts/runtime-staging-pruner.ts'

describe('Desktop runtime staging metadata pruning', () => {
  it('removes declarations and source maps while retaining executable package files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-prune-'))
    try {
      const nested = join(root, 'package', 'dist')
      await mkdir(nested, { recursive: true })
      await Promise.all([
        writeFile(join(nested, 'index.js'), 'export const value = 1\n'),
        writeFile(join(nested, 'index.js.map'), '{}\n'),
        writeFile(join(nested, 'index.d.ts'), 'export declare const value: number\n'),
        writeFile(join(nested, 'index.d.mts'), 'export declare const value: number\n'),
        writeFile(join(nested, 'index.d.cts'), 'export declare const value: number\n'),
        writeFile(join(root, 'package', 'package.json'), '{"type":"module"}\n'),
      ])

      await expect(pruneRuntimeMetadata(root)).resolves.toBe(4)
      await expect(readFile(join(nested, 'index.js'), 'utf8')).resolves.toContain('value = 1')
      await expect(readFile(join(root, 'package', 'package.json'), 'utf8')).resolves.toContain('module')
      await expect(access(join(nested, 'index.js.map'))).rejects.toThrow()
      await expect(access(join(nested, 'index.d.ts'))).rejects.toThrow()
      await expect(access(join(nested, 'index.d.mts'))).rejects.toThrow()
      await expect(access(join(nested, 'index.d.cts'))).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('removes safe documentation and test directories without deleting source modules', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-prune-'))
    try {
      await mkdir(join(root, 'package', 'tests'), { recursive: true })
      await mkdir(join(root, 'package', 'dist'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'package', 'README.md'), 'documentation\n'),
        writeFile(join(root, 'package', 'LICENSE'), 'license\n'),
        writeFile(join(root, 'package', 'dist', 'runtime.ts'), 'export const value = 1\n'),
        writeFile(join(root, 'package', 'tests', 'runtime.js'), 'throw new Error()\n'),
      ])

      const stats = await pruneRuntime(root, { platform: 'win32', arch: 'x64' })

      expect(stats.nonRuntimeFiles).toBe(3)
      await expect(readFile(join(root, 'package', 'dist', 'runtime.ts'), 'utf8')).resolves.toContain('value')
      await expect(access(join(root, 'package', 'README.md'))).rejects.toThrow()
      await expect(access(join(root, 'package', 'LICENSE'))).rejects.toThrow()
      await expect(access(join(root, 'package', 'tests'))).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps only the target native packages and prebuilds', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-prune-'))
    try {
      await Promise.all([
        mkdir(join(root, '@img', 'sharp-win32-x64'), { recursive: true }),
        mkdir(join(root, '@img', 'sharp-darwin-arm64'), { recursive: true }),
        mkdir(join(root, '@napi-rs', 'canvas-win32-x64-msvc'), { recursive: true }),
        mkdir(join(root, '@napi-rs', 'canvas-darwin-arm64'), { recursive: true }),
        mkdir(join(root, 'better-sqlite3', 'prebuilds', 'win32-x64'), { recursive: true }),
        mkdir(join(root, 'better-sqlite3', 'prebuilds', 'darwin-arm64'), { recursive: true }),
        mkdir(join(root, 'node-pty', 'prebuilds', 'win32-x64'), { recursive: true }),
        mkdir(join(root, 'node-pty', 'prebuilds', 'darwin-arm64'), { recursive: true }),
        mkdir(join(root, 'node-pty', 'third_party', 'conpty', 'win10-x64'), { recursive: true }),
        mkdir(join(root, 'node-pty', 'third_party', 'conpty', 'win10-arm64'), { recursive: true }),
      ])

      await pruneRuntime(root, { platform: 'win32', arch: 'x64' })

      await expect(access(join(root, '@img', 'sharp-win32-x64'))).resolves.toBeUndefined()
      await expect(access(join(root, '@img', 'sharp-darwin-arm64'))).rejects.toThrow()
      await expect(access(join(root, '@napi-rs', 'canvas-win32-x64-msvc'))).resolves.toBeUndefined()
      await expect(access(join(root, '@napi-rs', 'canvas-darwin-arm64'))).rejects.toThrow()
      await expect(access(join(root, 'better-sqlite3', 'prebuilds', 'win32-x64'))).resolves.toBeUndefined()
      await expect(access(join(root, 'better-sqlite3', 'prebuilds', 'darwin-arm64'))).rejects.toThrow()
      await expect(access(join(root, 'node-pty', 'prebuilds', 'win32-x64'))).resolves.toBeUndefined()
      await expect(access(join(root, 'node-pty', 'prebuilds', 'darwin-arm64'))).rejects.toThrow()
      await expect(access(join(root, 'node-pty', 'third_party', 'conpty', 'win10-x64'))).resolves.toBeUndefined()
      await expect(access(join(root, 'node-pty', 'third_party', 'conpty', 'win10-arm64'))).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
