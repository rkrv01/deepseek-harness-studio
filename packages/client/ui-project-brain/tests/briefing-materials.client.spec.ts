// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { BRIEFING_MATERIALS, createBriefingMaterialBlob } from '../src/client/briefing-materials.ts'

describe('briefing materials', () => {
  it('offers the three fixed presentation files, all preselected', () => {
    expect(BRIEFING_MATERIALS).toHaveLength(3)
    expect(BRIEFING_MATERIALS.map(material => material.name)).toEqual([
      '集团领导汇报_口头稿.md',
      '集团领导汇报_风险与协调事项.xlsx',
      '集团领导汇报_PPT提纲.pptx',
    ])
    expect(BRIEFING_MATERIALS.every(material => material.defaultChecked)).toBe(true)
  })

  it('creates downloadable blobs from the embedded real files', async () => {
    expect(BRIEFING_MATERIALS.map(material => createBriefingMaterialBlob(material.name).type)).toEqual([
      'text/markdown;charset=utf-8',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ])

    for (const material of BRIEFING_MATERIALS) {
      const bytes = new Uint8Array(await createBriefingMaterialBlob(material.name).arrayBuffer())
      if (material.name.endsWith('.md')) {
        expect(new TextDecoder().decode(bytes)).toContain('整体进度为 45%')
        continue
      }
      // Zip magic of the fixed Office files.
      expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04])
    }
  })
})
