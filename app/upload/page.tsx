'use client'

import { useState } from 'react'
import ExcelUploader from '@/components/ExcelUploader'
import VersionHistory from '@/components/VersionHistory'

export default function UploadPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(
    // If no admin password is set, skip auth
    process.env.NEXT_PUBLIC_REQUIRE_PASSWORD !== 'true'
  )

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-16 space-y-5">
        <h1 className="text-xl font-bold text-gray-900">管理員登入</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <label className="block">
            <span className="text-sm text-gray-600">密碼</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setAuthenticated(true)}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="輸入管理密碼"
              autoFocus
            />
          </label>
          <button
            onClick={() => setAuthenticated(true)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            登入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">上傳排程 Excel</h1>
        <p className="text-sm text-gray-500 mt-1">
          上傳更新後的 Excel 檔案，系統將自動解析並更新排程資料。
        </p>
      </div>

      <ExcelUploader adminPassword={password} />

      <div style={{ background: '#FEF9E8', border: '1px solid #E8D98A', borderRadius: 8, padding: '14px 18px', fontSize: 13, color: '#7A6A20' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>注意事項</div>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>上傳新 Excel 後，舊的排程資料將被覆蓋</li>
          <li>若已在網頁上直接編輯了部分排程，上傳後這些變更將遺失</li>
          <li>上傳前系統會自動備份目前版本，可從下方版本紀錄還原</li>
        </ul>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2A2622', marginBottom: 14 }}>版本紀錄</div>
        <VersionHistory />
      </div>
    </div>
  )
}
