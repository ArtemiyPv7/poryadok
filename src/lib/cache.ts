import type { Room, TaskWithSubtasks } from '../types'
import type { DailyItem } from './daily'

interface Snapshot {
  rooms: Room[]
  tasks: TaskWithSubtasks[]
  daily: DailyItem[]
  savedAt: string
}

const KEY = 'poryadok_cache_v1'

export function readCache(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch {
    return null
  }
}

export function saveCache(partial: Partial<Snapshot>) {
  const prev = readCache()
  const next: Snapshot = {
    rooms: partial.rooms ?? prev?.rooms ?? [],
    tasks: partial.tasks ?? prev?.tasks ?? [],
    daily: partial.daily ?? prev?.daily ?? [],
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify(next))
}