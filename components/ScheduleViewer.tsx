'use client'

import { useState, useEffect } from 'react'
import type { Campaign, ScheduleData, ScheduleEntry } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'week' | 'month'
type CellInfo = { date: string; colSpan: number; entry?: ScheduleEntry } | null
type RowItem =
  | { kind: 'divider'; key: string }
  | { kind: 'campaign'; campaign: Campaign; key: string }

// ─── FT Color palette ─────────────────────────────────────────────────────────

type Palette = {
  chipBg: string; chipColor: string; dot: string
  eventAccent: string; eventBg: string; eventInk: string; eventSub: string
}

const TYPE_PALETTE: Record<string, Palette> = {
  '製作':    { chipBg: '#F1E8DD', chipColor: '#8C6F52', dot: '#B08F6E', eventAccent: '#B08F6E', eventBg: '#F8F1E6', eventInk: '#5E4A36', eventSub: '#8C6F52' },
  '新聞報導': { chipBg: '#F7E4E4', chipColor: '#8E0000', dot: '#C00000', eventAccent: '#C00000', eventBg: '#FBEDED', eventInk: '#8E0000', eventSub: '#A04545' },
  '數位廣告': { chipBg: '#F1E8DD', chipColor: '#8C6F52', dot: '#B08F6E', eventAccent: '#B08F6E', eventBg: '#F8F1E6', eventInk: '#5E4A36', eventSub: '#8C6F52' },
  'KOL':    { chipBg: '#E5EBE3', chipColor: '#3F5238', dot: '#5A7A4D', eventAccent: '#5A7A4D', eventBg: '#EEF2EA', eventInk: '#3F5238', eventSub: '#6E8A5F' },
  '輿論':    { chipBg: '#E1E8EE', chipColor: '#2F4A5E', dot: '#3F5B6E', eventAccent: '#3F5B6E', eventBg: '#EBF1F5', eventInk: '#2F4A5E', eventSub: '#5E7689' },
}
const DEFAULT_PALETTE: Palette = { chipBg: '#F1E8DD', chipColor: '#8C6F52', dot: '#B08F6E', eventAccent: '#B08F6E', eventBg: '#F8F1E6', eventInk: '#5E4A36', eventSub: '#8C6F52' }

function getPalette(type: string): Palette {
  for (const [k, v] of Object.entries(TYPE_PALETTE)) if (type.includes(k)) return v
  return DEFAULT_PALETTE
}

const LEGEND = [
  { label: '新聞報導', dot: '#C00000' },
  { label: '數位廣告', dot: '#B08F6E' },
  { label: 'KOL',    dot: '#5A7A4D' },
  { label: '輿論',    dot: '#3F5B6E' },
  { label: '製作',    dot: '#8C6F52' },
]

// ─── Media icon (fully inline-styled, no CSS class dependency) ────────────────

const MICO_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  line:    { bg: '#EAF3E6', color: '#3F7A2F', border: '#CDE3C2' },
  fb:      { bg: '#E6ECF4', color: '#2D4A7A', border: '#C5D2E3' },
  yt:      { bg: '#F7E4E4', color: '#8E0000', border: '#EFC9C9' },
  kol:     { bg: '#E5EBE3', color: '#3F5238', border: '#C9D4C5' },
  pr:      { bg: '#F7E4E4', color: '#8E0000', border: '#EFC9C9' },
  yu:      { bg: '#E1E8EE', color: '#2F4A5E', border: '#C2D2DE' },
  default: { bg: '#F1E8DD', color: '#8C6F52', border: '#E2D2BD' },
}

function getMico(media: string): { label: string; colorKey: string } {
  const m = media.toLowerCase()
  if (m.includes('line'))   return { label: 'L', colorKey: 'line' }
  if (m.includes('yt') || m.includes('youtube')) return { label: 'YT', colorKey: 'yt' }
  if (m.includes('影音') && (m.includes('fb') || m.includes('ig'))) return { label: '▶f/◎', colorKey: 'fb' }
  if (m.includes('fb') || m.includes('ig'))  return { label: 'f/◎', colorKey: 'fb' }
  if (m.includes('kol'))    return { label: 'K', colorKey: 'kol' }
  if (m.includes('pr'))     return { label: 'PR', colorKey: 'pr' }
  if (m.includes('輿論'))   return { label: '輿', colorKey: 'yu' }
  if (m.includes('新聞') || m.includes('置入')) return { label: '報', colorKey: 'pr' }
  if (m.includes('影片') || m.includes('video')) return { label: '▶', colorKey: 'default' }
  return { label: media.trim().slice(0, 2), colorKey: 'default' }
}

