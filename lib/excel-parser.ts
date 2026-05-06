import * as XLSX from 'xlsx'
import type { Campaign, ScheduleData } from './types'

// Sheet structure (0-indexed JS columns):
// Row 2 (idx 1): headers — 類型/媒體/版位/金額合計/廠商/分工 then month label
// Row 3 (idx 2): day numbers starting at col 6 (idx 6)
// Row 4 (idx 3): day of week
// Rows 5-21 (idx 4-20): campaign data rows
// Col 0: 類型, Col 1: 媒體, Col 2: 版位, Col 3: 金額合計, Col 4: 廠商, Col 5: 分工
// Cols 6+: daily schedule cells

const DATE_COL_START = 6  // 0-based index of first date column

function buildDateArray(sheetName: string, dateRow: (string | number)[]): string[] {
  const match = sheetName.match(/(\d{4})\s*(\d+)月/)
  const year = match ? parseInt(match[1]) : new Date().getFullYear()
  const mainMonth = match ? parseInt(match[2]) : new Date().getMonth() + 1

  const dates: string[] = []
  let inMainMonth = false
  let prevDay = 0

  for (let i = DATE_COL_START; i < dateRow.length; i++) {
    const raw = dateRow[i]
    const day = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''))

    if (!day || isNaN(day) || day < 1 || day > 31) {
      dates.push('')
      continue
    }

    // Detect month transition: day number drops significantly
    if (!inMainMonth && day < prevDay && prevDay >= 28) {
      inMainMonth = true
    }

    const month = inMainMonth ? mainMonth : mainMonth - 1
    const m = month <= 0 ? month + 12 : month
    const y = month <= 0 ? year - 1 : year

    dates.push(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    prevDay = day
  }

  return dates
}

function isSummaryRow(row: (string | number)[]): boolean {
  const type = String(row[0] ?? '').trim()
  const media = String(row[1] ?? '').trim()
  // Summary rows: type contains total/subtotal keywords, or both type and media are empty
  if (type.includes('合計') || type.includes('小計') || type.includes('費：') || type.includes('total')) return true
  if (!type && !media) return true
  return false
}

type MergeRange = { s: { r: number; c: number }; e: { r: number; c: number } }

export function parseETFSheet(buffer: Buffer, sheetName?: string): ScheduleData {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const name = sheetName ?? workbook.SheetNames[0]
  const ws = workbook.Sheets[name]

  if (!ws) {
    throw new Error(`找不到工作表: ${name || '(第一個工作表)'}`)
  }

  // sheet_to_json arrays use column indices relative to the sheet's starting column.
  // e.g. if sheet starts at col B (col index 1), rows[i][0] = col B, rows[i][1] = col C …
  // !merges uses absolute sheet col indices, so we subtract the offset to match.
  const sheetRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const colOffset = sheetRange.s.c  // e.g. 1 when sheet starts at B
  const rowOffset = sheetRange.s.r  // usually 0

  const mergeMap = new Map<string, number>()
  const merges = (ws['!merges'] as MergeRange[]) || []
  merges.forEach((m) => {
    if (m.e.c > m.s.c) {  // horizontal merge only
      const adjRow = m.s.r - rowOffset
      const adjStartCol = m.s.c - colOffset
      const adjEndCol = m.e.c - colOffset
      mergeMap.set(`${adjRow}_${adjStartCol}`, adjEndCol)
    }
  })

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
    header: 1,
    defval: '',
    raw: true,
  })

  const dateRow = (rows[2] as (string | number)[]) ?? []
  const dates = buildDateArray(name, dateRow)

  const campaigns: Campaign[] = []
  let lastType = ''

  for (let rowIdx = 4; rowIdx < Math.min(rows.length, 25); rowIdx++) {
    const row = rows[rowIdx] as (string | number)[]
    if (!row || isSummaryRow(row)) continue

    const media = String(row[1] ?? '').trim()
    if (!media) continue

    // Propagate type from merged cells (type cell is empty in sub-rows)
    const rawType = String(row[0] ?? '').trim().replace(/\r\n/g, ' ')
    if (rawType) lastType = rawType
    const type = lastType

    const budget = typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3] ?? '0').replace(/,/g, '')) || 0

    const campaign: Campaign = {
      id: `row-${rowIdx}`,
      type,
      media,
      placement: String(row[2] ?? '').trim(),
      budget,
      vendor: String(row[4] ?? '').trim(),
      assignee: String(row[5] ?? '').trim(),
      scheduleEntries: [],
    }

    for (let colIdx = DATE_COL_START; colIdx < row.length; colIdx++) {
      const content = String(row[colIdx] ?? '').trim()
      const date = dates[colIdx - DATE_COL_START]
      if (content && date) {
        // Check if this cell is the start of a horizontal merge (adjusted indices)
        const adjRow = rowIdx - rowOffset
        const mergeEndCol = mergeMap.get(`${adjRow}_${colIdx}`)
        let endDate: string | undefined
        if (mergeEndCol !== undefined && mergeEndCol > colIdx) {
          const endIdx = mergeEndCol - DATE_COL_START
          endDate = (endIdx >= 0 && endIdx < dates.length && dates[endIdx]) ? dates[endIdx] : undefined
        }
        campaign.scheduleEntries.push({ date, endDate, content })
      }
    }

    campaigns.push(campaign)
  }

  return {
    lastUpdated: new Date().toISOString(),
    sourceFile: name,
    campaigns,
  }
}

export function getSheetNames(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  return workbook.SheetNames
}

export function exportToExcel(data: ScheduleData): Buffer {
  const wb = XLSX.utils.book_new()

  // Collect all unique dates
  const dateSet = new Set<string>()
  data.campaigns.forEach((c) => c.scheduleEntries.forEach((e) => dateSet.add(e.date)))
  const allDates = Array.from(dateSet).sort()

  // Build header rows
  const header1 = ['', '類型', '媒體', '版位', '金額合計(含稅)', '廠商', '分工', ...allDates]
  const rows: (string | number)[][] = [header1]

  data.campaigns.forEach((c) => {
    const row: (string | number)[] = [
      '',
      c.type,
      c.media,
      c.placement,
      c.budget,
      c.vendor,
      c.assignee,
    ]
    allDates.forEach((date) => {
      const entry = c.scheduleEntries.find((e) => e.date === date)
      row.push(entry?.content ?? '')
    })
    rows.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, data.sourceFile || 'Schedule')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
