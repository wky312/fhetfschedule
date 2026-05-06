import { NextResponse } from 'next/server'
import { getScheduleData } from '@/lib/storage'
import { exportToExcel } from '@/lib/excel-parser'

export async function GET() {
  const data = await getScheduleData()
  if (!data) {
    return NextResponse.json({ error: '尚無資料' }, { status: 404 })
  }

  const buffer = exportToExcel(data)
  const filename = `ETF排程_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