function MicoIcon({ media }: { media: string }) {
  const { label, colorKey } = getMico(media)
  const c = MICO_COLORS[colorKey] ?? MICO_COLORS.default
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: 4,
      fontFamily: '"Inter", system-ui', fontSize: 10, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      flexShrink: 0, letterSpacing: '-0.02em',
    }}>
      {label}
    </span>
  )
}

// ─── Date utilities ───────────────────────────────────────────────────────────

const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getWeekDays(offset: number): string[] {
  const base = new Date()
  base.setDate(base.getDate() + offset * 7)
  const dow = base.getDay()
  const mon = new Date(base)
  mon.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function getAllDatesInData(campaigns: Campaign[]): string[] {
  let min = '9999-99-99', max = '0000-00-00'
  campaigns.forEach((c) =>
    c.scheduleEntries.forEach((e) => {
      if (e.date < min) min = e.date
      const end = e.endDate || e.date
      if (end > max) max = end
    })
  )
  if (min === '9999-99-99') return []
  // Extend end to last day of the month so month view always shows the full month
  const maxDate = new Date(max + 'T00:00:00')
  const lastOfMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
  const extendedMax = lastOfMonth.toISOString().slice(0, 10)
  const result: string[] = []
  const cur = new Date(min + 'T00:00:00')
  const end = new Date(extendedMax + 'T00:00:00')
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

function fmtMD(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ─── Grid layout ──────────────────────────────────────────────────────────────

function computeRowLayout(campaign: Campaign, visibleDays: string[]): CellInfo[] {
  const layout: CellInfo[] = []
  let i = 0
  while (i < visibleDays.length) {
    const date = visibleDays[i]
    const entry = campaign.scheduleEntries.find((e) => {
      const entryEnd = e.endDate || e.date
      return e.date <= date && entryEnd >= date
    })
    if (entry) {
      const entryEnd = entry.endDate || entry.date
      let span = 1
      while (i + span < visibleDays.length && visibleDays[i + span] <= entryEnd) span++
      layout.push({ date, colSpan: span, entry })
      for (let j = 1; j < span; j++) layout.push(null)
      i += span
    } else {
      layout.push({ date, colSpan: 1 })
      i++
    }
  }
  return layout
}

// ─── Summary ─────────────────────────────────────────────────────────────────

type SummaryMap = Record<string, Record<string, number>>

function computeSummary(campaigns: Campaign[], visibleDays: string[]): SummaryMap {
  if (!visibleDays.length) return {}
  const start = visibleDays[0], end = visibleDays[visibleDays.length - 1]
  const summary: SummaryMap = {}
  campaigns.forEach((c) => {
    const seen = new Set<string>()
    c.scheduleEntries.forEach((e) => {
      const entryEnd = e.endDate || e.date
      if (e.date > end || entryEnd < start) return
      const key = `${e.date}_${e.content}`
      if (seen.has(key)) return
      seen.add(key)
      if (!summary[c.type]) summary[c.type] = {}
      summary[c.type][c.media] = (summary[c.type][c.media] || 0) + 1
    })
  })
  return summary
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleViewer({
  adminPassword = '',
  defaultView = 'week',
}: {
  adminPassword?: string
  defaultView?: ViewMode
}) {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingCell, setEditingCell] = useState<{ campaignId: string; date: string; content: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((d: ScheduleData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: '96px 0', color: '#B8B3AD', fontSize: 13 }}>載入中…</div>
  if (!data || !data.campaigns?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '96px 0', color: '#7A7775' }}>
        <p style={{ marginBottom: 16 }}>尚無排程資料</p>
        <a href="/upload" className="btn primary">上傳 Excel</a>
      </div>
    )
  }

  const visibleDays = viewMode === 'week' ? getWeekDays(weekOffset) : getAllDatesInData(data.campaigns)
  const visibleStart = visibleDays[0] ?? ''
  const visibleEnd = visibleDays[visibleDays.length - 1] ?? ''
  const summary = computeSummary(data.campaigns, visibleDays)
  const totalItems = Object.values(summary).reduce((s, mm) => s + Object.values(mm).reduce((a, b) => a + b, 0), 0)
  const dayColWidth = viewMode === 'week' ? 114 : 58

  // Pre-compute flat rows (avoid Fragment-in-map which breaks table keying)
  const rowItems: RowItem[] = []
  let prevGroup = ''
  data.campaigns.forEach((campaign) => {
    const g = Object.keys(TYPE_PALETTE).find((k) => campaign.type.includes(k)) ?? campaign.type
    if (prevGroup !== '' && g !== prevGroup) rowItems.push({ kind: 'divider', key: `div-${campaign.id}` })
    rowItems.push({ kind: 'campaign', campaign, key: campaign.id })
    prevGroup = g
  })

  async function saveEdit() {
    if (!editingCell) return
    setSaving(true)
    await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(adminPassword ? { 'x-admin-password': adminPassword } : {}) },
      body: JSON.stringify({ campaignId: editingCell.campaignId, date: editingCell.date, content: editingCell.content }),
    })
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        campaigns: prev.campaigns.map((c) => {
          if (c.id !== editingCell.campaignId) return c
          const others = c.scheduleEntries.filter((e) => e.date !== editingCell.date)
          const updated = editingCell.content.trim() ? [...others, { date: editingCell.date, content: editingCell.content }] : others
          return { ...c, scheduleEntries: updated }
        }),
      }
    })
    setSaving(false)
    setEditingCell(null)
  }

  return (
    <div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 }}>

        {/* Week / Month toggle */}
        <div style={{ display: 'inline-flex', border: '1px solid #D7CBBC', borderRadius: 4, overflow: 'hidden', background: '#FFFAF3' }}>
          {(['week', 'month'] as ViewMode[]).map((m, idx) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                fontSize: 12, fontWeight: 500, padding: '8px 16px', cursor: 'pointer',
                background: viewMode === m ? '#2A2622' : 'transparent',
                color: viewMode === m ? '#FFF1E5' : '#4D4D4F',
                border: 'none',
                borderLeft: idx > 0 ? '1px solid #D7CBBC' : 'none',
                transition: 'all .15s',
              }}
            >
              {m === 'week' ? '週視圖' : '月視圖'}
            </button>
          ))}
        </div>

        {/* Week navigation */}
        {viewMode === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFAF3', border: '1px solid #D7CBBC', borderRadius: 4, overflow: 'hidden' }}>
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              style={{ padding: '8px 18px', fontSize: 16, color: '#4D4D4F', background: 'transparent', border: 'none', borderRight: '1px solid #D7CBBC', cursor: 'pointer', lineHeight: 1 }}
            >
              ‹
            </button>
            <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, whiteSpace: 'nowrap' }}>
              <span className="num" style={{ fontWeight: 600, color: '#2A2622' }}>
                {fmtMD(visibleStart)} – {fmtMD(visibleEnd)}
              </span>
              {weekOffset === 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C00000' }}>
                  · 本週
                </span>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              style={{ padding: '8px 18px', fontSize: 16, color: '#4D4D4F', background: 'transparent', border: 'none', borderLeft: '1px solid #D7CBBC', cursor: 'pointer', lineHeight: 1 }}
            >
              ›
            </button>
          </div>
        )}

        {viewMode === 'week' && weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            style={{ fontSize: 12, fontWeight: 500, padding: '8px 12px', borderRadius: 4, border: 'none', background: 'transparent', color: '#4D4D4F', cursor: 'pointer' }}
          >
            回到今日
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {data.lastUpdated && (
            <span className="num" style={{ fontSize: 11, color: '#7A7775', whiteSpace: 'nowrap' }}>
              最後更新 {new Date(data.lastUpdated).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <a href="/upload" style={{ fontSize: 12, fontWeight: 500, padding: '8px 12px', borderRadius: 4, border: '1px solid #D7CBBC', background: '#FFFAF3', color: '#2A2622', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ↻ 同步 Excel
          </a>
          <a href="/api/export" style={{ fontSize: 12, fontWeight: 500, padding: '8px 12px', borderRadius: 4, border: '1px solid #D7CBBC', background: '#FFFAF3', color: '#2A2622', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            匯出
          </a>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      {Object.keys(summary).length > 0 && (
        <section style={{ background: '#FFFAF3', border: '1px solid #E8DFD4', borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr' }}>

            {/* Left: total */}
            <div style={{ padding: '20px 22px', borderRight: '1px solid #E8DFD4', background: 'rgba(244,228,210,0.4)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7A7775', marginBottom: 6 }}>
                {viewMode === 'week' ? 'This Week' : 'Overview'}
              </div>
              <div className="font-serif-tc num" style={{ fontSize: 36, lineHeight: 1, fontWeight: 700, color: '#2A2622' }}>
                {totalItems}
              </div>
              <div style={{ fontSize: 11, color: '#7A7775', marginTop: 4 }}>項排程進行中</div>
            </div>

            {/* Right: per-type */}
            <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: `repeat(${Math.min(Object.keys(summary).length, 3)}, 1fr)`, gap: 0 }}>
              {Object.entries(summary).map(([type, mediaMap], colIdx) => {
                const pal = getPalette(type)
                const typeTotal = Object.values(mediaMap).reduce((a, b) => a + b, 0)
                const typeLabel = type.replace(/\s*\([^)]*\)/, '').trim()
                return (
                  <div
                    key={type}
                    style={colIdx > 0 ? { borderLeft: '1px solid #E8DFD4', paddingLeft: 20 } : {}}
                  >
                    {/* Type header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pal.dot, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: pal.chipColor }}>
                        {typeLabel}
                      </span>
                      {/* Count: prominent number in dark pill */}
                      <span style={{
                        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 26, height: 26, padding: '0 7px', borderRadius: 4,
                        fontSize: 14, fontWeight: 700, fontFamily: '"Inter", system-ui',
                        background: '#2A2622', color: '#FFF1E5',
                      }}>
                        {typeTotal}
                      </span>
                    </div>
                    {/* Media breakdown */}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {Object.entries(mediaMap).map(([media, count]) => (
                        <li key={media} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: '#4D4D4F' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{media}</span>
                          <span className="num" style={{ color: '#7A7775', flexShrink: 0 }}>×{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Schedule Grid ── */}
      <section style={{ background: '#FFFAF3', border: '1px solid #E8DFD4', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            className="sched"
            style={{ tableLayout: 'fixed', width: '100%', minWidth: 330 + visibleDays.length * dayColWidth, fontSize: 12 }}
          >
            <colgroup>
              <col style={{ width: 104 }} />
              <col style={{ width: 148 }} />
              <col style={{ width: 78 }} />
              {visibleDays.map((d) => <col key={d} style={{ width: dayColWidth }} />)}
            </colgroup>

            <thead>
              <tr style={{ background: '#F4E4D2' }}>
                {(['類型', '媒體 / 渠道', '分工'] as const).map((label, i) => (
                  <th
                    key={label}
                    className={`sticky-col col-meta ${i === 0 ? 'sticky-type' : i === 1 ? 'sticky-media' : 'sticky-assign'}`}
                    style={{ background: '#F4E4D2', padding: '12px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A7775' }}
                  >
                    {label}
                  </th>
                ))}
                {visibleDays.map((date) => {
                  const d = new Date(date + 'T00:00:00')
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const isToday = date === today
                  return (
                    <th
                      key={date}
                      className={`day ${isToday ? 'today-tint' : isWeekend ? 'weekend-tint' : ''}`}
                      style={{ padding: '10px 4px 8px', textAlign: 'center', ...(isToday ? { borderTop: '2px solid #C00000' } : {}) }}
                    >
                      <div className="num" style={{ fontSize: 14, fontWeight: isToday ? 700 : 600, color: isToday ? '#C00000' : isWeekend ? '#B8B3AD' : '#4D4D4F' }}>
                        {d.getMonth() + 1}/{d.getDate()}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: isToday ? '#C00000' : isWeekend ? '#B8B3AD' : '#7A7775' }}>
                        {isToday ? `${WEEKDAYS_EN[d.getDay()]} · 今日` : WEEKDAYS_EN[d.getDay()]}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody style={{ background: '#FFFAF3' }}>
              {rowItems.map((row) => {
                if (row.kind === 'divider') {
                  return (
                    <tr key={row.key}>
                      <td
                        colSpan={3 + visibleDays.length}
                        style={{ padding: 0, height: 1, background: '#EADFD0', border: 'none' }}
                      />
                    </tr>
                  )
                }

                const { campaign } = row
                const layout = computeRowLayout(campaign, visibleDays)
                const pal = getPalette(campaign.type)
                const hasActivity = layout.some((c) => c?.entry)

                return (
                  <tr
                    key={row.key}
                    className={`sched-row${!hasActivity ? ' sched-muted' : ''}`}
                  >
                    {/* Type chip */}
                    <td className="sticky-col sticky-type col-meta" style={{ background: '#FFFAF3', padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 11, lineHeight: 1, fontWeight: 600, padding: '5px 9px 5px 8px',
                        borderRadius: 999, letterSpacing: '0.02em', whiteSpace: 'nowrap',
                        background: pal.chipBg, color: pal.chipColor,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: pal.dot, display: 'inline-block', flexShrink: 0 }} />
                        {campaign.type.replace(/\s*\([^)]*\)/, '').trim()}
                      </span>
                    </td>

                    {/* Media */}
                    <td className="sticky-col sticky-media col-meta" style={{ background: '#FFFAF3', padding: '10px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MicoIcon media={campaign.media} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 12.5, color: '#2A2622', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={campaign.media}>
                            {campaign.media}
                          </div>
                          {campaign.placement && (
                            <div style={{ fontSize: 10.5, color: '#7A7775', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={campaign.placement}>
                              {campaign.placement}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assignee */}
                    <td className="sticky-col sticky-assign col-meta" style={{ background: '#FFFAF3', padding: '10px 12px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 11, color: '#4D4D4F' }}>{campaign.assignee}</div>
                    </td>

                    {/* Day cells */}
                    {layout.map((cell) => {
                      if (cell === null) return null

                      const d = new Date(cell.date + 'T00:00:00')
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      const isTodayCell = cell.date === today
                      const isEditing = editingCell?.campaignId === campaign.id && editingCell.date === cell.date

                      if (!cell.entry) {
                        return (
                          <td
                            key={cell.date}
                            className={`day ${isTodayCell ? 'today-tint' : isWeekend ? 'weekend-tint' : ''}`}
                            style={{ height: 60, cursor: adminPassword ? 'pointer' : 'default' }}
                            onClick={() => adminPassword ? setEditingCell({ campaignId: campaign.id, date: cell.date, content: '' }) : undefined}
                          />
                        )
                      }

                      return (
                        <td
                          key={cell.date}
                          colSpan={cell.colSpan}
                          className="day"
                          style={{ padding: 6, verticalAlign: 'middle' }}
                          onClick={() => !isEditing && setEditingCell({ campaignId: campaign.id, date: cell.date, content: cell.entry!.content })}
                        >
                          {isEditing ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <textarea
                                autoFocus
                                value={editingCell!.content}
                                onChange={(e) => setEditingCell((p) => p ? { ...p, content: e.target.value } : null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                                  if (e.key === 'Escape') setEditingCell(null)
                                }}
                                style={{ width: '100%', fontSize: 12, border: '1px solid #B08F6E', borderRadius: 4, padding: '4px 6px', resize: 'none', outline: 'none', background: '#FFFAF3', color: '#2A2622', fontFamily: 'inherit' }}
                                rows={2}
                              />
                              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button onClick={saveEdit} disabled={saving} style={{ fontSize: 10.5, padding: '3px 8px', background: '#C00000', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
                                  {saving ? '…' : '存'}
                                </button>
                                <button onClick={() => setEditingCell(null)} style={{ fontSize: 10.5, padding: '3px 8px', background: '#F1E8DD', color: '#2A2622', border: '1px solid #D7CBBC', borderRadius: 3, cursor: 'pointer' }}>
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              borderLeft: `3px solid ${pal.eventAccent}`,
                              background: pal.eventBg,
                              borderRadius: 4,
                              padding: '8px 10px',
                              minHeight: 38,
                              display: 'flex', flexDirection: 'column', justifyContent: 'center',
                              boxShadow: '0 1px 0 rgba(42,38,34,0.04)',
                              cursor: 'default',
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: pal.eventInk, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                                {cell.entry.content}
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Legend ── */}
      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 11.5, color: '#7A7775' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 20px' }}>
          {LEGEND.map(({ label, dot }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>點擊格子可編輯（需密碼驗證）</span>
          <span style={{ color: '#B8B3AD' }}>·</span>
          <span className="num">資料來源：行銷 Excel · v2026.05</span>
        </div>
      </div>

    </div>
  )
}
