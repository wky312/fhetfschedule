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
  type EditingState = {
    campaignId: string
    label: string    // for modal title
    oldDate: string  // '' = new entry, otherwise original start date
    startDate: string
    endDate: string
    content: string
  }
  const [editingCell, setEditingCell] = useState<EditingState | null>(null)

  type NewCampaignState = {
    type: string; media: string; placement: string; assignee: string
    startDate: string; endDate: string; content: string
  }
  const [newCampaign, setNewCampaign] = useState<NewCampaignState | null>(null)
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDay, setSelectedDay] = useState(today)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  async function saveNewCampaign() {
    if (!newCampaign) return
    setSaving(true)
    try {
      const { type, media, placement, assignee, startDate, endDate, content } = newCampaign
      const newEndDate = endDate !== startDate ? endDate : undefined
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, media, placement, assignee, budget: 0, vendor: '',
          scheduleEntries: content.trim()
            ? [{ date: startDate, ...(newEndDate ? { endDate: newEndDate } : {}), content }]
            : [],
        }),
      })
      const json = await res.json() as { success?: boolean; id?: string; error?: string }
      if (json.success && json.id) {
        setData((prev) => prev ? {
          ...prev,
          campaigns: [...prev.campaigns, {
            id: json.id!, type, media, placement, budget: 0, vendor: '', assignee,
            scheduleEntries: content.trim()
              ? [{ date: startDate, ...(newEndDate ? { endDate: newEndDate } : {}), content }]
              : [],
          }],
        } : prev)
        setNewCampaign(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editingCell) return
    setSaving(true)
    const { campaignId, oldDate, startDate, endDate, content } = editingCell
    const newEndDate = endDate !== startDate ? endDate : undefined
    await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(adminPassword ? { 'x-admin-password': adminPassword } : {}) },
      body: JSON.stringify({ campaignId, oldDate, date: startDate, endDate: newEndDate, content }),
    })
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        campaigns: prev.campaigns.map((c) => {
          if (c.id !== campaignId) return c
          const others = c.scheduleEntries.filter((e) => e.date !== oldDate)
          const updated = content.trim()
            ? [...others, { date: startDate, ...(newEndDate ? { endDate: newEndDate } : {}), content }]
            : others
          return { ...c, scheduleEntries: updated }
        }),
      }
    })
    setSaving(false)
    setEditingCell(null)
  }

  // ── Mobile view ───────────────────────────────────────────────────────────
  if (isMobile && data && data.campaigns.length > 0) {
    const visibleDays = viewMode === 'week' ? getWeekDays(weekOffset) : getAllDatesInData(data.campaigns)

    const eventsForDay = data.campaigns.flatMap((campaign) => {
      const entry = campaign.scheduleEntries.find((e) => {
        const end = e.endDate || e.date
        return e.date <= selectedDay && end >= selectedDay
      })
      return entry ? [{ campaign, entry }] : []
    })

    function openDayAdd() {
      setEditingCell({ campaignId: '', label: '', oldDate: '', startDate: selectedDay, endDate: selectedDay, content: '' })
      setNewCampaign({ type: '數位廣告', media: '', placement: '', assignee: '', startDate: selectedDay, endDate: selectedDay, content: '' })
    }

    const dayFmt = new Date(selectedDay + 'T00:00:00').toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })

    return (
      <div>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'inline-flex', border: '1px solid #D7CBBC', borderRadius: 4, overflow: 'hidden', background: '#FFFAF3' }}>
            {(['week', 'month'] as ViewMode[]).map((m, idx) => (
              <button key={m} onClick={() => { setViewMode(m); if (m === 'week') { const d = getWeekDays(weekOffset); if (!d.includes(selectedDay)) setSelectedDay(d[0]) } }}
                style={{ fontSize: 12, fontWeight: 500, padding: '7px 14px', cursor: 'pointer', background: viewMode === m ? '#2A2622' : 'transparent', color: viewMode === m ? '#FFF1E5' : '#4D4D4F', border: 'none', borderLeft: idx > 0 ? '1px solid #D7CBBC' : 'none' }}>
                {m === 'week' ? '週視圖' : '月視圖'}
              </button>
            ))}
          </div>

          {/* Week nav */}
          {viewMode === 'week' && (
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #D7CBBC', borderRadius: 4, overflow: 'hidden', background: '#FFFAF3' }}>
              <button onClick={() => { const o = weekOffset - 1; setWeekOffset(o); setSelectedDay(getWeekDays(o)[0]) }}
                style={{ padding: '7px 14px', fontSize: 15, color: '#4D4D4F', background: 'transparent', border: 'none', borderRight: '1px solid #D7CBBC', cursor: 'pointer', lineHeight: 1 }}>‹</button>
              <span style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#2A2622', whiteSpace: 'nowrap' }}>
                {fmtMD(visibleDays[0])} – {fmtMD(visibleDays[6])}
              </span>
              <button onClick={() => { const o = weekOffset + 1; setWeekOffset(o); setSelectedDay(getWeekDays(o)[0]) }}
                style={{ padding: '7px 14px', fontSize: 15, color: '#4D4D4F', background: 'transparent', border: 'none', borderLeft: '1px solid #D7CBBC', cursor: 'pointer', lineHeight: 1 }}>›</button>
            </div>
          )}

          <button onClick={() => setNewCampaign({ type: '數位廣告', media: '', placement: '', assignee: '', startDate: selectedDay, endDate: selectedDay, content: '' })}
            style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 4, border: '1px solid #B08F6E', background: '#F8F1E6', color: '#5E4A36', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ＋ 新增
          </button>
        </div>

        {/* Day strip */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: 4, paddingBottom: 10, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {visibleDays.map((date) => {
            const d = new Date(date + 'T00:00:00')
            const isSelected = date === selectedDay
            const isToday = date === today
            const hasEv = data.campaigns.some((c) => c.scheduleEntries.some((e) => {
              const end = e.endDate || e.date; return e.date <= date && end >= date
            }))
            const btnW = viewMode === 'week' ? 42 : 36
            return (
              <button key={date} onClick={() => setSelectedDay(date)} style={{
                flexShrink: 0, width: btnW, padding: '7px 2px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isSelected ? '#2A2622' : isToday ? '#FBEDED' : 'transparent',
                color: isSelected ? '#FFF1E5' : isToday ? '#C00000' : '#4D4D4F',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>{WEEKDAYS_EN[d.getDay()].slice(0, 1)}</span>
                <span style={{ fontSize: viewMode === 'week' ? 17 : 14, fontWeight: 700, lineHeight: 1.1 }}>{d.getDate()}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: hasEv && !isSelected ? '#C00000' : 'transparent', display: 'block' }} />
              </button>
            )
          })}
        </div>

        {/* Selected day header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 10px', paddingTop: 10, borderTop: '1px solid #E8DFD4' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#2A2622' }}>{dayFmt}</span>
          <span style={{ fontSize: 12, color: '#B8B3AD' }}>{eventsForDay.length} 項排程</span>
        </div>

        {/* Event cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {eventsForDay.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#B8B3AD', fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>這天沒有排程</div>
              <button onClick={openDayAdd}
                style={{ fontSize: 12, fontWeight: 500, padding: '7px 16px', borderRadius: 4, border: '1px solid #D7CBBC', background: '#FFFAF3', color: '#4D4D4F', cursor: 'pointer' }}>
                ＋ 新增這天的排程
              </button>
            </div>
          ) : (
            eventsForDay.map(({ campaign, entry }) => {
              const pal = getPalette(campaign.type)
              return (
                <div key={campaign.id}
                  onClick={() => setEditingCell({ campaignId: campaign.id, label: `${campaign.media} · ${campaign.type.replace(/\s*\([^)]*\)/, '').trim()}`, oldDate: entry.date, startDate: entry.date, endDate: entry.endDate ?? entry.date, content: entry.content })}
                  style={{ borderLeft: `3px solid ${pal.eventAccent}`, background: pal.eventBg, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: pal.chipBg, color: pal.chipColor }}>
                      {campaign.type.replace(/\s*\([^)]*\)/, '').trim()}
                    </span>
                    {campaign.assignee && <span style={{ fontSize: 11, color: '#7A7775' }}>{campaign.assignee}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MicoIcon media={campaign.media} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#2A2622' }}>{campaign.media}</span>
                    {campaign.placement && <span style={{ fontSize: 11, color: '#7A7775', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {campaign.placement}</span>}
                  </div>
                  {entry.content && (
                    <div style={{ fontSize: 13, color: pal.eventInk, lineHeight: 1.5 }}>{entry.content}</div>
                  )}
                  {entry.endDate && entry.endDate !== entry.date && (
                    <div style={{ fontSize: 11, color: '#7A7775' }}>
                      {fmtMD(entry.date)} – {fmtMD(entry.endDate)}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Modals (reuse same modals as desktop) */}
        {newCampaign && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,34,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setNewCampaign(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFAF3', borderRadius: '12px 12px 0 0', padding: '20px 20px 32px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(42,38,34,0.2)' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D7CBBC', margin: '0 auto 20px' }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: '#2A2622', marginBottom: 16 }}>新增排程項目</div>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>類型 *</div>
                <select value={newCampaign.type} onChange={(e) => setNewCampaign((p) => p ? { ...p, type: e.target.value } : null)}
                  style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none' }}>
                  {['製作', '新聞報導', '數位廣告', 'KOL', '輿論'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>媒體 / 渠道 *</div>
                <input type="text" value={newCampaign.media} onChange={(e) => setNewCampaign((p) => p ? { ...p, media: e.target.value } : null)}
                  placeholder="例：Facebook / Instagram"
                  style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>版位</div>
                  <input type="text" value={newCampaign.placement} onChange={(e) => setNewCampaign((p) => p ? { ...p, placement: e.target.value } : null)}
                    style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>分工</div>
                  <input type="text" value={newCampaign.assignee} onChange={(e) => setNewCampaign((p) => p ? { ...p, assignee: e.target.value } : null)}
                    placeholder="負責人"
                    style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>開始日期</div>
                  <input type="date" value={newCampaign.startDate} onChange={(e) => { const s = e.target.value; setNewCampaign((p) => p ? { ...p, startDate: s, endDate: p.endDate < s ? s : p.endDate } : null) }}
                    style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>結束日期</div>
                  <input type="date" value={newCampaign.endDate} min={newCampaign.startDate} onChange={(e) => setNewCampaign((p) => p ? { ...p, endDate: e.target.value } : null)}
                    style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
              </div>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>內容說明</div>
                <textarea value={newCampaign.content} onChange={(e) => setNewCampaign((p) => p ? { ...p, content: e.target.value } : null)} rows={3}
                  style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', resize: 'none', outline: 'none', background: '#fff', color: '#2A2622', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </label>
              <button onClick={saveNewCampaign} disabled={saving || !newCampaign.media.trim()}
                style={{ width: '100%', fontSize: 15, fontWeight: 700, padding: '13px', borderRadius: 8, border: 'none', background: '#C00000', color: '#fff', cursor: (saving || !newCampaign.media.trim()) ? 'default' : 'pointer', opacity: (saving || !newCampaign.media.trim()) ? 0.6 : 1 }}>
                {saving ? '新增中…' : '新增'}
              </button>
            </div>
          </div>
        )}

        {editingCell && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,34,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEditingCell(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFAF3', borderRadius: '12px 12px 0 0', padding: '20px 20px 32px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(42,38,34,0.2)' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D7CBBC', margin: '0 auto 20px' }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: '#2A2622', marginBottom: 4 }}>{editingCell.oldDate ? '編輯排程' : '新增排程'}</div>
              {editingCell.label && <div style={{ fontSize: 13, color: '#7A7775', marginBottom: 16 }}>{editingCell.label}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>開始日期</div>
                  <input type="date" value={editingCell.startDate} onChange={(e) => { const s = e.target.value; setEditingCell((p) => p ? { ...p, startDate: s, endDate: p.endDate < s ? s : p.endDate } : null) }}
                    style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>結束日期</div>
                  <input type="date" value={editingCell.endDate} min={editingCell.startDate} onChange={(e) => setEditingCell((p) => p ? { ...p, endDate: e.target.value } : null)}
                    style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
              </div>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>內容說明</div>
                <textarea autoFocus value={editingCell.content} onChange={(e) => setEditingCell((p) => p ? { ...p, content: e.target.value } : null)} rows={3}
                  style={{ width: '100%', fontSize: 14, border: '1px solid #D7CBBC', borderRadius: 8, padding: '10px 12px', resize: 'none', outline: 'none', background: '#fff', color: '#2A2622', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </label>
              <div style={{ fontSize: 11, color: '#B8B3AD', marginBottom: 16 }}>清空內容並儲存可刪除此排程</div>
              <button onClick={saveEdit} disabled={saving}
                style={{ width: '100%', fontSize: 15, fontWeight: 700, padding: '13px', borderRadius: 8, border: 'none', background: '#C00000', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
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

        <button
          onClick={() => setNewCampaign({ type: '數位廣告', media: '', placement: '', assignee: '', startDate: today, endDate: today, content: '' })}
          style={{ fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 4, border: '1px solid #B08F6E', background: '#F8F1E6', color: '#5E4A36', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ＋ 新增排程項目
        </button>

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
                const rowLabel = `${campaign.media} · ${campaign.type.replace(/\s*\([^)]*\)/, '').trim()}`

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

                      if (!cell.entry) {
                        return (
                          <td
                            key={cell.date}
                            className={`day ${isTodayCell ? 'today-tint' : isWeekend ? 'weekend-tint' : ''}`}
                            style={{ height: 60, cursor: 'pointer' }}
                            onClick={() => setEditingCell({ campaignId: campaign.id, label: rowLabel, oldDate: '', startDate: cell.date, endDate: cell.date, content: '' })}
                          />
                        )
                      }

                      return (
                        <td
                          key={cell.date}
                          colSpan={cell.colSpan}
                          className="day"
                          style={{ padding: 6, verticalAlign: 'middle', cursor: 'pointer' }}
                          onClick={() => setEditingCell({
                            campaignId: campaign.id,
                            label: rowLabel,
                            oldDate: cell.entry!.date,
                            startDate: cell.entry!.date,
                            endDate: cell.entry!.endDate ?? cell.entry!.date,
                            content: cell.entry!.content,
                          })}
                        >
                          <div style={{
                            borderLeft: `3px solid ${pal.eventAccent}`,
                            background: pal.eventBg,
                            borderRadius: 4,
                            padding: '8px 10px',
                            minHeight: 38,
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            boxShadow: '0 1px 0 rgba(42,38,34,0.04)',
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: pal.eventInk, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                              {cell.entry.content}
                            </div>
                          </div>
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
          <span>點擊格子可編輯</span>
          <span style={{ color: '#B8B3AD' }}>·</span>
          <span className="num">資料來源：行銷 Excel · v2026.05</span>
        </div>
      </div>

      {/* ── New Campaign Modal ── */}
      {newCampaign && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,34,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setNewCampaign(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFAF3', border: '1px solid #D7CBBC', borderRadius: 8, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(42,38,34,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7A7775', marginBottom: 4 }}>新增排程項目</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2A2622' }}>填寫媒體渠道資訊與排程時間</div>
            </div>

            {/* 類型 */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>類型 *</div>
              <select
                value={newCampaign.type}
                onChange={(e) => setNewCampaign((p) => p ? { ...p, type: e.target.value } : null)}
                style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }}
              >
                {['製作', '新聞報導', '數位廣告', 'KOL', '輿論'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            {/* 媒體渠道 */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>媒體 / 渠道 *</div>
              <input
                type="text"
                value={newCampaign.media}
                onChange={(e) => setNewCampaign((p) => p ? { ...p, media: e.target.value } : null)}
                placeholder="例：Facebook / Instagram、LINE官方帳號"
                style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }}
              />
            </label>

            {/* 版位 & 分工 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <label>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>版位</div>
                <input type="text" value={newCampaign.placement} onChange={(e) => setNewCampaign((p) => p ? { ...p, placement: e.target.value } : null)}
                  style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>分工</div>
                <input type="text" value={newCampaign.assignee} onChange={(e) => setNewCampaign((p) => p ? { ...p, assignee: e.target.value } : null)}
                  placeholder="負責人"
                  style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
              </label>
            </div>

            <div style={{ borderTop: '1px solid #E8DFD4', margin: '16px 0', paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#7A7775', marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>初始排程（可選）</div>

              {/* 日期 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>開始日期</div>
                  <input type="date" value={newCampaign.startDate}
                    onChange={(e) => { const s = e.target.value; setNewCampaign((p) => p ? { ...p, startDate: s, endDate: p.endDate < s ? s : p.endDate } : null) }}
                    style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
                <label>
                  <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>結束日期</div>
                  <input type="date" value={newCampaign.endDate} min={newCampaign.startDate}
                    onChange={(e) => setNewCampaign((p) => p ? { ...p, endDate: e.target.value } : null)}
                    style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }} />
                </label>
              </div>

              {/* 內容 */}
              <label>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>內容說明</div>
                <textarea value={newCampaign.content} onChange={(e) => setNewCampaign((p) => p ? { ...p, content: e.target.value } : null)}
                  style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '8px 10px', resize: 'vertical', outline: 'none', background: '#fff', color: '#2A2622', fontFamily: 'inherit', minHeight: 64, boxSizing: 'border-box' }}
                  rows={2} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setNewCampaign(null)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 4, border: '1px solid #D7CBBC', background: 'transparent', color: '#4D4D4F', cursor: 'pointer' }}>取消</button>
              <button onClick={saveNewCampaign} disabled={saving || !newCampaign.media.trim()}
                style={{ fontSize: 12, padding: '7px 18px', borderRadius: 4, border: 'none', background: '#C00000', color: '#fff', cursor: (saving || !newCampaign.media.trim()) ? 'default' : 'pointer', opacity: (saving || !newCampaign.media.trim()) ? 0.6 : 1, fontWeight: 600 }}>
                {saving ? '新增中…' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingCell && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,34,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditingCell(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FFFAF3', border: '1px solid #D7CBBC', borderRadius: 8, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(42,38,34,0.25)' }}
          >
            {/* Modal header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7A7775', marginBottom: 4 }}>
                {editingCell.oldDate ? '編輯排程' : '新增排程'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2A2622' }}>{editingCell.label}</div>
            </div>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <label>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>開始日期</div>
                <input
                  type="date"
                  value={editingCell.startDate}
                  onChange={(e) => {
                    const s = e.target.value
                    setEditingCell((p) => p ? { ...p, startDate: s, endDate: p.endDate < s ? s : p.endDate } : null)
                  }}
                  style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }}
                />
              </label>
              <label>
                <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>結束日期</div>
                <input
                  type="date"
                  value={editingCell.endDate}
                  min={editingCell.startDate}
                  onChange={(e) => setEditingCell((p) => p ? { ...p, endDate: e.target.value } : null)}
                  style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '7px 8px', background: '#fff', color: '#2A2622', outline: 'none', boxSizing: 'border-box' }}
                />
              </label>
            </div>

            {/* Content */}
            <label>
              <div style={{ fontSize: 11, color: '#7A7775', marginBottom: 4 }}>內容說明</div>
              <textarea
                autoFocus
                value={editingCell.content}
                onChange={(e) => setEditingCell((p) => p ? { ...p, content: e.target.value } : null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                  if (e.key === 'Escape') setEditingCell(null)
                }}
                style={{ width: '100%', fontSize: 13, border: '1px solid #D7CBBC', borderRadius: 4, padding: '8px 10px', resize: 'vertical', outline: 'none', background: '#fff', color: '#2A2622', fontFamily: 'inherit', minHeight: 80, boxSizing: 'border-box' }}
                rows={3}
              />
            </label>
            <div style={{ fontSize: 10.5, color: '#B8B3AD', marginTop: 5 }}>Enter 儲存 · Esc 關閉 · 清空內容儲存可刪除此項目</div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingCell(null)}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 4, border: '1px solid #D7CBBC', background: 'transparent', color: '#4D4D4F', cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{ fontSize: 12, padding: '7px 18px', borderRadius: 4, border: 'none', background: '#C00000', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontWeight: 600 }}
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
