export type ScheduleEntry = {
  date: string      // "2026-05-01" — block start (from Excel merged cell start)
  endDate?: string  // "2026-05-05" — block end (from Excel merged cell end), undefined = same as date
  content: string
}

export type Campaign = {
  id: string
  type: string       // 類型
  media: string      // 媒體
  placement: string  // 版位
  budget: number     // 金額合計(含稅)
  vendor: string     // 廠商
  assignee: string   // 分工
  scheduleEntries: ScheduleEntry[]
}

export type ScheduleData = {
  lastUpdated: string  // ISO timestamp
  sourceFile: string
  campaigns: Campaign[]
}
