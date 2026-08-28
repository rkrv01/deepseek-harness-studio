import type { QaModelId, QaRequest } from '@llmwiki/contracts'

/** Local browser preferences applied to each knowledge question. */
export interface ModelPreferences {
  model: QaModelId
  generationMode: NonNullable<QaRequest['generationMode']>
  temperature: number
  maxTokens: number
}

/** Browser storage key for the current model preferences. */
export const MODEL_PREFS_KEY = 'llmwiki-qa-model-preferences'

/** Event emitted when settings changes should update the question view. */
export const MODEL_PREFS_EVENT = 'llmwiki-qa-model-preferences-change'

/** Default preferences used before a browser has saved a choice. */
export const DEFAULT_MODEL_PREFERENCES: ModelPreferences = {
  model: 'deepseek-v4-flash',
  generationMode: 'deepseek',
  temperature: 0.7,
  maxTokens: 1024,
}

function normalizePreferences(value: Partial<ModelPreferences>): ModelPreferences {
  const temperature = typeof value.temperature === 'number' && Number.isFinite(value.temperature)
    ? value.temperature
    : DEFAULT_MODEL_PREFERENCES.temperature
  const maxTokens = typeof value.maxTokens === 'number' && Number.isFinite(value.maxTokens)
    ? value.maxTokens
    : DEFAULT_MODEL_PREFERENCES.maxTokens
  return {
    model: value.model === 'deepseek-v4-pro' ? value.model : 'deepseek-v4-flash',
    generationMode: value.generationMode === 'local' ? 'local' : 'deepseek',
    temperature: Math.min(1.5, Math.max(0, temperature)),
    maxTokens: Math.min(4096, Math.max(256, Math.round(maxTokens))),
  }
}

/** Reads saved preferences, falling back to defaults when storage is unavailable or invalid. */
export function loadModelPreferences(): ModelPreferences {
  if (typeof window === 'undefined') return DEFAULT_MODEL_PREFERENCES
  try {
    const raw = window.localStorage.getItem(MODEL_PREFS_KEY)
    return raw ? normalizePreferences(JSON.parse(raw) as Partial<ModelPreferences>) : DEFAULT_MODEL_PREFERENCES
  } catch {
    return DEFAULT_MODEL_PREFERENCES
  }
}

/** Saves and broadcasts normalized preferences for other open views. */
export function saveModelPreferences(preferences: ModelPreferences): ModelPreferences {
  const normalized = normalizePreferences(preferences)
  window.localStorage.setItem(MODEL_PREFS_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent<ModelPreferences>(MODEL_PREFS_EVENT, { detail: normalized }))
  return normalized
}
