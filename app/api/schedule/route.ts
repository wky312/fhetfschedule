import { NextRequest, NextResponse } from 'next/server'
import { getScheduleData, updateScheduleEntry } from '@/lib/storage'

export async function GET() {
  const data = await getScheduleData()
  if (!data) {
    return NextResponse.json({ campaigns: [], lastUpdated: null, sourceFile: null })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD
  const authHeader = req.headers.get('x-admin-password')
  if (password && authHeader !== password) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 })
  }

  const body = await req.json() as { campaignId: string; date: string; content: string }
  const { campaignId, date, content } = body

  if (!campaignId || !date) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const ok = await updateScheduleEntry(campaignId, date, content ?? '')
  if (!ok) {
    return NextResponse.json({ error: '找不到對應的活動' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
