'use client'

import { useState, useEffect } from 'react'
import type { VersionMeta } from '@/lib/types'

export default function VersionHistory() {
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/versions')
      .then((r) => r.json())
      .then((v: VersionMeta[]) => { setVersions(Array.isArray(v) ? v : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function restore(id: string) {
    setRestoring(id)
    setMessage('')
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (json.success) {
        setMessage('✓ 已還原，請重新整理頁面查看排程')
        // Refresh list (current version is now archived)
        const updated = await fetch('/api/versions').then((r) => r.json()) as VersionMeta[]
        setVersions(Array.isArray(updated) ? updated : [])
      } else {
        setMessage(json.error ?? '還原失敗')
      }
    } catch {
      setMessage('網路錯誤，請重試')
    }
    setRestoring(null)
  }

  if (loading) return null
  if (!versions.length) return (
    <div style={{ fontSize: 13, color: '#B8B3AD', padding: '12px 0' }}>尚無版本紀錄（下次上傳後會自動建立）</div>
  )

  return (
    <div>
      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13,
          background: message.startsWith('✓') ? '#EEF2EA' : '#FBEDED',
          color: message.startsWith('✓') ? '#3F5238' : '#8E0000',
          border: `1px solid ${message.startsWith('✓') ? '#C9D4C5' : '#EFC9C9'}`,
        }}>
          {message}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid #E8DFD4', borderRadius: 6, overflow: 'hidden' }}>
        {versions.map((v, idx) => {
          const dt = new Date(v.uploadedAt)
          const dateStr = dt.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          return (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: idx % 2 === 0 ? '#FFFAF3' : '#FAF4EC',
              borderBottom: idx < versions.length - 1 ? '1px solid #EDE3D6' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2A2622', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.sourceFile}
                </div>
                <div style={{ fontSize: 11, color: '#7A7775', marginTop: 2 }}>
                  {dateStr} · {v.campaignCount} 個項目
                </div>
              </div>
              <button
                onClick={() => restore(v.id)}
                disabled={restoring === v.id}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 4,
                  border: '1px solid #D7CBBC', background: '#FFFAF3', color: '#4D4D4F',
                  cursor: restoring === v.id ? 'default' : 'pointer',
                  opacity: restoring === v.id ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {restoring === v.id ? '還原中…' : '還原'}
              </button>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: '#B8B3AD', marginTop: 8 }}>最多保留 10 個版本 · 還原前會自動備份目前資料</div>
    </div>
  )
}
