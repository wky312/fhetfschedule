import { NextRequest, NextResponse } from 'next/server'
import { getVersionHistory, restoreVersion } from '@/lib/storage'

export async function GET() {
  try {
    const versions = await getVersionHistory()
    return NextResponse.json(versions)
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: '缺少版本 ID' }, { status: 400 })

    const ok = await restoreVersion(id)
    if (!ok) return NextResponse.json({ error: '找不到此版本（僅支援 Redis 儲存模式）' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
