#!/usr/bin/env node --import tsx
/**
 * Generate project documents from project-data.json.
 * Usage: npx tsx generate-docs.ts --format <word|excel|md|all> --input <json> --output <dir>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageBreak, type ITableBordersOptions,
} from 'docx'
import ExcelJS from 'exceljs'

interface ProjectData {
  projectName: string
  projectCode?: string
  status?: string
  startDate?: string
  endDate?: string
  budget?: number
  objectives?: string[]
  phases?: { name: string; start: string; end: string; deliverables?: string[] }[]
  tasks?: { id: string; name: string; assignee: string; estimate: number; dependencies?: string[] }[]
  risks?: { id: string; type: string; description: string; level: string; mitigation: string }[]
  team?: { role: string; name: string; department: string }[]
}

function parseArgs(): { format: string; input: string; output: string } {
  const args = process.argv.slice(2)
  const get = (key: string) => {
    const i = args.indexOf(key)
    return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined
  }
  const format = get('--format') || 'all'
  const input = get('--input') || 'project-data.json'
  const output = get('--output') || '.'
  return { format, input, output }
}

function loadData(input: string): ProjectData {
  const raw = readFileSync(resolve(input), 'utf-8')
  return JSON.parse(raw) as ProjectData
}

// ─── Word helpers ────────────────────────────────────────────────

const BLUE = '1F4E79'
const TEAL = '2B7A78'
const WHITE = 'FFFFFF'
const LIGHT_BLUE = 'D6E4F0'
const LIGHT_GRAY = 'F2F2F2'

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
    shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
  })
}

function dataCell(text: string | number | undefined, shade?: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ''), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })],
    shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
  })
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE, font: 'Microsoft YaHei' })],
    spacing: { before: 400, after: 200 },
    heading: HeadingLevel.HEADING_2,
  })
}

const TABLE_BORDERS: ITableBordersOptions = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
}

function generateWord(data: ProjectData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  // Cover
  children.push(new Paragraph({ spacing: { before: 3000 } }))
  children.push(new Paragraph({
    children: [new TextRun({ text: data.projectName, bold: true, size: 44, color: BLUE, font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: '项目启动方案', size: 36, color: TEAL, font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: `项目编号：${data.projectCode ?? ''}`, size: 22, color: '666666', font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  // Project info card
  children.push(sectionTitle('项目信息卡'))
  const infoRows = [
    ['项目名称', data.projectName],
    ['项目编号', data.projectCode ?? ''],
    ['项目状态', data.status ?? ''],
    ['开始日期', data.startDate ?? ''],
    ['结束日期', data.endDate ?? ''],
    ['总投资', data.budget ? `¥${data.budget.toLocaleString()}` : ''],
  ]
  children.push(new Table({
    rows: infoRows.map(([k, v], i) => new TableRow({
      tableHeader: i === 0,
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], width: { size: 3000, type: WidthType.DXA }, shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })], width: { size: 7000, type: WidthType.DXA } }),
      ],
    })),
    borders: TABLE_BORDERS,
  }))

  // Objectives
  if (data.objectives && data.objectives.length > 0) {
    children.push(sectionTitle('项目目标'))
    for (const obj of data.objectives) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${obj}`, size: 22, font: 'Microsoft YaHei' })],
        spacing: { after: 80 },
      }))
    }
  }

  // Phases table
  if (data.phases && data.phases.length > 0) {
    children.push(sectionTitle('阶段规划'))
    const phaseWidths = [
      { size: 3000, type: WidthType.DXA },
      { size: 2500, type: WidthType.DXA },
      { size: 2500, type: WidthType.DXA },
      { size: 4000, type: WidthType.DXA },
    ]
    children.push(new Table({
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['阶段名称', '开始时间', '结束时间', '交付物'].map((h, i) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
            shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
            width: phaseWidths[i],
          })),
        }),
        ...data.phases.map((p, i) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.name, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: phaseWidths[0] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.start, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: phaseWidths[1] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.end, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: phaseWidths[2] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (p.deliverables ?? []).join('、'), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: phaseWidths[3] }),
          ],
        })),
      ],
      borders: TABLE_BORDERS,
    }))
  }

  // Tasks as table
  if (data.tasks && data.tasks.length > 0) {
    children.push(sectionTitle('任务分解'))
    const taskWidths = [
      { size: 2000, type: WidthType.DXA },
      { size: 4000, type: WidthType.DXA },
      { size: 2000, type: WidthType.DXA },
      { size: 1500, type: WidthType.DXA },
      { size: 2500, type: WidthType.DXA },
    ]
    children.push(new Table({
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['编号', '任务名称', '负责人', '工期(天)', '前置任务'].map((h, i) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
            shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
            width: taskWidths[i],
          })),
        }),
        ...data.tasks.map((t, i) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.id, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: taskWidths[0] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.name, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: taskWidths[1] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.assignee, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: taskWidths[2] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t.estimate), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: taskWidths[3] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (t.dependencies ?? []).join('、'), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: taskWidths[4] }),
          ],
        })),
      ],
      borders: TABLE_BORDERS,
    }))
  }

  // Risks table
  if (data.risks && data.risks.length > 0) {
    children.push(sectionTitle('风险识别'))
    const riskWidths = [
      { size: 2000, type: WidthType.DXA },
      { size: 2000, type: WidthType.DXA },
      { size: 4000, type: WidthType.DXA },
      { size: 1500, type: WidthType.DXA },
      { size: 4500, type: WidthType.DXA },
    ]
    children.push(new Table({
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['编号', '风险类型', '风险描述', '影响等级', '应对措施'].map((h, i) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
            shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
            width: riskWidths[i],
          })),
        }),
        ...data.risks.map((r, i) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.id, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: riskWidths[0] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.type, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: riskWidths[1] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.description, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: riskWidths[2] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.level, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: riskWidths[3] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.mitigation, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.LEFT })], shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, color: LIGHT_GRAY, fill: LIGHT_GRAY }, width: riskWidths[4] }),
          ],
        })),
      ],
      borders: TABLE_BORDERS,
    }))
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: 'Microsoft YaHei', size: 22 },
        },
      },
    },
  })

  return Packer.toBuffer(doc)
}

// ─── Subdirectory document helpers ───────────────────────────────

function generateSubDoc(name: string, data: ProjectData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  children.push(new Paragraph({
    children: [new TextRun({ text: name, bold: true, size: 36, color: BLUE, font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 400 },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: `项目：${data.projectName}`, size: 22, color: '666666', font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: `项目编号：${data.projectCode ?? ''}`, size: 22, color: '666666', font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: '（文档内容待补充）', size: 22, color: '999999', font: 'Microsoft YaHei' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 },
  }))

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: 'Microsoft YaHei', size: 22 },
        },
      },
    },
  })

  return Packer.toBuffer(doc)
}

function generateSubMd(name: string, data: ProjectData): string {
  return `# ${name}

> 项目：${data.projectName} ｜ 项目编号：${data.projectCode ?? ''}

（文档内容待补充）
`
}

// ─── Excel helpers ───────────────────────────────────────────────

async function generateExcel(data: ProjectData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = '项目智脑'
  wb.created = new Date()

  const taskSheet = wb.addWorksheet('任务清单')
  taskSheet.columns = [
    { header: '编号', key: 'id', width: 14 },
    { header: '任务名称', key: 'name', width: 30 },
    { header: '负责人', key: 'assignee', width: 14 },
    { header: '工期(天)', key: 'estimate', width: 12 },
    { header: '前置任务', key: 'dependencies', width: 20 },
  ]
  const taskHeader = taskSheet.getRow(1)
  taskHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Microsoft YaHei' }
  taskHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  taskHeader.alignment = { horizontal: 'center', vertical: 'middle' }
  for (const task of data.tasks ?? []) {
    const row = taskSheet.addRow({
      id: task.id,
      name: task.name,
      assignee: task.assignee,
      estimate: task.estimate,
      dependencies: (task.dependencies ?? []).join('、'),
    })
    row.alignment = { vertical: 'middle' }
    row.font = { name: 'Microsoft YaHei', size: 10 }
  }
  taskSheet.autoFilter = { from: 'A1', to: `E${(data.tasks?.length ?? 0) + 1}` }

  const riskSheet = wb.addWorksheet('风险登记册')
  riskSheet.columns = [
    { header: '编号', key: 'id', width: 14 },
    { header: '风险类型', key: 'type', width: 16 },
    { header: '风险描述', key: 'description', width: 40 },
    { header: '影响等级', key: 'level', width: 12 },
    { header: '应对措施', key: 'mitigation', width: 40 },
  ]
  const riskHeader = riskSheet.getRow(1)
  riskHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Microsoft YaHei' }
  riskHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  riskHeader.alignment = { horizontal: 'center', vertical: 'middle' }
  for (const risk of data.risks ?? []) {
    const row = riskSheet.addRow({
      id: risk.id,
      type: risk.type,
      description: risk.description,
      level: risk.level,
      mitigation: risk.mitigation,
    })
    row.alignment = { vertical: 'middle' }
    row.font = { name: 'Microsoft YaHei', size: 10 }
  }
  riskSheet.autoFilter = { from: 'A1', to: `E${(data.risks?.length ?? 0) + 1}` }

  const summarySheet = wb.addWorksheet('项目摘要')
  summarySheet.columns = [
    { header: '项目信息', key: 'label', width: 30 },
    { header: '内容', key: 'value', width: 60 },
  ]
  const summaryHeader = summarySheet.getRow(1)
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Microsoft YaHei' }
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' }
  const summaryData = [
    ['项目名称', data.projectName],
    ['项目编号', data.projectCode ?? ''],
    ['项目状态', data.status ?? ''],
    ['开始日期', data.startDate ?? ''],
    ['结束日期', data.endDate ?? ''],
    ['总投资', data.budget ? `¥${data.budget.toLocaleString()}` : ''],
    ['项目目标', (data.objectives ?? []).join('；')],
    ['团队', (data.team ?? []).map(t => `${t.role}：${t.name}`).join('；')],
  ]
  for (const [i, [label, value]] of summaryData.entries()) {
    const row = summarySheet.addRow({ label, value })
    row.alignment = { vertical: 'middle', wrapText: true }
    row.font = { name: 'Microsoft YaHei', size: 10 }
    if (i % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Markdown helpers ────────────────────────────────────────────

function generateMarkdown(data: ProjectData): Record<string, string> {
  const files: Record<string, string> = {}

  files['README.md'] = `# ${data.projectName}

> 项目编号：${data.projectCode ?? ''} ｜ 状态：${data.status ?? ''} ｜ 周期：${data.startDate ?? ''} ～ ${data.endDate ?? ''}

## 项目目标

${(data.objectives ?? []).map(o => `- ${o}`).join('\n')}

## 项目团队

| 角色 | 姓名 | 部门 |
|------|------|------|
${(data.team ?? []).map(t => `| ${t.role} | ${t.name} | ${t.department} |`).join('\n')}

## 阶段规划

| 阶段 | 开始 | 结束 | 交付物 |
|------|------|------|--------|
${(data.phases ?? []).map(p => `| ${p.name} | ${p.start} | ${p.end} | ${(p.deliverables ?? []).join('、')} |`).join('\n')}
`

  files['plan.md'] = `# ${data.projectName} — 项目计划

## 基本信息

- **项目名称**：${data.projectName}
- **项目编号**：${data.projectCode ?? ''}
- **起止时间**：${data.startDate ?? ''} ～ ${data.endDate ?? ''}
- **总投资**：${data.budget ? `¥${data.budget.toLocaleString()}` : ''}

## 阶段规划

${(data.phases ?? []).map(p => `### ${p.name}（${p.start} ～ ${p.end}）

${(p.deliverables ?? []).map(d => `- 交付物：${d}`).join('\n')}`).join('\n\n')}
`

  files['tasks.md'] = `# 任务清单

| 编号 | 任务名称 | 负责人 | 工期(天) | 前置任务 |
|------|---------|--------|---------|---------|
${(data.tasks ?? []).map(t => `| ${t.id} | ${t.name} | ${t.assignee} | ${t.estimate} | ${(t.dependencies ?? []).join('、')} |`).join('\n')}
`

  files['risks.md'] = `# 风险登记册

| 编号 | 风险类型 | 风险描述 | 影响等级 | 应对措施 |
|------|---------|---------|---------|---------|
${(data.risks ?? []).map(r => `| ${r.id} | ${r.type} | ${r.description} | ${r.level} | ${r.mitigation} |`).join('\n')}
`

  return files
}

// ─── Subdirectory structure ──────────────────────────────────────

const SUBDIRECTORIES = [
  '01-项目立项',
  '02-项目计划',
  '03-设计方案',
  '04-项目执行',
  '05-会议纪要',
  '06-技术资料',
  '07-验收资料',
  '08-项目经验',
]

async function writeSubdirectoryFiles(outDir: string, data: ProjectData, formats: string[]): Promise<void> {
  for (const subdir of SUBDIRECTORIES) {
    const dirPath = join(outDir, subdir)
    mkdirSync(dirPath, { recursive: true })

    const docName = subdir.replace(/^\d+-/, '')
    if (formats.includes('word')) {
      const name = subdir === '06-技术资料' ? '技术资料' : `${docName}（${data.projectName}）`
      const buffer = await generateSubDoc(name, data)
      const path = join(dirPath, `${docName}.docx`)
      writeFileSync(path, buffer)
      console.log(`✅ 已生成 Word: ${path}`)
    }
    if (formats.includes('md')) {
      const name = subdir === '06-技术资料' ? '技术资料' : `${docName}（${data.projectName}）`
      const content = generateSubMd(name, data)
      const path = join(dirPath, `${docName}.md`)
      writeFileSync(path, content, 'utf-8')
      console.log(`✅ 已生成 Markdown: ${path}`)
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const { format, input, output } = parseArgs()
  const data = loadData(input)
  const outDir = resolve(output)
  mkdirSync(outDir, { recursive: true })

  const formats = format === 'all' ? ['word', 'excel', 'md'] : [format]

  if (formats.includes('word')) {
    const buffer = await generateWord(data)
    const path = join(outDir, '项目启动方案.docx')
    writeFileSync(path, buffer)
    console.log(`✅ 已生成 Word: ${path}`)
  }

  if (formats.includes('excel')) {
    const buffer = await generateExcel(data)
    const path = join(outDir, '项目任务清单.xlsx')
    writeFileSync(path, buffer)
    console.log(`✅ 已生成 Excel: ${path}`)
  }

  if (formats.includes('md')) {
    const files = generateMarkdown(data)
    for (const [name, content] of Object.entries(files)) {
      const path = join(outDir, name)
      writeFileSync(path, content, 'utf-8')
      console.log(`✅ 已生成 Markdown: ${path}`)
    }
  }

  await writeSubdirectoryFiles(outDir, data, formats)
}

main().catch(err => {
  console.error('❌ 生成失败:', err)
  process.exit(1)
})