'use client'

import { useState, useEffect } from 'react'
import type { Campaign, ScheduleData } from '@/lib/types'

const TYPE_COLORS: Record<string, string> = {
  製作: 'bg-purple-100 text-purple-800',
  新聞報導: 'bg-blue-100 text-blue-800',
  數位廣告: 'bg-green-100 text-green-800',
  KOL: 'bg-orange-100 text-orange-800',
  輿論: 'bg-pink-100 text-pink-800',
}

function getTypeColor(type: string) {
  for (const [key, cls] of Object.entries(TYPE_COLORS)) {
    if (type.includes(key)) return cls
  }
  return 'bg-gray-100 text-gray-800'
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: weekdays[d.getDay()],
    isWeekend: d.getDay() === 0 || d.getDay() === 6,
  }
}

function getDaysToShow(startOffset: number): string[] {
  const dates: string[] = []
  const base = new Date()
  base.setDate(base.getDate() + startOffset * 7)
  // Start from Monday of that week
  const dow = base.getDay()
  const monday = new Date(base)
  monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1))

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

type DayEntry = { campaign: Campaign; content: string }

export default function WeeklyDashboard() {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((d: ScheduleData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const days = getDaysToShow(weekOffset)

  const types = data
    ? Array.from(new Set(data.campaigns.map((c) => c.type).filter(Boolean)))
    : []

  function getEntriesForDay(date: string): DayEntry[] {
    if (!data) return []
    const entries: DayEntry[] = []
    data.campaigns.forEach((c) => {
      if (selectedType !== 'all' && !c.type.includes(selectedType)) return
      const entry = c.scheduleEntries.find((e) => e.date === date)
      if (entry) entries.push({ campaign: c, content: entry.content })
    })
    return entries
  }

  const today = new Date().toISOString().slice(0, 10)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">載入中...</div>
  }

  if (!data || data.campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
        <p className="text-lg">尚未上傳任何排程資料</p>
        <a href="/upload" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          立即上傳 Excel
        </a>
      </div>
    )
  }

  const weekLabel = weekOffset === 0 ? '本週' : weekOffset === 1 ? '下週' : weekOffset === -1 ? '上週' : `${weekOffset > 0 ? '+' : ''}${weekOffset} 週`

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            ‹ 上週
          </button>
          <span className="px-3 py-1.5 text-sm font-medium text-gray-900">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            下週 ›
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">篩選</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="all">全部類型</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-sm text-blue-600 hover:underline"
          >
            回到本週
          </button>
        )}
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((date) => {
          const { month, day, weekday, isWeekend } = formatDate(date)
          const entries = getEntriesForDay(date)
          const isToday = date === today

          return (
            <div
              key={date}
              className={`rounded-xl border p-3 min-h-[120px] ${
                isToday
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : isWeekend
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className={`flex items-baseline gap-1 mb-2 ${isToday ? 'text-blue-700' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                <span className="text-lg font-bold">{day}</span>
                <span className="text-xs">({weekday})</span>
                {month !== new Date().getMonth() + 1 && (
                  <span className="text-xs text-gray-400 ml-auto">{month}月</span>
                )}
                {isToday && <span className="ml-auto text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">今天</span>}
              </div>

              {entries.length === 0 ? (
                <p className="text-xs text-gray-400 mt-2">無排程</p>
              ) : (
                <div className="space-y-1.5">
                  {entries.map((e, i) => (
                    <div key={i} className="rounded-lg bg-white border border-gray-100 p-2 shadow-xs">
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getTypeColor(e.campaign.type)}`}>
                          {e.campaign.media}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 leading-snug">{e.content}</p>
                      {e.campaign.assignee && (
                        <p className="text-xs text-gray-400 mt-1">👤 {e.campaign.assignee}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
