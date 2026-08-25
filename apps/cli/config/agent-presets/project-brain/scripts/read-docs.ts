#!/usr/bin/env node --import tsx
/**
 * Read document content from various file formats and output to stdout.
 * Usage: npx tsx read-docs.ts --input <path>
 *
 * Supported formats:
 *   .md / .txt  — direct read
 *   .docx        — mammoth text extraction
 *   .xlsx        — exceljs workbook traversal
 *   .pdf         — hybrid: pdftotext (text PDF) → tesseract OCR (scanned, >5 pages) → image paths (scanned, ≤5 pages)
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'fs'
import { extname, resolve } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'

const MIN_TEXT_LENGTH = 50

function parseArgs(): { input: string } {
  const args = process.argv.slice(2)
  const i = args.indexOf('--input')
  const input = i !== -1 && i + 1 < args.length ? args[i + 1] : undefined
  if (!input) {
    console.error('用法: npx tsx read-docs.ts --input <path>')
    process.exit(1)
  }
  return { input: resolve(input) }
}

function readTextFile(path: string): void {
  const content = readFileSync(path, 'utf-8')
  console.log(content)
}

async function readDocx(path: string): Promise<void> {
  const result = await mammoth.extractRawText({ path })
  console.log(result.value)
  if (result.messages.length > 0) {
    console.error(`[警告] ${result.messages.map(m => m.message).join('; ')}`)
  }
}

async function readXlsx(path: string): Promise<void> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path)
  wb.eachSheet((sheet) => {
    console.log(`\n=== 工作表: ${sheet.name} ===`)
    const rows: string[][] = []
    sheet.eachRow((row, rowIndex) => {
      const values = (row.values as (string | number | null | undefined)[]).slice(1).map(v => String(v ?? ''))
      rows.push(values)
    })
    if (rows.length === 0) return
    const colWidths = rows[0].map((_, ci) => Math.max(...rows.map(r => (r[ci] ?? '').length)))
    for (const row of rows) {
      const line = row.map((v, ci) => v.padEnd(colWidths[ci] ?? 0)).join('  │  ')
      console.log(line)
    }
    console.log()
  })
}

function readPdf(path: string): void {
  let text: string
  try {
    text = execSync(`pdftotext "${path}" -`, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }).trim()
  } catch {
    text = ''
  }

  if (text.length >= MIN_TEXT_LENGTH) {
    console.log(text)
    return
  }

  let pageCount: number
  try {
    const info = execSync(`pdfinfo "${path}"`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 })
    const match = info.match(/Pages:\s*(\d+)/)
    pageCount = match ? parseInt(match[1], 10) : 0
  } catch {
    pageCount = 0
  }

  if (pageCount <= 0) {
    console.error('无法读取 PDF 文件')
    process.exit(1)
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'pdf-read-'))

  try {
    execSync(`pdftoppm -png -r 300 "${path}" "${join(tmpDir, 'page')}"`, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 })
  } catch {
    console.error('PDF 转图片失败')
    process.exit(1)
  }

  if (pageCount <= 5) {
    for (let p = 1; p <= pageCount; p++) {
      const imgPath = join(tmpDir, `page-${String(p).padStart(2, '0')}.png`)
      console.log(`IMAGE:${imgPath}`)
    }
  } else {
    for (let p = 1; p <= pageCount; p++) {
      const imgPath = join(tmpDir, `page-${String(p).padStart(2, '0')}.png`)
      try {
        const ocr = execSync(`tesseract "${imgPath}" stdout -l chi_sim+eng 2>/dev/null`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim()
        if (ocr) {
          console.log(`\n--- 第 ${p} 页 ---`)
          console.log(ocr)
        }
      } catch {
        console.error(`第 ${p} 页 OCR 失败`)
      }
    }
  }
}

async function main() {
  const { input } = parseArgs()
  const ext = extname(input).toLowerCase()

  switch (ext) {
    case '.md':
    case '.txt':
      readTextFile(input)
      break
    case '.docx':
      await readDocx(input)
      break
    case '.xlsx':
      await readXlsx(input)
      break
    case '.pdf':
      readPdf(input)
      break
    default:
      console.error(`不支持的文件格式: ${ext}，支持: .md .txt .docx .xlsx .pdf`)
      process.exit(1)
  }
}

main().catch(err => {
  console.error('读取失败:', err)
  process.exit(1)
})