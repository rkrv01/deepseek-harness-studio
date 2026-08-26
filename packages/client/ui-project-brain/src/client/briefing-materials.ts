import { strToU8, zipSync } from 'fflate/browser'

/** Demo briefing materials rendered by the receipt card. */
export interface BriefingMaterial {
  readonly name: string
  readonly kind: string
  readonly size: string
}

/** Names and presentation metadata for the preconfigured executive briefing package. */
export const BRIEFING_MATERIALS: readonly BriefingMaterial[] = [
  { name: '集团领导汇报_项目进展.docx', kind: 'Word', size: '约 48 KB' },
  { name: '集团领导汇报_PPT提纲.pptx', kind: 'PPT', size: '约 32 KB' },
  { name: '集团领导汇报_风险与协调事项.xlsx', kind: 'Excel', size: '约 24 KB' },
  { name: '集团领导汇报_口头稿.md', kind: 'Markdown', size: '约 8 KB' },
] as const

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/**
 * Create the browser-side download payload for one configured briefing material.
 * @param name - Configured material filename used to select its demo template.
 * @returns A Blob containing Markdown or a store-only Office Open XML package.
 */
export function createBriefingMaterialBlob(name: string): Blob {
  const bytes = name.endsWith('.md')
    ? new TextEncoder().encode(briefingMarkdown())
    : zipSync(officePackage(name), { level: 0 })
  return new Blob([bytes], { type: materialMimeType(name) })
}

function materialMimeType(name: string): string {
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (name.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return 'text/markdown;charset=utf-8'
}

function officePackage(name: string): Record<string, Uint8Array> {
  if (name.endsWith('.docx')) return {
    '[Content_Types].xml': strToU8(XML_DECLARATION + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8(documentRelationship('word/document.xml')),
    'word/document.xml': strToU8(`${XML_DECLARATION}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${materialTitle(name)}</w:t></w:r></w:p><w:p><w:r><w:t>本文件是界面演示数据，用于展示汇报材料下载交互。</w:t></w:r></w:p></w:body></w:document>`),
  }
  if (name.endsWith('.xlsx')) return {
    '[Content_Types].xml': strToU8(XML_DECLARATION + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8(documentRelationship('xl/workbook.xml')),
    'xl/workbook.xml': strToU8(`${XML_DECLARATION}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="风险与协调事项" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(`${XML_DECLARATION}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c t="inlineStr"><is><t>${materialTitle(name)}</t></is></c></row><row r="2"><c t="inlineStr"><is><t>演示数据 · 仅用于界面演示</t></is></c></row></sheetData></worksheet>`),
  }
  return {
    '[Content_Types].xml': strToU8(XML_DECLARATION + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'),
    '_rels/.rels': strToU8(documentRelationship('ppt/presentation.xml')),
    'ppt/presentation.xml': strToU8(`${XML_DECLARATION}<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`),
    'ppt/_rels/presentation.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>'),
    'ppt/slides/slide1.xml': strToU8(`${XML_DECLARATION}<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="标题"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="838200" y="762000"/><a:ext cx="10515600" cy="1325563"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:t>${materialTitle(name)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`),
  }
}

function documentRelationship(target: string): string {
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"/></Relationships>`
}

function materialTitle(name: string): string {
  return name.replace(/\.[^.]+$/u, '')
}

function briefingMarkdown(): string {
  return '# 集团领导汇报口头稿\n\n## 一句话结论\n智慧园区建设项目整体按计划推进，当前进度 78%，关键成果已经进入可验收状态。\n\n## 需要集团支持事项\n1. 确认跨系统数据接入责任边界。\n2. 协调第二批设备交付资源。\n3. 审批运营准备阶段的专项预算。\n\n> 演示数据 · 仅用于界面演示\n'
}
