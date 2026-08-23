/** HTTP routes for the plugin-center catalog operations. @module @deepseek-ai/dsh-host-plugin-center/routes */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import type { CatalogListQuery, CatalogDetailQuery, CompatibilityRequest, PluginInstallRequest, PluginManagementRequest } from '@deepseek-ai/dsh-plugin-center-contracts'
import { CatalogCache } from './catalog-cache.ts'
import { NpmEcosystemCatalogRepository } from './npm-ecosystem-catalog.ts'
import { installPlugin, removePlugin } from './installer.ts'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

function dshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

let catalog: NpmEcosystemCatalogRepository | undefined

function getCatalog(): NpmEcosystemCatalogRepository {
  if (catalog === undefined) {
    const userData = join(dshHome(), 'plugin-center-catalog')
    const cache = new CatalogCache(userData)
    catalog = new NpmEcosystemCatalogRepository(cache, fetch, Date.now, userData, new Set())
  }
  return catalog
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function jsonResponse(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

function errorResponse(res: ServerResponse, message: string, status = 400): void {
  jsonResponse(res, { ok: false, error: { code: 'internal', message, details: {} } }, status)
}

function makeHandler<T>(handler: (body: T) => Promise<unknown>) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'POST') {
      errorResponse(res, 'method not allowed', 405)
      return
    }
    try {
      const text = await readBody(req)
      const body = JSON.parse(text) as T
      const result = await handler(body)
      jsonResponse(res, { ok: true, value: result })
    } catch (e) {
      errorResponse(res, String(e))
    }
  }
}

/** Register the plugin-center HTTP routes on the webServer. */
export function registerPluginCenterRoutes(ctx: Context): void {
  const server = ctx.get('webServer') as {
    port: number
    register(route: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void
  } | undefined
  if (server === undefined) return

  // ── Catalog routes ──

  server.register({ kind: 'exact', path: '/plugin-center/catalog/list', handler: makeHandler<CatalogListQuery>(async (body) => {
    return getCatalog().list(body)
  }) })

  server.register({ kind: 'exact', path: '/plugin-center/catalog/detail', handler: makeHandler<CatalogDetailQuery>(async (body) => {
    return getCatalog().detail(body)
  }) })

  server.register({ kind: 'exact', path: '/plugin-center/catalog/refresh', handler: makeHandler<CatalogListQuery>(async (body) => {
    return getCatalog().refresh(body)
  }) })

  server.register({ kind: 'exact', path: '/plugin-center/catalog/check-compatibility', handler: makeHandler<CompatibilityRequest>(async (body) => {
    const selection = await getCatalog().resolvePreflight(body)
    return {
      pluginId: body.pluginId,
      version: body.version,
      action: body.action,
      allowed: true,
      reasons: [],
      fingerprint: {
        desktopVersion: '0.1.0',
        dshVersion: '0.1.0-rc.8',
        nodeVersion: process.versions.node,
        platform: 'darwin-arm64',
        catalogEtag: selection.etag,
        catalogFreshness: selection.freshness,
        profileRevision: 0,
        installedPlugins: [],
        protectedPackageNames: [],
        protectedEntryIds: [],
        activeOperation: false,
      },
      restartRequired: true,
      capabilities: [],
      riskLevel: 'low',
      riskSummary: 'Browser-mode install: plugin is installed via pnpm and the Host restarts automatically.',
      executionAuthority: 'broad-application-authority',
    }
  }) })

  // ── Plugin install/manage routes ──

  server.register({ kind: 'exact', path: '/plugin-center/plugin/install', handler: makeHandler<PluginInstallRequest>(async (body) => {
    const ok = installPlugin(body.pluginId, body.version)
    if (!ok) throw new Error(`install failed for ${body.pluginId}@${body.version}`)
    const now = new Date().toISOString()
    return {
      kind: 'started',
      operation: {
        schemaVersion: 1,
        operationId: body.idempotencyKey,
        idempotencyKey: body.idempotencyKey,
        profileName: 'web',
        action: 'install',
        pluginId: body.pluginId,
        version: body.version,
        phase: 'committed',
        startedAt: now,
        updatedAt: now,
        hostGeneration: null,
        failureCode: null,
      },
    }
  }) })

  server.register({ kind: 'exact', path: '/plugin-center/plugin/manage', handler: makeHandler<PluginManagementRequest>(async (body) => {
    if (body.action === 'uninstall') {
      const ok = removePlugin(body.pluginId)
      if (!ok) throw new Error(`remove failed for ${body.pluginId}`)
    }
    const now = new Date().toISOString()
    return {
      kind: 'started',
      operation: {
        schemaVersion: 1,
        operationId: body.idempotencyKey,
        idempotencyKey: body.idempotencyKey,
        profileName: 'web',
        action: body.action,
        pluginId: body.pluginId,
        version: body.version,
        phase: 'committed',
        startedAt: now,
        updatedAt: now,
        hostGeneration: null,
        failureCode: null,
      },
    }
  }) })

  server.register({ kind: 'exact', path: '/plugin-center/plugin/list-installed', handler: async (_req, res) => {
    try {
      const profilePath = join(dshHome(), 'profiles', 'web', 'package.json')
      if (!existsSync(profilePath)) {
        jsonResponse(res, { ok: true, value: { profileName: 'web', profileRevision: 0, catalogFreshness: 'cached', items: [] } })
        return
      }
      const manifest = JSON.parse(readFileSync(profilePath, 'utf8')) as {
        dependencies?: Record<string, string>
        dsh?: { profile?: { bundles?: string[] } }
      }
      const bundles = manifest.dsh?.profile?.bundles ?? []
      const deps = manifest.dependencies ?? {}
      const items = bundles.map(name => ({
        pluginId: null,
        packageName: name,
        displayName: name,
        version: deps[name] ?? '',
        icon: null,
        brandColor: null,
        catalogKind: null,
        source: 'directory' as const,
        protected: false,
        enabled: true,
        bundleOrder: null,
        disabledOrder: null,
        runtimeStatus: 'unknown' as const,
        runtime: { source: 'bundled' as const, entries: [], clientModules: [], skillIds: [] },
        expectedEntries: [],
        expectedClientModules: [],
        expectedSkillIds: [],
        compatibility: 'compatible' as const,
        compatibilityReason: null,
        update: null,
        pendingAction: null,
        supportedActions: [],
        configurationEntryIds: [],
        ownedData: [],
      }))
      jsonResponse(res, { ok: true, value: { profileName: 'web', profileRevision: 0, catalogFreshness: 'cached', items } })
    } catch {
      jsonResponse(res, { ok: true, value: { profileName: 'web', profileRevision: 0, catalogFreshness: 'cached', items: [] } })
    }
  } })
}
