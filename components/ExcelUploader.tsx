'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'

type Step = 'idle' | 'selecting-sheet' | 'uploading' | 'done' | 'error'

export default function ExcelUploader({ adminPassword }: { adminPassword: string }) {
  const [step, setStep] = useState<Step>('idle')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setStep('uploading')
    try {
      const form = new FormData()
      form.append('file', f)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword },
        body: form,
      })
      const json = await res.json() as { success?: boolean; campaigns?: number; sheets?: string[]; error?: string; lastUpdated?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? '上傳失敗')

      if (json.success) {
        // Single-sheet file: already parsed and saved in one request
        setMessage(`✓ 成功匯入 ${json.campaigns} 個活動項目`)
        setStep('done')
      } else {
        // Multiple sheets: let user pick
        setSheets(json.sheets ?? [])
        setSelectedSheet(json.sheets?.[0] ?? '')
        setStep('selecting-sheet')
      }
    } catch (e) {
      setMessage((e as Error).message)
      setStep('error')
    }
  }

  async function uploadToSheet(f: File, sheetName: string) {
    setStep('uploading')
    const form = new FormData()
    form.append('file', f)
    form.append('sheetName', sheetName)
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: form,
    })
    const json = await res.json() as { success?: boolean; campaigns?: number; error?: string }
    if (!res.ok || json.error) {
      setMessage(json.error ?? '上傳失敗')
      setStep('error')
    } else {
      setMessage(`✓ 成功匯入 ${json.campaigns} 個活動項目`)
      setStep('done')
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) handleFile(f)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  function reset() {
    setStep('idle')
    setFile(null)
    setSheets([])
    setSelectedSheet('')
    setMessage('')
  }

  return (
    <div className="space-y-4">
      {step === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-700 font-medium">拖曳 Excel 檔案至此</p>
          <p className="text-gray-400 text-sm mt-1">或點擊選擇檔案（.xlsx / .xls）</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      )}

      {step === 'uploading' && (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin text-3xl mb-3">⟳</div>
          <p>上傳並解析中，請稍候…</p>
          {file && <p className="text-sm text-gray-400 mt-1">{file.name}</p>}
        </div>
      )}

      {step === 'selecting-sheet' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="font-medium text-gray-800">選擇要匯入的工作表</p>
          {file && <p className="text-sm text-gray-500">檔案：{file.name}</p>}
          <div className="space-y-2">
            {sheets.map((s) => (
              <label key={s} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sheet"
                  value={s}
                  checked={selectedSheet === s}
                  onChange={() => setSelectedSheet(s)}
                  className="text-blue-500"
                />
                <span className="text-sm">{s}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => file && uploadToSheet(file, selectedSheet)}
              disabled={!selectedSheet}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              匯入
            </button>
            <button onClick={reset} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              取消
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-4">
          <p className="text-green-700 font-medium text-lg">{message}</p>
          <div className="flex justify-center gap-3">
            <a href="/" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              查看排程
            </a>
            <button onClick={reset} className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100">
              再次上傳
            </button>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <p className="text-red-600 font-medium">上傳失敗</p>
          <p className="text-red-500 text-sm">{message}</p>
          <button onClick={reset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            重試
          </button>
        </div>
      )}
    </div>
  )
}
