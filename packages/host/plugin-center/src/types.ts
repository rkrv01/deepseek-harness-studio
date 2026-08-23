/** Type definitions for the plugin-center Host Remote. @module @deepseek-ai/dsh-host-plugin-center/types */

/** Catalog list query shape. */
export interface CatalogListQuery {
  readonly catalogKind: 'plugin' | 'skill-pack'
  readonly scope: 'public' | 'local'
  readonly query: string
  readonly limit: number
}

/** Catalog summary entry shape. */
export interface CatalogSummaryEntry {
  readonly pluginId: string
  readonly displayName: string
  readonly summary: string
  readonly publisher: string
  readonly keywords: readonly string[]
  readonly version: string
  readonly updatedAt: string
  readonly catalogKind: 'plugin' | 'skill-pack'
}

/** Catalog list result shape. */
export interface CatalogListResult {
  readonly etag: string
  readonly generatedAt: string
  readonly freshness: 'fresh' | 'cached' | 'stale'
  readonly source: 'network' | 'cache' | 'bundled'
  readonly sections: {
    readonly featured: readonly CatalogSummaryEntry[]
    readonly popular: readonly CatalogSummaryEntry[]
    readonly recent: readonly CatalogSummaryEntry[]
  }
}

/** Catalog detail query shape. */
export interface CatalogDetailQuery {
  readonly pluginId: string
  readonly version: string
}

/** Catalog detail shape. */
export interface CatalogDetailBody {
  readonly summary: CatalogSummaryEntry
  readonly description: string
  readonly permissions: readonly string[]
  readonly riskLevel: string
  readonly riskSummary: string
  readonly changelog: string
  readonly publishedAt: string
  readonly eligible: boolean
  readonly withdrawn: boolean
}

/** Catalog detail result shape. */
export interface CatalogDetailResult {
  readonly etag: string
  readonly generatedAt: string
  readonly freshness: 'fresh' | 'cached' | 'stale'
  readonly source: 'network' | 'cache' | 'bundled'
  readonly detail: CatalogDetailBody | null
}

/** Compatibility request shape. */
export interface CompatibilityRequest {
  readonly pluginId: string
  readonly version: string
  readonly action: string
}

/** Compatibility reason shape. */
export interface CompatibilityReason {
  readonly code: string
  readonly subject: string
  readonly actual: string | null
  readonly expected: string | null
}

/** Compatibility fingerprint shape. */
export interface CompatibilityFingerprint {
  readonly desktopVersion: string
  readonly dshVersion: string
  readonly nodeVersion: string
  readonly platform: string
  readonly catalogEtag: string
  readonly catalogFreshness: string
  readonly profileRevision: number
  readonly installedPlugins: readonly string[]
  readonly protectedPackageNames: readonly string[]
  readonly protectedEntryIds: readonly string[]
  readonly activeOperation: boolean
}

/** Compatibility decision shape. */
export interface CompatibilityDecision {
  readonly pluginId: string
  readonly version: string
  readonly action: string
  readonly allowed: boolean
  readonly reasons: readonly CompatibilityReason[]
  readonly fingerprint: CompatibilityFingerprint
  readonly restartRequired: boolean
  readonly capabilities: readonly string[]
  readonly riskLevel: string
  readonly riskSummary: string
  readonly executionAuthority: string
}

/** Plugin install request shape. */
export interface PluginInstallRequest {
  readonly pluginId: string
  readonly version: string
  readonly idempotencyKey: string
}

/** Plugin management request shape. */
export interface PluginManagementRequest {
  readonly pluginId: string
  readonly version: string
  readonly action: string
  readonly idempotencyKey: string
}

/** Plugin operation snapshot shape. */
export interface PluginOperationSnapshot {
  readonly schemaVersion: number
  readonly operationId: string
  readonly idempotencyKey: string
  readonly profileName: string
  readonly action: string
  readonly pluginId: string
  readonly version: string
  readonly phase: string
  readonly startedAt: string
  readonly updatedAt: string
  readonly hostGeneration: number | null
  readonly failureCode: string | null
}

/** Plugin operation start result shape. */
export type PluginOperationStartResult = { readonly kind: string; readonly operation: PluginOperationSnapshot } | { readonly kind: string; readonly activeOperationId: string }

/** Installed plugin projection shape. */
export interface InstalledPluginProjection {
  readonly entryId: string
  readonly moduleName: string
  readonly enabled: boolean
  readonly fiberPhase: string | null
}

/** Installed plugin list result shape. */
export interface InstalledPluginListResult {
  readonly profileName: string
  readonly profileRevision: number
  readonly catalogFreshness: string
  readonly items: readonly InstalledPluginProjection[]
}

/** Outcome of a self-restart request. */
export interface RestartResult {
  readonly ok: true
  readonly pid: number
  readonly helperPid?: number
}
