import { describe, expect, it, vi } from 'vitest'
import { createDemoStatusFetch, demoItemToggleEndpoint, demoStatusEndpoint, ensureDemoItem, ensureDemoStatus } from '../src/demo-status.ts'

function response(demoEnabled: boolean, aiTaskCreated = false): Response {
  return new Response(JSON.stringify({ demoEnabled, aiTaskCreated }), { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('project brain demo status', () => {
  it('preserves a configured reverse-proxy prefix in the API endpoint', () => {
    expect(demoStatusEndpoint('https://7koxhpk4.ipyingshe.net:54928/demo-control/')).toBe('https://7koxhpk4.ipyingshe.net:54928/demo-control/api/demo/config')
  })

  it('only toggles when the current demo state differs from the requested state', async () => {
    const requests: RequestInit[] = []
    const states = [response(true), response(false), response(false)]
    await ensureDemoStatus('http://localhost:9006', false, async (_url, init) => {
      requests.push(init ?? {})
      const next = states.shift()
      if (next === undefined) throw new Error('unexpected request')
      return next
    })

    expect(requests).toHaveLength(3)
    expect(requests[0]?.method).toBe('GET')
    expect(requests[1]?.method).toBe('POST')
    expect(requests[2]?.method).toBe('GET')
  })

  it('rejects a status response that remains different after a toggle', async () => {
    await expect(ensureDemoStatus('http://localhost:9006', true, async () => response(false))).rejects.toThrow('expected enabled')
  })

  it('preserves a configured reverse-proxy prefix in the item toggle endpoint', () => {
    expect(demoItemToggleEndpoint('https://7koxhpk4.ipyingshe.net:54928/demo-control/')).toBe('https://7koxhpk4.ipyingshe.net:54928/demo-control/api/demo/toggle')
  })

  it('skips the item toggle when the requested state already matches', async () => {
    const requests: RequestInit[] = []
    await ensureDemoItem('http://localhost:9006', 'aiTaskCreated', true, async (_url, init) => {
      requests.push(init ?? {})
      return response(true, true)
    })

    expect(requests).toHaveLength(2)
    expect(requests.map(request => request.method)).toEqual(['GET', 'GET'])
  })

  it('toggles a demo item over the item endpoint, then verifies the settled state', async () => {
    const requests: { method?: string; url: string; body?: unknown }[] = []
    const states = [response(true, false), response(true, true), response(true, true)]
    await ensureDemoItem('http://localhost:9006', 'aiTaskCreated', true, async (url, init) => {
      requests.push({ ...(init ?? {}), url: String(url) })
      const next = states.shift()
      if (next === undefined) throw new Error('unexpected request')
      return next
    })

    expect(requests).toHaveLength(3)
    expect(requests.map(request => request.method)).toEqual(['GET', 'POST', 'GET'])
    expect(requests[0]?.url).toContain('/api/demo/config')
    expect(requests[1]?.url).toContain('/api/demo/toggle')
    expect(requests[1]?.body).toBe(JSON.stringify({ key: 'aiTaskCreated' }))
  })

  it('rejects an item toggle rejected by the platform with HTTP 400', async () => {
    await expect(ensureDemoItem('http://localhost:9006', 'aiTaskCreated', true, async (_url, init) => {
      if ((init?.method ?? 'GET') === 'POST') {
        return new Response(JSON.stringify({ error: '未知模拟项: aiTaskCreated' }), { status: 400 })
      }
      return response(true, false)
    })).rejects.toThrow('HTTP 400')
  })

  it('rejects an item response that remains different after a toggle', async () => {
    await expect(ensureDemoItem('http://localhost:9006', 'aiTaskCreated', true, async () => response(true, false))).rejects.toThrow('expected enabled')
  })

  it('routes plain http hosts through the global fetch even with the self-signed bypass on', async () => {
    const calls: RequestInit[] = []
    vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {})
      return response(true, false)
    })
    try {
      const client = createDemoStatusFetch(true)
      await client('http://127.0.0.1:9006/api/demo/config', { method: 'GET' })
      expect(calls).toEqual([{ method: 'GET' }])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
