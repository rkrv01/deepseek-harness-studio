import { describe, expect, it } from 'vitest'
import { parseDesktopProtocolUrl } from '../src/protocol.ts'

describe('desktop protocol', () => {
  it('accepts the supported web launcher URL and source', () => {
    expect(parseDesktopProtocolUrl('starlight-ai://open?source=business-xmzn'))
      .toEqual({ source: 'business-xmzn' })
    expect(parseDesktopProtocolUrl('starlight-ai:/open?source=business-xmzn'))
      .toEqual({ source: 'business-xmzn' })
  })

  it('ignores invalid commands and never exposes unknown sources', () => {
    expect(parseDesktopProtocolUrl('starlight-ai://run?command=rm'))
      .toBeUndefined()
    expect(parseDesktopProtocolUrl('starlight-ai://open?source=unknown'))
      .toEqual({})
    expect(parseDesktopProtocolUrl('https://example.test/open')).toBeUndefined()
  })
})
