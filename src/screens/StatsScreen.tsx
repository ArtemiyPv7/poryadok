import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import RoomIcon from '../components/RoomIcon'
import {
  computeRoomCleanliness,
  cleanlinessBarClass,
  cleanlinessTextClass,
} from '../lib/cleanliness'
import type { Room, Task, TaskHistory } from '../types'

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function dateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface PlanRow {
  is_completed: boolean
  plan_date: string
}

export default function StatsScreen() {
  const [history, setHistory] = useState<TaskHistory[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [h, p, r, t] = await Promise.all([
        supabase.from('task_history').select('*'),
        supabase.from('daily_plans').select('is_completed, plan_date'),
        supabase.from('rooms').select('*'),
        supabase.from('tasks').select('*'),
      ])
      setHistory((h.data ?? []) as TaskHistory[])
      setPlans((p.data ?? []) as PlanRow[])
      setRooms((r.data ?? []) as Room[])
      setTasks((t.data ?? []) as Task[])
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  // За последние 7 дней
  const weekHistory = history.filter((h) => new Date(h.completed_at) >= weekAgo)
  const tasksWeek = weekHistory.length
  const minutesWeek = weekHistory.reduce((sum, h) => sum + (h.duration_minutes ?? 0), 0)
  const hoursWeek = (minutesWeek / 60).toFixed(1).replace('.', ',')

  // Выполняемость дейликов за 7 дней
  const weekStart = dateStr(weekAgo)
  const weekPlans = plans.filter((p) => p.plan_date >= weekStart)
  const completionRate =
    weekPlans.length > 0
      ? Math.round((weekPlans.filter((p) => p.is_completed).length / weekPlans.length) * 100)
      : 0

  // Средняя чистота дома
  const cleanByRoom = rooms.map((room) => ({
    room,
    value: computeRoomCleanliness(tasks.filter((t) => t.room_id === room.id)),
  }))
  const cleanValues = cleanByRoom
    .map((c) => c.value)
    .filter((v): v is number => v !== null)
  const avgCleanliness = cleanValues.length
    ? Math.round(cleanValues.reduce((a, b) => a + b, 0) / cleanValues.length)
    : 0

  // График: последние 7 дней
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000)
    const count = history.filter((h) => sameDay(new Date(h.completed_at), d)).length
    return { label: DAY_LABELS[d.getDay()], count }
  })
  const maxCount = Math.max(...days.map((d) => d.count), 1)

  return (
    <div className="px-5 pt-6">
      <p className="text-sm text-neutral-500 mb-1">Твой прогресс</p>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-5">Статистика</h1>

      {loading ? (
        <p className="text-sm text-neutral-500">Считаем…</p>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-neutral-500">
            Здесь появится твоя статистика — выполни первую задачу, и цифры оживут 🌱
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-neutral-900">{tasksWeek}</div>
              <div className="text-xs text-neutral-500 mt-1">задач за 7 дней</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-neutral-900">{hoursWeek} ч</div>
              <div className="text-xs text-neutral-500 mt-1">времени на уборку</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-forest-700">{completionRate}%</div>
              <div className="text-xs text-neutral-500 mt-1">дейлики выполнены</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`text-2xl font-bold ${cleanlinessTextClass(avgCleanliness)}`}>
                {avgCleanliness}%
              </div>
              <div className="text-xs text-neutral-500 mt-1">средняя чистота</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <div className="text-base font-semibold text-neutral-900 mb-4">
              Активность за неделю
            </div>
            <div className="flex items-end gap-2 h-24">
              {days.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className={`w-full rounded-md ${d.count > 0 ? 'bg-forest-500' : 'bg-neutral-100'}`}
                    style={{ height: `${Math.max((d.count / maxCount) * 100, 6)}%` }}
                  />
                  <span className="text-[10px] text-neutral-500">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-base font-semibold text-neutral-900 mb-4">Чистота по комнатам</div>
            {cleanByRoom.map(({ room, value }) => (
              <div key={room.id} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className="w-9 h-9 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
                  <RoomIcon icon={room.icon} size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-neutral-900">{room.name}</span>
                    <span className={value !== null ? cleanlinessTextClass(value) : 'text-neutral-500'}>
                      {value !== null ? `${value}%` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    {value !== null && (
                      <div
                        className={`h-full rounded-full ${cleanlinessBarClass(value)}`}
                        style={{ width: `${value}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}