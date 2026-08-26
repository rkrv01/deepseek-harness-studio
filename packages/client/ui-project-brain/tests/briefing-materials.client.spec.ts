// @vitest-environment jsdom

import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { BRIEFING_MATERIALS, createBriefingMaterialBlob } from '../src/client/briefing-materials.ts'

describe('briefing materials', () => {
  it('creates downloadable demo documents with valid Office or Markdown contents', async () => {
    const expectedTypes = new Map([
      ['集团领导汇报_项目进展.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['集团领导汇报_PPT提纲.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['集团领导汇报_风险与协调事项.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['集团领导汇报_口头稿.md', 'text/markdown;charset=utf-8'],
    ])

    for (const material of BRIEFING_MATERIALS) {
      const blob = createBriefingMaterialBlob(material.name)
      expect(blob.type).toBe(expectedTypes.get(material.name))

      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (material.name.endsWith('.md')) {
        expect(new TextDecoder().decode(bytes)).toContain('# 集团领导汇报口头稿')
        continue
      }

      const entries = Object.keys(unzipSync(bytes))
      expect(entries).toContain('[Content_Types].xml')
      expect(entries).toContain('_rels/.rels')
    }
  })
})
