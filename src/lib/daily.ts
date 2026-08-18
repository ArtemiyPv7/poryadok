import { supabase } from './supabase'
import { computeRoomCleanliness } from './cleanliness'
import { isOnline, queueComplete } from './offline'
import { playCompleteEffects } from './settings'
import type { Subtask, Task, TaskWithSubtasks } from '../types'

export type Energy = 'low' | 'normal' | 'high'

export const ENERGY_BUDGET: Record<Energy, number> = {
  low: 15,
  normal: 30,
  high: 60,
}

export interface DailyItem {
  planId: string
  isCompleted: boolean
  task: TaskWithSubtasks
}

function localDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return (Date.now() - new Date(dateStr).getTime()) / 86400000
}

// Выполнена ли задача сегодня
export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

// Просрочена ли задача
export function isOverdue(task: Task): boolean {
  return daysSince(task.last_completed_at ?? task.created_at) / task.frequency_days >= 1
}

// Скоринг задачи (алгоритм v2)
function scoreTask(
  task: TaskWithSubtasks,
  energy: Energy,
  skippedYesterday: boolean,
  roomCleanliness: number | null,
  isWeekday: boolean,
): number {
  const days = daysSince(task.last_completed_at ?? task.created_at)
  const urgency = Math.min(days / task.frequency_days, 3)

  let score = urgency
  if (urgency >= 1) score += 0.5

  if (energy === 'low') {
    if (task.difficulty === 'easy') score += 0.3
    if (task.difficulty === 'hard') score -= 0.3
  }
  if (energy === 'high') {
    if (task.difficulty === 'hard') score += 0.3
    if (task.difficulty === 'easy') score -= 0.3
  }

  if (isWeekday && task.duration_minutes >= 20) score -= 0.2
  if (skippedYesterday) score -= 0.15
  if (roomCleanliness !== null) score += 0.3 * (1 - roomCleanliness / 100)

  return score
}

// Объективный приоритет для свободного режима (без энергии)
export function taskPriority(task: TaskWithSubtasks, roomCleanliness: number | null): number {
  const day = new Date().getDay()
  const isWeekday = day >= 1 && day <= 5
  return scoreTask(task, 'normal', false, roomCleanliness, isWeekday)
}

