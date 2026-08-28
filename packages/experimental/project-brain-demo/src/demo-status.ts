/** Server-side client for the platform demo-data switch. */
import { request as requestHttps } from 'node:https'

export type DemoStatusFetch = (input: string, init?: RequestInit) => Promise<Response>

/** Build the reverse-proxy-aware status endpoint without discarding a configured path prefix. */
export function demoStatusEndpoint(baseUrl: string): string {
  return new URL('api/demo/config', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
}

/** Build the reverse-proxy-aware per-item toggle endpoint without discarding a configured path prefix. */
export function demoItemToggleEndpoint(baseUrl: string): string {
  return new URL('api/demo/toggle', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
}

/** Create a narrowly-scoped status client for a demo environment using a self-signed certificate. */
export function createDemoStatusFetch(allowSelfSignedCertificate = false): DemoStatusFetch {
  if (!allowSelfSignedCertificate) return fetch
  return async (input, init) => {
    const url = new URL(input)
    // The self-signed bypass is an https-only path: node:https rejects http
    // URLs with ERR_INVALID_PROTOCOL, so plain http hosts (local debugging
    // servers) fall through to the global fetch.
    if (url.protocol !== 'https:') return fetch(input, init)
    return new Promise<Response>((resolve, reject) => {
      const request = requestHttps(url, { method: init?.method ?? 'GET', rejectUnauthorized: false }, (response) => {
        const chunks: Uint8Array[] = []
        response.on('data', (chunk: Uint8Array) => { chunks.push(chunk) })
        response.on('end', () => {
          resolve(new Response(Buffer.concat(chunks), {
            status: response.statusCode ?? 500,
            headers: response.headers as Record<string, string>,
          }))
        })
      })
      request.on('error', reject)
      request.end()
    })
  }
}

/** Serialize switch requests because the platform endpoint toggles instead of setting an explicit value. */
export class DemoStatusSynchronizer {
  private tail: Promise<void> = Promise.resolve()

  constructor(private readonly baseUrl: string | (() => string), private readonly fetchImpl: DemoStatusFetch = fetch) {}

  /** Queue one exact desired state behind any in-flight synchronization. */
  ensure(enabled: boolean): Promise<void> {
    const base = typeof this.baseUrl === 'function' ? this.baseUrl() : this.baseUrl
    console.info('[project-brain-demo] demo-status:', demoStatusEndpoint(base), `enabled=${enabled}`)
    const operation = this.tail.then(() => ensureDemoStatus(base, enabled, this.fetchImpl))
    this.tail = operation.catch(() => {})
    return operation
  }

  /** Queue one exact desired state for a configured demo item (e.g. aiTaskCreated). */
  ensureItem(key: string, enabled: boolean): Promise<void> {
    const base = typeof this.baseUrl === 'function' ? this.baseUrl() : this.baseUrl
    console.info('[project-brain-demo] demo-status:', demoItemToggleEndpoint(base), `${key}=${enabled}`)
    const operation = this.tail.then(() => ensureDemoItem(base, key, enabled, this.fetchImpl))
    this.tail = operation.catch(() => {})
    return operation
  }
}

/** Ensure the external platform exposes exactly the requested demo-data state. */
export async function ensureDemoStatus(baseUrl: string, enabled: boolean, fetchImpl: DemoStatusFetch = fetch): Promise<void> {
  const endpoint = demoStatusEndpoint(baseUrl)
  const initial = await readDemoStatus(endpoint, fetchImpl)
  if (initial !== enabled) {
    const response = await fetchImpl(endpoint, { method: 'POST' })
    if (!response.ok) throw new Error(`Demo status toggle failed with HTTP ${response.status}`)
  }
  const settled = await readDemoStatus(endpoint, fetchImpl)
  if (settled !== enabled) throw new Error(`Demo status expected ${enabled ? 'enabled' : 'disabled'} after synchronization`)
}

async function readDemoStatus(endpoint: string, fetchImpl: DemoStatusFetch): Promise<boolean> {
  const response = await fetchImpl(endpoint, { method: 'GET' })
  if (!response.ok) throw new Error(`Demo status lookup failed with HTTP ${response.status}`)
  const value: unknown = await response.json()
  if (typeof value !== 'object' || value === null || typeof (value as { demoEnabled?: unknown }).demoEnabled !== 'boolean') {
    throw new Error('Demo status response does not contain demoEnabled')
  }
  return (value as { readonly demoEnabled: boolean }).demoEnabled
}

/** Ensure one configured demo item exposes exactly the requested state (toggle semantics, idempotent). */
export async function ensureDemoItem(baseUrl: string, key: string, enabled: boolean, fetchImpl: DemoStatusFetch = fetch): Promise<void> {
  const endpoint = demoStatusEndpoint(baseUrl)
  const initial = await readDemoItem(endpoint, key, fetchImpl)
  if (initial !== enabled) {
    const response = await fetchImpl(demoItemToggleEndpoint(baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (!response.ok) throw new Error(`Demo item toggle failed with HTTP ${response.status}`)
  }
  const settled = await readDemoItem(endpoint, key, fetchImpl)
  if (settled !== enabled) throw new Error(`Demo item expected ${enabled ? 'enabled' : 'disabled'} after synchronization`)
}

async function readDemoItem(endpoint: string, key: string, fetchImpl: DemoStatusFetch): Promise<boolean> {
  const response = await fetchImpl(endpoint, { method: 'GET' })
  if (!response.ok) throw new Error(`Demo item lookup failed with HTTP ${response.status}`)
  const value: unknown = await response.json()
  if (typeof value !== 'object' || value === null || typeof (value as Record<string, unknown>)[key] !== 'boolean') {
    throw new Error(`Demo status response does not contain ${key}`)
  }
  return (value as Record<string, boolean>)[key] === true
}
