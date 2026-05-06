import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: '00991A — 行銷排程',
  description: '行銷素材排程管理系統',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="paper-bg min-h-screen antialiased">

        <header className="sticky top-0 z-30 backdrop-blur-sm"
                style={{ background: 'rgba(255,241,229,0.92)', borderBottom: '1px solid #E8DFD4' }}>
          <div className="topbar-rule" />
          <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-serif-tc text-[22px] font-bold tracking-tight" style={{ color: '#C00000' }}>
                復華投信
              </span>
              <span style={{ color: '#B8B3AD' }}>/</span>
              <span className="font-serif-tc text-[18px]" style={{ color: '#2A2622' }}>
                行銷排程系統
              </span>
            </div>
            <NavBar />
          </div>
        </header>

        <main className="max-w-[1280px] mx-auto px-6 py-8">
          {children}
        </main>

        <footer className="max-w-[1280px] mx-auto px-6 mt-10 pb-8">
          <div className="pt-6 flex items-center justify-between text-[11px]"
               style={{ borderTop: '1px solid #E8DFD4', color: '#7A7775' }}>
            <div className="flex items-center gap-2">
              <span className="font-serif-tc font-bold" style={{ color: '#C00000' }}>復華投信</span>
              <span style={{ color: '#B8B3AD' }}>·</span>
              <span>Fuh Hwa Securities Investment Trust</span>
            </div>
            <div className="num">© 2026 · Marketing Schedule System</div>
          </div>
        </footer>

      </body>
    </html>
  )
}