function selectTasks(
  candidates: TaskWithSubtasks[],
  scores: Map<string, number>,
  energy: Energy,
  maxCount: number,
  alreadyMinutes: number,
): TaskWithSubtasks[] {
  const sorted = [...candidates].sort(
    (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
  )

  const picked: TaskWithSubtasks[] = []
  const roomsUsed = new Set<string>()
  let timeLeft = ENERGY_BUDGET[energy] - alreadyMinutes

  for (const task of sorted) {
    if (picked.length >= maxCount) break
    if (roomsUsed.has(task.room_id)) continue
    if (task.duration_minutes > timeLeft) continue
    picked.push(task)
    roomsUsed.add(task.room_id)
    timeLeft -= task.duration_minutes
  }

  if (picked.length === 0 && sorted.length > 0) {
    picked.push(sorted[0])
  }

  return picked
}

async function fetchItemsForPlan(
  planRows: { id: string; task_id: string; is_completed: boolean }[],
): Promise<DailyItem[]> {
  if (planRows.length === 0) return []
  const ids = planRows.map((r) => r.task_id)
  const { data } = await supabase.from('tasks').select('*, subtasks(*)').in('id', ids)
  const tasks = (data ?? []) as TaskWithSubtasks[]
  return planRows
    .map((row) => ({
      planId: row.id,
      isCompleted: row.is_completed,
      task: tasks.find((t) => t.id === row.task_id)!,
    }))
    .filter((item) => Boolean(item.task))
}

async function generate(energy: Energy, completedIds: string[]): Promise<DailyItem[]> {
  const today = localDateStr(0)

  const [tasksRes, settingsRes, skippedRes] = await Promise.all([
    supabase.from('tasks').select('*, subtasks(*)'),
    supabase.from('user_settings').select('daily_tasks_count').limit(1).maybeSingle(),
    supabase
      .from('daily_plans')
      .select('task_id')
      .eq('plan_date', localDateStr(-1))
      .eq('is_completed', false),
  ])

  const allTasks = (tasksRes.data ?? []) as TaskWithSubtasks[]
  const maxCount = settingsRes.data?.daily_tasks_count ?? 3
  const skipped = new Set((skippedRes.data ?? []).map((r) => r.task_id))

  const byRoom = new Map<string, TaskWithSubtasks[]>()
  for (const t of allTasks) {
    byRoom.set(t.room_id, [...(byRoom.get(t.room_id) ?? []), t])
  }
  const cleanByRoom = new Map<string, number | null>()
  for (const [roomId, roomTasks] of byRoom) {
    cleanByRoom.set(roomId, computeRoomCleanliness(roomTasks))
  }

  const completedSet = new Set(completedIds)
  const alreadyMinutes = allTasks
    .filter((t) => completedSet.has(t.id))
    .reduce((sum, t) => sum + t.duration_minutes, 0)
  const candidates = allTasks.filter((t) => !completedSet.has(t.id) && !t.is_seasonal)

  const day = new Date().getDay()
  const isWeekday = day >= 1 && day <= 5

  const scores = new Map<string, number>()
  for (const t of candidates) {
    scores.set(
      t.id,
      scoreTask(t, energy, skipped.has(t.id), cleanByRoom.get(t.room_id) ?? null, isWeekday),
    )
  }

  const picked = selectTasks(candidates, scores, energy, maxCount, alreadyMinutes)

  if (picked.length > 0) {
    await supabase
      .from('subtasks')
      .update({ is_completed: false })
      .in('task_id', picked.map((t) => t.id))

    await supabase
      .from('daily_plans')
      .insert(picked.map((t) => ({ plan_date: today, task_id: t.id })))
  }

  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('plan_date', today)

  return fetchItemsForPlan(planRows ?? [])
}

export async function loadDailyPlan(energy: Energy): Promise<DailyItem[]> {
  const today = localDateStr(0)
  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('plan_date', today)

  if (planRows && planRows.length > 0) return fetchItemsForPlan(planRows)
  return generate(energy, [])
}

export async function regenerateDailyPlan(energy: Energy): Promise<DailyItem[]> {
  const today = localDateStr(0)
  const { data: planRows } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('plan_date', today)

  const completedIds = (planRows ?? []).filter((r) => r.is_completed).map((r) => r.task_id)

  await supabase
    .from('daily_plans')
    .delete()
    .eq('plan_date', today)
    .eq('is_completed', false)

  return generate(energy, completedIds)
}

// Общая функция выполнения: задача + история + подзадачи + дейлик на сегодня.
// Без сети — откладываем операцию до появления подключения.
export async function completeTask(task: Task): Promise<void> {
  const today = localDateStr(0)

  if (isOnline()) {
    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('tasks').update({ last_completed_at: now }).eq('id', task.id),
      supabase
        .from('task_history')
        .insert({ task_id: task.id, duration_minutes: task.duration_minutes }),
      supabase.from('subtasks').update({ is_completed: true }).eq('task_id', task.id),
      supabase
        .from('daily_plans')
        .update({ is_completed: true })
        .eq('task_id', task.id)
        .eq('plan_date', today),
    ])
  } else {
    queueComplete({
      taskId: task.id,
      durationMinutes: task.duration_minutes,
      planDate: today,
    })
  }

  playCompleteEffects()
}

export async function toggleSubtask(subtask: Subtask): Promise<boolean> {
  const next = !subtask.is_completed
  await supabase.from('subtasks').update({ is_completed: next }).eq('id', subtask.id)
  return next
}