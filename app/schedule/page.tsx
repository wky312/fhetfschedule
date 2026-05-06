import ScheduleViewer from '@/components/ScheduleViewer'

export default function SchedulePage() {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: '#C00000' }}>
          ETF Marketing · 00991A
        </div>
        <h1 className="font-serif-tc font-bold" style={{ fontSize: 34, lineHeight: 1.15, color: '#2A2622' }}>
          完整排程月曆
        </h1>
        <p className="text-sm mt-1.5" style={{ color: '#7A7775' }}>可切換週視圖 / 月視圖</p>
      </div>
      <ScheduleViewer defaultView="month" />
    </div>
  )
}
