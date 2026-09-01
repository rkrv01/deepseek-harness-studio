/** Safe parser for links that ask the Desktop to open its existing window. */

export const DESKTOP_PROTOCOL = 'starlight-ai'
export const DESKTOP_PROTOCOL_OPEN = 'open'

/** Sources understood by the current web launcher integration. */
export type DesktopLaunchSource = 'business-xmzn'

/** Sanitized protocol request passed from the native shell to the renderer. */
export interface DesktopProtocolRequest {
  readonly source?: DesktopLaunchSource
}

/** Parse one external protocol URL without accepting executable or filesystem arguments. */
export function parseDesktopProtocolUrl(value: string): DesktopProtocolRequest | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  const isOpenTarget = url.protocol === `${DESKTOP_PROTOCOL}:`
    && ((url.hostname === DESKTOP_PROTOCOL_OPEN && url.pathname === '')
      || (url.hostname === '' && url.pathname === `/${DESKTOP_PROTOCOL_OPEN}`))
  if (!isOpenTarget) return undefined
  const source = url.searchParams.get('source')
  return source === 'business-xmzn' ? { source } : {}
}
