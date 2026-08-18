import { useEffect, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import RoomCard from '../components/RoomCard'
import RoomModal from '../components/RoomModal'
import RoomScreen from './RoomScreen'
import DailyTaskCard from '../components/DailyTaskCard'
import EnergyModal from '../components/EnergyModal'
import { ENERGY_OPTIONS } from '../lib/energy'
import { computeRoomCleanliness } from '../lib/cleanliness'
import { isOnline } from '../lib/offline'
import { readCache, saveCache } from '../lib/cache'
import {
  loadDailyPlan,
  regenerateDailyPlan,
  completeTask,
  toggleSubtask,
  type Energy,
  type DailyItem,
} from '../lib/daily'
import type { Room, Subtask, Task, TaskWithSubtasks } from '../types'

export default function HomeScreen() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [cleanliness, setCleanliness] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)

  const [energy, setEnergy] = useState<Energy>('normal')
  const [energyModalOpen, setEnergyModalOpen] = useState(false)
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([])
  const [loadingDaily, setLoadingDaily] = useState(true)

  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  function applyCleanliness(roomsData: Room[], tasksData: Task[]) {
    const map: Record<string, number | null> = {}
    for (const room of roomsData) {
      map[room.id] = computeRoomCleanliness(tasksData.filter((t) => t.room_id === room.id))
    }
    setCleanliness(map)
  }

  async function loadAll() {
    if (!isOnline()) {
      const snap = readCache()
      if (snap) {
        setRooms(snap.rooms)
        applyCleanliness(snap.rooms, snap.tasks)
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
    applyCleanliness(roomsData, tasksData)
    saveCache({ rooms: roomsData, tasks: tasksData })
    setLoading(false)
  }

  async function refreshDaily(regenerate: boolean, e: Energy) {
    setLoadingDaily(true)

    if (!isOnline()) {
      const snap = readCache()
      if (snap) setDailyItems(snap.daily)
      setLoadingDaily(false)
      return
    }

    const items = regenerate ? await regenerateDailyPlan(e) : await loadDailyPlan(e)
    setDailyItems(items)
    saveCache({ daily: items })
    setLoadingDaily(false)
  }

  useEffect(() => {
    loadAll()
    refreshDaily(false, 'normal')
  }, [])

  function handleEnergySelect(e: Energy) {
    setEnergyModalOpen(false)
    setEnergy(e)
    refreshDaily(true, e)
  }

  async function handleComplete(item: DailyItem) {
    await completeTask(item.task)
    setDailyItems((prev) =>
      prev.map((i) =>
        i.planId === item.planId
          ? {
              ...i,
              isCompleted: true,
              task: {
                ...i.task,
                subtasks: i.task.subtasks.map((s) => ({ ...s, is_completed: true })),
              },
            }
          : i,
      ),
    )
    loadAll()
  }

  async function handleToggleSubtask(item: DailyItem, subtask: Subtask) {
    const next = await toggleSubtask(subtask)

    const current = dailyItems.find((i) => i.planId === item.planId)
    if (!current) return

    const updatedSubtasks = current.task.subtasks.map((s) =>
      s.id === subtask.id ? { ...s, is_completed: next } : s,
    )

    setDailyItems((prev) =>
      prev.map((i) =>
        i.planId === item.planId ? { ...i, task: { ...i.task, subtasks: updatedSubtasks } } : i,
      ),
    )

    if (next && updatedSubtasks.every((s) => s.is_completed)) {
      await handleComplete(item)
    }
  }

  const sortedRooms = [...rooms].sort((a, b) => {
    const ca = cleanliness[a.id] ?? null
    const cb = cleanliness[b.id] ?? null
    if (ca === null && cb === null) return a.name.localeCompare(b.name, 'ru')
    if (ca === null) return 1
    if (cb === null) return -1
    return ca - cb
  })

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? ''

  const remainingMinutes = dailyItems
    .filter((i) => !i.isCompleted)
    .reduce((sum, i) => sum + i.task.duration_minutes, 0)

  const allDone = dailyItems.length > 0 && dailyItems.every((i) => i.isCompleted)

  const energyMeta = ENERGY_OPTIONS.find((o) => o.value === energy) ?? ENERGY_OPTIONS[1]
  const EnergyIcon = energyMeta.icon

  const hour = new Date().getHours()
  const greeting =
    hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  const date = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (selectedRoom) {
    return (
      <RoomScreen room={selectedRoom} onBack={() => setSelectedRoom(null)} onChanged={loadAll} />
    )
  }

  return (
    <div className="px-5 pt-4">
      <p className="text-base font-semibold text-neutral-900 mb-4">
        {greeting} <span className="text-neutral-500 font-normal">· {date}</span>
      </p>

      {/* Дейлики */}
      <div className="bg-white rounded-2xl px-5 py-2 shadow-sm mb-4">
        <div className="flex items-center justify-between pt-3 pb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">Сегодня</h2>
            <button
              onClick={() => setEnergyModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-forest-100 text-forest-700 text-xs font-semibold px-2.5 py-1 cursor-pointer active:scale-95 transition"
            >
              <EnergyIcon size={14} />
              {energyMeta.label}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!loadingDaily && !allDone && dailyItems.length > 0 && (
              <span className="text-xs text-neutral-500">≈ {remainingMinutes} мин</span>
            )}
            <button
              onClick={() => refreshDaily(true, energy)}
              title="Пересобрать план"
              className="text-neutral-300 hover:text-forest-700 p-1 cursor-pointer transition-colors"
            >
              <RefreshCw size={16} className={loadingDaily ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingDaily ? (
          <p className="text-sm text-neutral-500 py-4">Подбираем задачи…</p>
        ) : allDone ? (
          <p className="text-sm text-forest-700 font-medium py-4">Всё готово на сегодня! 🎉</p>
        ) : dailyItems.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">
            Дел нет — в доме порядок. Добавь задачи в комнаты.
          </p>
        ) : (
          dailyItems.map((item) => (
            <DailyTaskCard
              key={item.planId}
              item={item}
              roomName={roomName(item.task.room_id)}
              onComplete={() => handleComplete(item)}
              onToggleSubtask={(s) => handleToggleSubtask(item, s)}
            />
          ))
        )}
      </div>

      {/* Комнаты */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">Комнаты</h2>
        <button
          onClick={() => {
            setEditingRoom(null)
            setRoomModalOpen(true)
          }}
          className="w-9 h-9 rounded-full bg-forest-500 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(55,85,52,0.3)] cursor-pointer active:scale-95 transition"
        >
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Загружаем комнаты…</p>
      ) : (
        sortedRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            cleanliness={cleanliness[room.id] ?? null}
            onOpen={() => setSelectedRoom(room)}
            onEdit={() => {
              setEditingRoom(room)
              setRoomModalOpen(true)
            }}
          />
        ))
      )}

      {roomModalOpen && (
        <RoomModal
          room={editingRoom}
          onClose={() => setRoomModalOpen(false)}
          onSaved={() => {
            setRoomModalOpen(false)
            loadAll()
          }}
        />
      )}

      {energyModalOpen && (
        <EnergyModal
          current={energy}
          onSelect={handleEnergySelect}
          onClose={() => setEnergyModalOpen(false)}
        />
      )}
    </div>
  )
}