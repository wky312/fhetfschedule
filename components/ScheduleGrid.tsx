'use client'

import { useState, useEffect, useRef } from 'react'
import type { Campaign, ScheduleData } from '@/lib/types'

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function formatHeaderDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    label: `${d.getMonth() + 1}/${d.getDate()}`,
    weekday: WEEKDAY_LABELS[d.getDay()],
    isWeekend: d.getDay() === 0 || d.getDay() === 6,
    isToday: dateStr === new Date().toISOString().slice(0, 10),
  }
}

type EditingCell = { campaignId: string; date: string; content: string }

export default function ScheduleGrid({ adminPassword }: { adminPassword?: string }) {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [allDates, setAllDates] = useState<string[]>([])
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((d: ScheduleData) => {
        setData(d)
        if (d.campaigns) {
          const dateSet = new Set<string>()
          d.campaigns.forEach((c) => c.scheduleEntries.forEach((e) => dateSet.add(e.date)))
          setAllDates(Array.from(dateSet).sort())
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  function getCellContent(campaign: Campaign, date: string) {
    return campaign.scheduleEntries.find((e) => e.date === date)?.content ?? ''
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/schedule', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(adminPassword ? { 'x-admin-password': adminPassword } : {}),
      },
      body: JSON.stringify({
        campaignId: editing.campaignId,
        date: editing.date,
        content: editing.content,
      }),
    })
    if (res.ok) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          campaigns: prev.campaigns.map((c) => {
            if (c.id !== editing.campaignId) return c
            const others = c.scheduleEntries.filter((e) => e.date !== editing.date)
            const entries = editing.content.trim()
              ? [...others, { date: editing.date, content: editing.content }]
              : others
            return { ...c, scheduleEntries: entries }
          }),
        }
      })
    }
    setSaving(false)
    setEditing(null)
  }

  function startEdit(campaign: Campaign, date: string) {
    setEditing({
      campaignId: campaign.id,
      date,
      content: getCellContent(campaign, date),
    })
  }

  if (loading) return <div className="text-center py-16 text-gray-500">載入中...</div>
  if (!data || data.campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>尚無資料，請先<a href="/upload" className="text-blue-600 hover:underline">上傳 Excel</a></p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap min-w-[80px]">類型</th>
            <th className="sticky left-[80px] z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap min-w-[100px]">媒體</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap min-w-[80px]">分工</th>
            {allDates.map((date) => {
              const { label, weekday, isWeekend, isToday } = formatHeaderDate(date)
              return (
                <th
                  key={date}
                  className={`px-2 py-2 text-center font-medium border-r border-gray-200 min-w-[80px] ${
                    isToday ? 'bg-blue-100 text-blue-700' : isWeekend ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  <div>{label}</div>
                  <div className="text-gray-400 font-normal">({weekday})</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.campaigns.map((campaign, i) => (
            <tr key={campaign.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
              <td className="sticky left-0 z-10 px-3 py-2 font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap bg-inherit">{campaign.type}</td>
              <td className="sticky left-[80px] z-10 px-3 py-2 text-gray-700 border-r border-gray-200 whitespace-nowrap bg-inherit max-w-[140px] truncate" title={campaign.media}>{campaign.media}</td>
              <td className="px-3 py-2 text-gray-500 border-r border-gray-200 whitespace-nowrap">{campaign.assignee}</td>
              {allDates.map((date) => {
                const isEditingThis = editing?.campaignId === campaign.id && editing.date === date
                const content = getCellContent(campaign, date)
                const { isWeekend, isToday } = formatHeaderDate(date)

                return (
                  <td
                    key={date}
                    onClick={() => !isEditingThis && startEdit(campaign, date)}
                    className={`px-2 py-1.5 border-r border-gray-100 align-top cursor-pointer ${
                      isToday ? 'bg-blue-50/40' : isWeekend ? 'bg-gray-50/70' : ''
                    } ${!isEditingThis && 'hover:bg-yellow-50'}`}
                  >
                    {isEditingThis ? (
                      <div className="flex flex-col gap-1">
                        <textarea
                          ref={textareaRef}
                          value={editing.content}
                          onChange={(e) => setEditing((prev) => prev ? { ...prev, content: e.target.value } : null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="w-full min-w-[100px] text-xs border border-blue-400 rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                          rows={3}
                        />
                        <div className="flex gap-1">
                          <button onClick={saveEdit} disabled={saving} className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                            {saving ? '…' : '存'}
                          </button>
                          <button onClick={() => setEditing(null)} className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-[32px] text-gray-700 whitespace-pre-wrap leading-snug">
                        {content || <span className="text-gray-200">—</span>}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
