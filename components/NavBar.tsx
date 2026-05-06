'use client'

import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',           label: '本週排程' },
  { href: '/schedule',   label: '完整月曆' },
  { href: '/upload',     label: '上傳 Excel' },
  { href: '/api/export', label: '匯出' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav style={{ display: 'flex', alignItems: 'center' }}>
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <a
            key={href}
            href={href}
            style={{
              padding: '6px 0',
              margin: '0 14px',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              color: active ? '#C00000' : '#4D4D4F',
              position: 'relative',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
            {active && (
              <span style={{
                position: 'absolute',
                left: 0, right: 0, bottom: -17,
                height: 2,
                background: '#C00000',
                display: 'block',
              }} />
            )}
          </a>
        )
      })}
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
    </nav>
  )
}
