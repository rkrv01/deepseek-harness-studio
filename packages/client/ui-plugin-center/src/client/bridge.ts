/** Narrow structural reader for the fixed Electron bridge, Host RPC bridge, and fetch bridge. */

import type {
  CatalogDetailQuery,
  CatalogDetailResult,
  CatalogListQuery,
  CatalogListResult,
  CompatibilityDecision,
  CompatibilityRequest,
  InstalledPluginListResult,
  PluginInstallRequest,
  PluginManagementRequest,
  PluginOperationSnapshot,
  PluginOperationStartResult,
  PluginOwnedDataOffer,
  PluginOwnedDataRemovalRequest,
  PluginOwnedDataRemovalResult,
  PluginOwnedDataRetentionRequest,
  PluginOwnedDataRetentionResult,
  PluginDiagnosticExportRequest,
  PluginDiagnosticExportResult,
  PluginRecoveryRetryRequest,
  PluginRecoverySnapshot,
  PresetInstallPreviewRequest,
  PresetInstallPreviewResult,
  PresetInstallRequest,
  PresetInstallResult,
  PresetRuntimeRequest,
  PresetRuntimeSnapshot,
  PresetSquareDetailQuery,
  PresetSquareDetailResult,
  PresetSquareListQuery,
  PresetSquareListResult,
} from '@deepseek-ai/dsh-plugin-center-contracts'
import { developmentCatalogBridge } from './development-bridge.ts'

export interface DesktopCatalogBridge {
  readonly catalog: {
    list(query: CatalogListQuery): Promise<CatalogListResult>
    refresh(query: CatalogListQuery): Promise<CatalogListResult>
    detail(query: CatalogDetailQuery): Promise<CatalogDetailResult>
    checkCompatibility(request: CompatibilityRequest): Promise<CompatibilityDecision>
  }
  readonly installedPlugins: {
    list(): Promise<InstalledPluginListResult>
  }
  readonly pluginOperations: {
    readonly mutationsEnabled: boolean
    install(request: PluginInstallRequest): Promise<PluginOperationStartResult>
    manage(request: PluginManagementRequest): Promise<PluginOperationStartResult>
    getOperation(): Promise<PluginOperationSnapshot | null>
    onState(listener: (operation: PluginOperationSnapshot) => void): () => void
  }
  readonly pluginOwnedData: {
    getOffer(): Promise<PluginOwnedDataOffer | null>
    remove(request: PluginOwnedDataRemovalRequest): Promise<PluginOwnedDataRemovalResult>
    retain(request: PluginOwnedDataRetentionRequest): Promise<PluginOwnedDataRetentionResult>
  }
  readonly pluginRecovery?: {
    getState(): Promise<PluginRecoverySnapshot | null>
    retry(request: PluginRecoveryRetryRequest): Promise<PluginRecoverySnapshot | null>
    exportDiagnostics(request: PluginDiagnosticExportRequest): Promise<PluginDiagnosticExportResult>
    onState(listener: (snapshot: PluginRecoverySnapshot) => void): () => void
  }
  readonly presetSquare?: {
    readonly mutationsEnabled: boolean
    list(query: PresetSquareListQuery): Promise<PresetSquareListResult>
    detail(query: PresetSquareDetailQuery): Promise<PresetSquareDetailResult>
    previewInstall(request: PresetInstallPreviewRequest): Promise<PresetInstallPreviewResult>
    install(request: PresetInstallRequest): Promise<PresetInstallResult>
    checkRuntime(request: PresetRuntimeRequest): Promise<PresetRuntimeSnapshot>
    installRuntime(request: PresetRuntimeRequest): Promise<PresetRuntimeSnapshot>
  }
}

export interface CatalogBridgeResolution {
  readonly bridge: DesktopCatalogBridge | undefined
  readonly development: boolean
}

export function desktopCatalogBridge(): DesktopCatalogBridge | undefined {
  return (window as unknown as { dshDesktop?: DesktopCatalogBridge }).dshDesktop
}

async function rpcCall<T>(path: string, args: unknown): Promise<T> {
  const response = await fetch('/plugin-center/' + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args ?? {}),
  })
  const body = await response.json() as { ok: boolean; value: T }
  if (!response.ok || !body.ok) throw new Error('Host RPC failed')
  return body.value
}

function createFetchBridge(): DesktopCatalogBridge {
  return {
    catalog: {
      list: q => rpcCall('catalog/list', q),
      refresh: q => rpcCall('catalog/refresh', q),
      detail: q => rpcCall('catalog/detail', q),
      checkCompatibility: req => rpcCall('catalog/check-compatibility', req),
    },
    installedPlugins: {
      list: () => rpcCall('plugin/list-installed', undefined),
    },
    pluginOperations: {
      mutationsEnabled: true,
      install: req => rpcCall('plugin/install', req),
      manage: req => rpcCall('plugin/manage', req),
      getOperation: () => Promise.resolve(null),
      onState: () => () => {},
    },
    pluginOwnedData: {
      getOffer: () => Promise.resolve(null),
      remove: () => Promise.reject(new Error('Desktop catalog bridge unavailable')),
      retain: () => Promise.reject(new Error('Desktop catalog bridge unavailable')),
    },
  }
}

let fetchBridgeCache: DesktopCatalogBridge | undefined
let fetchBridgeAttempted = false

function tryFetchBridge(): DesktopCatalogBridge | undefined {
  if (fetchBridgeAttempted) return fetchBridgeCache
  fetchBridgeAttempted = true
  if (typeof window !== 'undefined' && window.location?.hostname === '127.0.0.1') {
    fetchBridgeCache = createFetchBridge()
    return fetchBridgeCache
  }
  return undefined
}

export function resolveCatalogBridge(): CatalogBridgeResolution {
  const desktop = desktopCatalogBridge()
  if (desktop !== undefined) return { bridge: desktop, development: false }
  const fetchBridge = tryFetchBridge()
  if (fetchBridge !== undefined) return { bridge: fetchBridge, development: false }
  const development = developmentCatalogBridge()
  return { bridge: development, development: development !== undefined }
}