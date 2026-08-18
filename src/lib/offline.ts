import { supabase } from './supabase'

export function isOnline(): boolean {
  return navigator.onLine
}

interface PendingComplete {
  taskId: string
  durationMinutes: number
  planDate: string
}

const KEY = 'poryadok_pending_completes'

function read(): PendingComplete[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PendingComplete[]
  } catch {
    return []
  }
}

function write(list: PendingComplete[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function queueComplete(op: PendingComplete) {
  write([...read(), op])
}

// Доотправляем отложенные выполнения при появлении сети
export async function flushPending(): Promise<void> {
  const list = read()
  if (list.length === 0) return

  const remaining: PendingComplete[] = []
  for (const op of list) {
    const now = new Date().toISOString()
    const results = await Promise.all([
      supabase.from('tasks').update({ last_completed_at: now }).eq('id', op.taskId),
      supabase
        .from('task_history')
        .insert({ task_id: op.taskId, duration_minutes: op.durationMinutes }),
      supabase.from('subtasks').update({ is_completed: true }).eq('task_id', op.taskId),
      supabase
        .from('daily_plans')
        .update({ is_completed: true })
        .eq('task_id', op.taskId)
        .eq('plan_date', op.planDate),
    ])
    if (results.some((r) => r.error)) remaining.push(op)
  }
  write(remaining)
}