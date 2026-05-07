import fs from 'fs/promises'
import path from 'path'
import type { ScheduleData } from './types'

// On Vercel, process.cwd() is read-only; /tmp is the only writable dir.
// Without Redis, data won't survive cold starts — configure Upstash for persistence.
const DATA_FILE = process.env.VERCEL
  ? '/tmp/schedule.json'
  : path.join(process.cwd(), 'data', 'schedule.json')

async function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const { Redis } = await import('@upstash/redis')
  return new Redis({ url, token })
}

export async function getScheduleData(): Promise<ScheduleData | null> {
  const redis = await getRedis()
  if (redis) {
    return await redis.get<ScheduleData>('etf_schedule')
  }
  try {
    const json = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(json) as ScheduleData
  } catch {
    return null
  }
}

export async function saveScheduleData(data: ScheduleData): Promise<void> {
  const redis = await getRedis()
  if (redis) {
    await redis.set('etf_schedule', data)
    return
  }
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function updateScheduleEntry(
  campaignId: string,
  oldDate: string,
  date: string,
  endDate: string | undefined,
  content: string
): Promise<boolean> {
  const data = await getScheduleData()
  if (!data) return false

  const campaign = data.campaigns.find((c) => c.id === campaignId)
  if (!campaign) return false

  // Remove the old entry (whether we're updating it or deleting it)
  campaign.scheduleEntries = campaign.scheduleEntries.filter((e) => e.date !== oldDate)

  // Add the updated entry if content is non-empty
  if (content.trim()) {
    campaign.scheduleEntries.push({
      date,
      ...(endDate && endDate !== date ? { endDate } : {}),
      content,
    })
  }

  data.lastUpdated = new Date().toISOString()
  await saveScheduleData(data)
  return true
}
