import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import RoomIcon from '../components/RoomIcon'
import { computeRoomCleanliness, cleanlinessTextClass } from '../lib/cleanliness'
import { completeTask, isOverdue, taskPriority } from '../lib/daily'
import { difficultyInfo } from '../lib/difficulty'
import { isOnline } from '../lib/offline'
import { readCache, saveCache } from '../lib/cache'
import type { Difficulty, Room, TaskWithSubtasks } from '../types'

type SortMode = 'priority' | 'fastest' | 'easiest'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'priority', label: 'По приоритету' },
  { value: 'fastest', label: 'Сначала быстрые' },
  { value: 'easiest', label: 'Сначала лёгкие' },
]

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

interface FreeModeScreenProps {
  onBack: () => void
}

export default function FreeModeScreen({ onBack }: FreeModeScreenProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('priority')

  async function loadAll() {
    if (!isOnline()) {
      const snap = readCache()
      if (snap) {
        setRooms(snap.rooms)
        setTasks(snap.tasks)
      }
      setLoading(false)
      return
    }

    const [roomsRes, tasksRes] = await Promise.all([
      supabase.from('rooms').select('*'),
      supabase.from('tasks').select('*, subtasks(*)'),
    ])
    const roomsData = (roomsRes.data ?? []) as Room[]
    const tasksData = (tasksRes.data ?? []) as TaskWithSubtasks[]
    setRooms(roomsData)
    setTasks(tasksData)
    saveCache({ rooms: roomsData, tasks: tasksData })
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleComplete(task: TaskWithSubtasks) {
    await completeTask(task)
    loadAll()
  }

  const cleanlinessByRoom = useMemo(() => {
    const map: Record<string, number | null> = {}
    for (const room of rooms) {
      map[room.id] = computeRoomCleanliness(tasks.filter((t) => t.room_id === room.id))
    }
    return map
  }, [rooms, tasks])

  const groups = useMemo(() => {
    const sortedRooms = [...rooms].sort((a, b) => {
      const ca = cleanlinessByRoom[a.id] ?? null
      const cb = cleanlinessByRoom[b.id] ?? null
      if (ca === null && cb === null) return a.name.localeCompare(b.name, 'ru')
      if (ca === null) return 1
      if (cb === null) return -1
      return ca - cb
    })

    return sortedRooms
      .map((room) => {
        const clean = cleanlinessByRoom[room.id] ?? null
        const roomTasks = tasks.filter((t) => t.room_id === room.id)

        const compare = (a: TaskWithSubtasks, b: TaskWithSubtasks): number => {
          const doneA = isToday(a.last_completed_at) ? 1 : 0
          const doneB = isToday(b.last_completed_at) ? 1 : 0
          if (doneA !== doneB) return doneA - doneB // невыполненные сверху

          if (sortMode === 'fastest') return a.duration_minutes - b.duration_minutes
          if (sortMode === 'easiest') {
            return (
              DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
              a.duration_minutes - b.duration_minutes
            )
          }
          return taskPriority(b, clean) - taskPriority(a, clean)
        }

        return { room, clean, tasks: [...roomTasks].sort(compare) }
      })
      .filter((group) => group.tasks.length > 0)
  }, [rooms, tasks, sortMode, cleanlinessByRoom])

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900">Свободный режим</h1>
      </div>

      <div className="flex gap-2 mb-5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortMode(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              sortMode === opt.value ? 'bg-forest-500 text-white' : 'bg-white text-neutral-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Загружаем задачи…</p>
      ) : (
        groups.map(({ room, clean, tasks: roomTasks }) => (
          <div key={room.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center">
                <RoomIcon icon={room.icon} size={16} />
              </div>
              <span className="font-semibold text-neutral-900">{room.name}</span>
              {clean !== null && (
                <span className={`text-xs font-semibold ${cleanlinessTextClass(clean)}`}>
                  {clean}%
                </span>
              )}
            </div>

            {roomTasks.map((task) => {
              const done = isToday(task.last_completed_at)
              const info = difficultyInfo(task.difficulty)
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
                      <span className="text-[11px] text-neutral-500">
                        {task.duration_minutes} мин
                      </span>
                      {!done && isOverdue(task) && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-accent-orange/15 text-accent-orange">
                          просрочено
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}