import { supabase } from './supabase'
import { computeRoomCleanliness } from './cleanliness'
import { isToday, taskPriority } from './daily'
import type { Room, TaskWithSubtasks } from '../types'

export type ScenarioKind = 'one' | 'guests' | 'quick' | 'deep' | 'party'

export interface ScenarioResult {
  tasks: TaskWithSubtasks[]
  totalMinutes: number
}

// Комнаты, которые видят гости
const GUEST_ICONS = ['kitchen', 'living', 'hall', 'bath', 'shower']

interface ScenarioConfig {
  budget: number
  maxCount: number
  roomIcons?: string[]
}

const CONFIGS: Record<ScenarioKind, ScenarioConfig> = {
  one: { budget: Infinity, maxCount: 1 },
  guests: { budget: 20, maxCount: 4, roomIcons: GUEST_ICONS },
  quick: { budget: 15, maxCount: 3 },
  deep: { budget: 120, maxCount: 8 },
  party: { budget: 45, maxCount: 6, roomIcons: ['kitchen', 'living', 'hall'] },
}

export async function buildScenario(kind: ScenarioKind): Promise<ScenarioResult> {
  const config = CONFIGS[kind]

  const [roomsRes, tasksRes] = await Promise.all([
    supabase.from('rooms').select('*'),
    supabase.from('tasks').select('*, subtasks(*)'),
  ])

  const rooms = (roomsRes.data ?? []) as Room[]
  const tasks = (tasksRes.data ?? []) as TaskWithSubtasks[]

  const roomById = new Map(rooms.map((r) => [r.id, r]))

  const cleanByRoom = new Map<string, number | null>()
  for (const room of rooms) {
    cleanByRoom.set(
      room.id,
      computeRoomCleanliness(tasks.filter((t) => t.room_id === room.id)),
    )
  }

  // Кандидаты: не сезонные, не выполненные сегодня, при необходимости — по комнатам
  let candidates = tasks.filter((t) => !t.is_seasonal && !isToday(t.last_completed_at))
  if (config.roomIcons) {
    candidates = candidates.filter((t) => {
      const room = roomById.get(t.room_id)
      return room !== undefined && config.roomIcons!.includes(room.icon)
    })
  }

  const scored = candidates
    .map((t) => ({ t, score: taskPriority(t, cleanByRoom.get(t.room_id) ?? null) }))
    .sort((a, b) => b.score - a.score)

  const picked: TaskWithSubtasks[] = []
  let timeLeft = config.budget

  for (const { t } of scored) {
    if (picked.length >= config.maxCount) break
    if (t.duration_minutes > timeLeft) continue
    picked.push(t)
    timeLeft -= t.duration_minutes
  }

  // Для "одной задачи" берём топ в любом случае
  if (picked.length === 0 && kind === 'one' && scored.length > 0) {
    picked.push(scored[0].t)
  }

  return {
    tasks: picked,
    totalMinutes: picked.reduce((sum, t) => sum + t.duration_minutes, 0),
  }
}