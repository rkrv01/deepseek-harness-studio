/** Host RPC for plugin catalog discovery, install, and management. @module @deepseek-ai/dsh-host-plugin-center */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {
  CatalogDetailQuery,
  CatalogDetailResult,
  CatalogListQuery,
  CatalogListResult,
  CompatibilityDecision,
  CompatibilityFingerprint,
  CompatibilityRequest,
  InstalledPluginListResult,
  PluginInstallRequest,
  PluginManagementRequest,
  PluginOperationSnapshot,
  PluginOperationStartResult,
  RestartResult,
} from './types.ts'
import { CatalogCache } from './catalog-cache.ts'
import { NpmEcosystemCatalogRepository } from './npm-ecosystem-catalog.ts'
import { installPlugin, removePlugin, scheduleRestart } from './installer.ts'
import { registerPluginCenterRoutes } from './routes.ts'

export type * from './types.ts'

function dshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

function discoveryDirectory(): string {
  return join(dshHome(), 'plugin-center-catalog')
}

function nextOperationId(): string {
  return `host-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function snapshot(
  pluginId: string,
  version: string,
  action: string,
  phase: string,
  operationId: string,
): PluginOperationSnapshot {
  return {
    schemaVersion: 1,
    operationId,
    idempotencyKey: operationId,
    profileName: 'web',
    action,
    pluginId,
    version,
    phase,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hostGeneration: null,
    failureCode: null,
  }
}

/**
 * Host Remote exposing the npm-ecosystem plugin catalog, install/uninstall, and
 * self-restart to the browser client.
 */
export class PluginCenterGateway extends TypertRemoteService {
  static inject = ['loader', 'clientModules', 'skills']

  private readonly catalog: NpmEcosystemCatalogRepository
  private currentOperation: PluginOperationSnapshot | null = null
  private readonly operationListeners = new Set<(snapshot: PluginOperationSnapshot) => void>()

  constructor(ctx: Context) {
    super(ctx, 'pluginCenter')
    const userData = discoveryDirectory()
    const cache = new CatalogCache(userData)
    const hostProvidedModules = new Set<string>()
    this.catalog = new NpmEcosystemCatalogRepository(cache, fetch, Date.now, userData, hostProvidedModules)
    // Register HTTP routes for browser access (bypasses Typert loading chain).
    try { registerPluginCenterRoutes(ctx) } catch { /* routes already registered */ }
  }

  @Remote('catalog.list')
  async catalogList(query: CatalogListQuery): Promise<CatalogListResult> {
    return this.catalog.list(query) as unknown as CatalogListResult
  }

  @Remote('catalog.refresh')
  async catalogRefresh(query: CatalogListQuery): Promise<CatalogListResult> {
    return this.catalog.refresh(query) as unknown as CatalogListResult
  }

  @Remote('catalog.detail')
  async catalogDetail(query: CatalogDetailQuery): Promise<CatalogDetailResult> {
    return this.catalog.detail(query) as unknown as CatalogDetailResult
  }

  @Remote('catalog.checkCompatibility')
  async catalogCheckCompatibility(request: CompatibilityRequest): Promise<CompatibilityDecision> {
    const selection = await this.catalog.resolvePreflight(request as never)
    const fingerprint: CompatibilityFingerprint = {
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
    }
    return {
      pluginId: request.pluginId,
      version: request.version,
      action: request.action,
      allowed: true,
      reasons: [],
      fingerprint,
      restartRequired: true,
      capabilities: [],
      riskLevel: 'low',
      riskSummary: 'Browser-mode install: plugin is installed via pnpm and the Host restarts automatically.',
      executionAuthority: 'broad-application-authority',
    }
  }

  @Remote('plugin.install')
  async pluginInstall(request: PluginInstallRequest): Promise<PluginOperationStartResult> {
    const opId = nextOperationId()
    this.publishOperation(snapshot(request.pluginId, request.version, 'install', 'installing', opId))
    const ok = installPlugin(request.pluginId, request.version)
    if (!ok) {
      this.publishOperation(snapshot(request.pluginId, request.version, 'install', 'failed', opId))
      return { kind: 'busy', activeOperationId: opId }
    }
    const committed = snapshot(request.pluginId, request.version, 'install', 'committed', opId)
    this.publishOperation(committed)
    return { kind: 'started', operation: committed }
  }

  @Remote('plugin.manage')
  async pluginManage(request: PluginManagementRequest): Promise<PluginOperationStartResult> {
    const opId = nextOperationId()
    this.publishOperation(snapshot(request.pluginId, request.version, request.action, 'installing', opId))
    if (request.action === 'uninstall') {
      const ok = removePlugin(request.pluginId)
      if (!ok) {
        this.publishOperation(snapshot(request.pluginId, request.version, request.action, 'failed', opId))
        return { kind: 'busy', activeOperationId: opId }
      }
    }
    const committed = snapshot(request.pluginId, request.version, request.action, 'committed', opId)
    this.publishOperation(committed)
    return { kind: 'started', operation: committed }
  }

  @Remote('plugin.getOperation')
  async pluginGetOperation(): Promise<PluginOperationSnapshot | null> {
    return this.currentOperation
  }

  @Remote('plugin.listInstalled')
  async pluginListInstalled(): Promise<InstalledPluginListResult> {
    return {
      profileName: 'web',
      profileRevision: 0,
      catalogFreshness: 'cached',
      items: [],
    }
  }

  @Remote('plugin.restart')
  async pluginRestart(): Promise<RestartResult> {
    const port = this.servingPort()
    scheduleRestart(port)
    return { ok: true, pid: process.pid }
  }

  private publishOperation(snapshot: PluginOperationSnapshot): void {
    this.currentOperation = snapshot
    for (const listener of this.operationListeners) {
      try { listener(snapshot) } catch { /* listener disposal race */ }
    }
  }

  private static SERVING_PORT = 'DSH_PORT'

  private servingPort(): number | null {
    const host = process.env[PluginCenterGateway.SERVING_PORT] ?? process.env.PORT
    if (host !== undefined) {
      const parsed = Number(host)
      if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) return parsed
    }
    return null
  }
}

export default PluginCenterGateway
