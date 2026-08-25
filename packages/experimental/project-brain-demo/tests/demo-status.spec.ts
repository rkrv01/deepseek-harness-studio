import { describe, expect, it } from 'vitest'
import { demoStatusEndpoint, ensureDemoStatus } from '../src/demo-status.ts'

function response(demoEnabled: boolean): Response {
  return new Response(JSON.stringify({ demoEnabled }), { status: 200, headers: { 'content-type': 'application/json' } })
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
})
