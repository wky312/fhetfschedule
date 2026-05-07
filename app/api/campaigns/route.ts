import { NextRequest, NextResponse } from 'next/server'
import { addCampaign } from '@/lib/storage'
import type { Campaign } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<Campaign, 'id'>
    if (!body.type || !body.media) {
      return NextResponse.json({ error: '類型和媒體渠道為必填' }, { status: 400 })
    }

    const campaign: Campaign = {
      id: '',
      type: body.type,
      media: body.media,
      placement: body.placement ?? '',
      budget: body.budget ?? 0,
      vendor: body.vendor ?? '',
      assignee: body.assignee ?? '',
      scheduleEntries: body.scheduleEntries ?? [],
    }

    const id = await addCampaign(campaign)
    if (!id) return NextResponse.json({ error: '尚無排程資料，請先上傳 Excel' }, { status: 404 })

    return NextResponse.json({ success: true, id })
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
