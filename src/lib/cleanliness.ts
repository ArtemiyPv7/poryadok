import type { Task } from '../types'

// Свежесть задачи: 1.0 — только что, 0 — просрочено
export function taskFreshness(task: Task): number {
  const ref = task.last_completed_at ?? task.created_at
  const days = (Date.now() - new Date(ref).getTime()) / 86400000
  return Math.max(0, 1 - days / task.frequency_days)
}

// Чистота комнаты: средневзвешенное по времени задач, в процентах
export function computeRoomCleanliness(tasks: Task[]): number | null {
  const regular = tasks.filter((t) => !t.is_seasonal)
  if (regular.length === 0) return null
  const totalMinutes = regular.reduce((sum, t) => sum + t.duration_minutes, 0)
  if (totalMinutes === 0) return null
  const weighted = regular.reduce(
    (sum, t) => sum + taskFreshness(t) * t.duration_minutes,
    0,
  )
  return Math.round((weighted / totalMinutes) * 100)
}

export function cleanlinessBarClass(value: number): string {
  if (value >= 70) return 'bg-forest-500'
  if (value >= 40) return 'bg-accent-peach'
  return 'bg-accent-orange'
}

export function cleanlinessTextClass(value: number): string {
  if (value >= 70) return 'text-forest-700'
  if (value >= 40) return 'text-neutral-700'
  return 'text-accent-orange'
}