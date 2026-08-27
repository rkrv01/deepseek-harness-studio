import { EMBED_BRIEFING_ASSETS } from '../briefing-assets.ts'

/** Demo briefing material rendered by the picker and receipt cards. */
export interface BriefingMaterial {
  readonly name: string
  readonly kind: string
  readonly size: string
  /** Preselected state in the material-choice card. */
  readonly defaultChecked: boolean
}

/** The three fixed executive-briefing deliverables, preselected by default. */
export const BRIEFING_MATERIALS: readonly BriefingMaterial[] = EMBED_BRIEFING_ASSETS.map(asset => ({
  name: asset.name,
  kind: asset.kind,
  size: asset.size,
  defaultChecked: true,
}))

/**
 * Create the browser-side download payload for one embedded briefing material.
 * @param name - Embedded material filename used to select its byte content.
 * @returns A Blob carrying the fixed presentation-format file bytes.
 */
export function createBriefingMaterialBlob(name: string): Blob {
  const asset = EMBED_BRIEFING_ASSETS.find(candidate => candidate.name === name)
  if (asset === undefined) throw new Error(`Unknown briefing material: ${name}`)
  return new Blob([decodeBase64(asset.base64)], { type: asset.mimeType })
}

function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length)) as Uint8Array<ArrayBuffer>
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
