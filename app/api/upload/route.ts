import { NextRequest, NextResponse } from 'next/server'
import { parseETFSheet, getSheetNames } from '@/lib/excel-parser'
import { saveScheduleData } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD
  const authHeader = req.headers.get('x-admin-password')
  if (password && authHeader !== password) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const sheetName = formData.get('sheetName') as string | null

  if (!file) {
    return NextResponse.json({ error: '請選擇檔案' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // If no sheet specified, return available sheets
  if (!sheetName) {
    const sheets = getSheetNames(buffer)
    return NextResponse.json({ sheets })
  }

  const data = parseETFSheet(buffer, sheetName)
  await saveScheduleData(data)

  return NextResponse.json({
    success: true,
    campaigns: data.campaigns.length,
    lastUpdated: data.lastUpdated,
  })
}
