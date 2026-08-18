import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { completeTask, isOverdue, isToday, taskPriority } from '../lib/daily'
import { computeRoomCleanliness } from '../lib/cleanliness'
import { difficultyInfo } from '../lib/difficulty'
import type { Room, TaskWithSubtasks } from '../types'

function daysLeft(task: TaskWithSubtasks): number {
  const ref = task.last_completed_at ?? task.created_at
  const days = (Date.now() - new Date(ref).getTime()) / 86400000
  return Math.ceil(task.frequency_days - days)
}

interface SeasonalScreenProps {
  onBack: () => void
}

export default function SeasonalScreen({ onBack }: SeasonalScreenProps) {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [roomsRes, tasksRes] = await Promise.all([
      supabase.from('rooms').select('*'),
      supabase.from('tasks').select('*, subtasks(*)').eq('is_seasonal', true),
    ])
    setRooms((roomsRes.data ?? []) as Room[])
    setTasks((tasksRes.data ?? []) as TaskWithSubtasks[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleComplete(task: TaskWithSubtasks) {
    await completeTask(task)
    loadAll()
  }

  const cleanByRoom = new Map<string, number | null>()
  for (const room of rooms) {
    cleanByRoom.set(
      room.id,
      computeRoomCleanliness(tasks.filter((t) => t.room_id === room.id)),
    )
  }

  const sorted = [...tasks].sort(
    (a, b) =>
      taskPriority(b, cleanByRoom.get(b.room_id) ?? null) -
      taskPriority(a, cleanByRoom.get(a.room_id) ?? null),
  )

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? ''

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900">Сезонные задачи</h1>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Загружаем…</p>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-neutral-500">
            Пока нет сезонных задач. Создай задачу с галочкой "Сезонная".
          </p>
        </div>
      ) : (
        sorted.map((task) => {
          const done = isToday(task.last_completed_at)
          const info = difficultyInfo(task.difficulty)
          const left = daysLeft(task)
          return (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 shadow-sm mb-2 flex items-center gap-3"
            >
              <button
                onClick={() => handleComplete(task)}
                disabled={done}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 text-white text-sm transition cursor-pointer ${
                  done ? 'bg-forest-500 border-forest-500 anim-pop' : 'border-neutral-300'
                }`}
              >
                {done ? '✓' : ''}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium ${
                    done ? 'text-neutral-500' : 'text-neutral-900'
                  }`}
                >
                  <span className={done ? 'strike-center' : ''}>{task.title}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center mt-1">
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${info.tagClass}`}>
                    {info.label}
                  </span>
                  <span className="text-[11px] text-neutral-500">{roomName(task.room_id)}</span>
                  {!done &&
                    (isOverdue(task) ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-accent-orange/15 text-accent-orange">
                        пора!
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-500">через {left} дн</span>
                    ))}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}