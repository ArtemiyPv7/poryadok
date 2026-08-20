import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ChevronDown, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildScenario, type ScenarioKind } from '../lib/scenarios'
import { completeTask, isToday, toggleSubtask } from '../lib/daily'
import { difficultyInfo } from '../lib/difficulty'
import type { Room, Subtask, TaskWithSubtasks } from '../types'

interface ScenarioRunScreenProps {
  kind: ScenarioKind
  title: string
  subtitle: string
  onBack: () => void
}

export default function ScenarioRunScreen({
  kind,
  title,
  subtitle,
  onBack,
}: ScenarioRunScreenProps) {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setDoneIds(new Set())
    const [res, roomsRes] = await Promise.all([
      buildScenario(kind),
      supabase.from('rooms').select('*'),
    ])
    const loaded = res.tasks

    // Сброс "вчерашних" подзадач: задача снова актуальна, а все галочки стоят
    const stale = loaded.filter(
      (t) =>
        !isToday(t.last_completed_at) &&
        t.subtasks.length > 0 &&
        t.subtasks.every((s) => s.is_completed),
    )
    if (stale.length > 0) {
      await supabase
        .from('subtasks')
        .update({ is_completed: false })
        .in('task_id', stale.map((t) => t.id))
      for (const t of stale) {
        t.subtasks = t.subtasks.map((s) => ({ ...s, is_completed: false }))
      }
    }

    setRooms((roomsRes.data ?? []) as Room[])
    setTasks(loaded)
    setLoading(false)
  }, [kind])

  useEffect(() => {
    load()
  }, [load])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleComplete(task: TaskWithSubtasks) {
    await completeTask(task)
    setDoneIds((prev) => new Set(prev).add(task.id))
  }

  async function handleToggleSubtask(task: TaskWithSubtasks, subtask: Subtask) {
    const next = await toggleSubtask(subtask)
    const updated = task.subtasks.map((s) =>
      s.id === subtask.id ? { ...s, is_completed: next } : s,
    )
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, subtasks: updated } : t)))

    // Все подзадачи закрыты → задача выполнена
    if (next && updated.every((s) => s.is_completed)) {
      await handleComplete(task)
    }
  }

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? ''

  const remaining = tasks.filter((t) => !doneIds.has(t.id))
  const remainingMinutes = remaining.reduce((sum, t) => sum + t.duration_minutes, 0)

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      </div>
      <p className="text-sm text-neutral-500 mb-4 ml-12">{subtitle}</p>

      {!loading && tasks.length > 0 && (
        <p className="text-xs text-neutral-500 mb-3 ml-1">
          {tasks.length - remaining.length} из {tasks.length} · осталось ≈ {remainingMinutes} мин
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Подбираем задачи…</p>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-neutral-500">Ничего не нужно — всё чисто!</p>
        </div>
      ) : (
        tasks.map((task) => {
          const done = doneIds.has(task.id)
          const info = difficultyInfo(task.difficulty)
          const hasSubtasks = task.subtasks.length > 0
          const expanded = expandedIds.has(task.id)
          return (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 shadow-sm mb-2 flex items-start gap-3"
            >
              <button
                onClick={() => handleComplete(task)}
                disabled={done}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 text-white text-sm transition cursor-pointer ${
                  done ? 'bg-forest-500 border-forest-500 anim-pop' : 'border-neutral-300'
                }`}
              >
                {done ? '✓' : ''}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${done ? 'text-neutral-500' : 'text-neutral-900'}`}>
                  <span className={done ? 'strike-center' : ''}>{task.title}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center mt-1">
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${info.tagClass}`}>
                    {info.label}
                  </span>
                  <span className="text-[11px] text-neutral-500">{task.duration_minutes} мин</span>
                  <span className="text-[11px] text-forest-700">{roomName(task.room_id)}</span>
                  {hasSubtasks && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <ListChecks size={12} />{' '}
                      {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
                    </span>
                  )}
                </div>
                {hasSubtasks && expanded && (
                  <div className="mt-2 space-y-1.5 pl-1">
                    {task.subtasks.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleToggleSubtask(task, s)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] text-white ${
                            s.is_completed
                              ? 'bg-forest-500 border-forest-500'
                              : 'border-neutral-300'
                          }`}
                        >
                          {s.is_completed ? '✓' : ''}
                        </span>
                        <span
                          className={`text-sm ${
                            s.is_completed ? 'strike-center text-neutral-500' : 'text-neutral-700'
                          }`}
                        >
                          {s.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {hasSubtasks && (
                <button
                  onClick={() => toggleExpanded(task.id)}
                  className="text-neutral-300 p-1 cursor-pointer shrink-0"
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>
          )
        })
      )}

      {!loading && kind === 'one' && tasks.length > 0 && remaining.length === 0 && (
        <button
          onClick={load}
          className="mt-3 w-full rounded-xl bg-forest-500 text-white font-semibold py-3 cursor-pointer active:scale-[0.99] transition"
        >
          Показать ещё одну
        </button>
      )}
    </div>
  )
}