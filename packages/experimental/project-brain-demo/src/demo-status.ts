/** Server-side client for the platform demo-data switch. */
import { request as requestHttps } from 'node:https'

export type DemoStatusFetch = (input: string, init?: RequestInit) => Promise<Response>

/** Build the reverse-proxy-aware status endpoint without discarding a configured path prefix. */
export function demoStatusEndpoint(baseUrl: string): string {
  return new URL('api/demo/config', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
}

/** Create a narrowly-scoped status client for a demo environment using a self-signed certificate. */
export function createDemoStatusFetch(allowSelfSignedCertificate = false): DemoStatusFetch {
  if (!allowSelfSignedCertificate) return fetch
  return async (input, init) => new Promise<Response>((resolve, reject) => {
    const url = new URL(input)
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
