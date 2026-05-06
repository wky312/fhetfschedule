import ScheduleViewer from '@/components/ScheduleViewer'

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export default function Home() {
  const today = new Date()
  const dateStr = today.toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
  const week = getISOWeek(today)

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: '#C00000' }}>
            ETF Marketing · 00991A
          </div>
          <h1 className="font-serif-tc font-bold" style={{ fontSize: 34, lineHeight: 1.15, color: '#2A2622' }}>
            本週行銷排程
          </h1>
          <p className="num text-sm mt-1.5" style={{ color: '#7A7775' }}>
            {dateStr} · W{week}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#7A7775' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <span>已同步</span>
        </div>
      </div>
      <ScheduleViewer />
    </div>
  )
}
