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
  /** Fixed-origin Preset Square reads and Desktop-only verified archive installation. */
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

/** Selected catalog transport and whether it is the browser development fixture. */
export interface CatalogBridgeResolution {
  readonly bridge: DesktopCatalogBridge | undefined
  readonly development: boolean
}

/**
 * Read the optional bridge without owning or merging the global Window type.
 * @returns The Electron catalog bridge when preload installed it.
 */
export function desktopCatalogBridge(): DesktopCatalogBridge | undefined {
  return (window as unknown as { dshDesktop?: DesktopCatalogBridge }).dshDesktop
}

/** Call one plugin-center HTTP endpoint via the browser's fetch API. */
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

/** Build a DesktopCatalogBridge backed by direct HTTP calls to the plugin-center routes. */
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

/**
 * Prefer the production Electron bridge, then the Host RPC bridge, then the dev fixture.
 * @returns The selected bridge and whether it uses development data.
 */
export function resolveCatalogBridge(): CatalogBridgeResolution {
  const desktop = desktopCatalogBridge()
  if (desktop !== undefined) return { bridge: desktop, development: false }
  // Try the Host RPC bridge via JSON-RPC fetch.
  const fetchBridge = createFetchBridge()
  return { bridge: fetchBridge, development: false }
}
