'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '/',           label: '本週排程', short: '本週' },
  { href: '/schedule',   label: '完整月曆', short: '月曆' },
  { href: '/upload',     label: '上傳 Excel', short: '上傳' },
  { href: '/api/export', label: '匯出', short: '匯出' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const margin = isMobile ? '0 6px' : '0 14px'
  const fontSize = isMobile ? 12 : 13

  return (
    <nav style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
      {NAV_LINKS.map(({ href, label, short }) => {
        const active = pathname === href
        return (
          <a
            key={href}
            href={href}
            style={{
              padding: '6px 0',
              margin,
              fontSize,
              fontWeight: 500,
              textDecoration: 'none',
              color: active ? '#C00000' : '#4D4D4F',
              position: 'relative',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isMobile ? short : label}
            {active && (
              <span style={{
                position: 'absolute',
                left: 0, right: 0, bottom: -14,
                height: 2,
                background: '#C00000',
                display: 'block',
              }} />
            )}
          </a>
        )
      })}
      {!isMobile && (
        <div style={{
          marginLeft: 20,
          width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
          background: '#B08F6E', color: '#FFF1E5',
          flexShrink: 0,
        }}>
          YR
        </div>
      )}
    </nav>
  )
}
