/** Shared visibility state for Desktop-only product entry points. */

export type ProductEntryId = 'plugin-center' | 'plugin-discovery' | 'preset-square' | 'application-center'
export type ProductEntryVisibility = Readonly<Record<ProductEntryId, boolean>>
export interface ProductEntryVisibilitySettings {
  readonly showPluginCenter?: boolean
  readonly showPluginDiscovery?: boolean
  readonly showPresetSquare?: boolean
  readonly showAppCenter?: boolean
}

let current: ProductEntryVisibility = Object.freeze({
  'plugin-center': false,
  'plugin-discovery': false,
  'preset-square': false,
  'application-center': false,
})
const listeners = new Set<() => void>()

/** Update entry visibility from the project-brain settings scope. */
export function setProductEntryVisibility(value: ProductEntryVisibilitySettings): void {
  current = Object.freeze({
    'plugin-center': value.showPluginCenter ?? current['plugin-center'],
    'plugin-discovery': value.showPluginDiscovery ?? current['plugin-discovery'],
    'preset-square': value.showPresetSquare ?? current['preset-square'],
    'application-center': value.showAppCenter ?? current['application-center'],
  })
  for (const listener of listeners) listener()
}

/** Read the current visibility snapshot. */
export function productEntryVisibility(): ProductEntryVisibility { return current }

/** Subscribe to visibility updates. */
export function subscribeProductEntryVisibility(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
