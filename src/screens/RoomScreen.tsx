import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import RoomIcon from '../components/RoomIcon'
import { completeTask, isToday, toggleSubtask } from '../lib/daily'
import { isOnline } from '../lib/offline'
import { readCache } from '../lib/cache'
import type { Room, Subtask, TaskWithSubtasks } from '../types'

interface RoomScreenProps {
  room: Room
  onBack: () => void
  onChanged: () => void
}

export default function RoomScreen({ room, onBack, onChanged }: RoomScreenProps) {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithSubtasks | null>(null)

  const loadTasks = useCallback(async () => {
    if (!isOnline()) {
      const snap = readCache()
      if (snap) setTasks(snap.tasks.filter((t) => t.room_id === room.id))
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('room_id', room.id)
      .order('created_at')

    if (!error) {
      const tasksData = (data ?? []) as TaskWithSubtasks[]

      // Сброс "вчерашних" подзадач: задача снова актуальна, а все галочки стоят
      const stale = tasksData.filter(
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
      setTasks(tasksData)
    }
    setLoading(false)
  }, [room.id])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function handleComplete(task: TaskWithSubtasks) {
    await completeTask(task)
    loadTasks()
    onChanged()
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

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-11 h-11 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center">
          <RoomIcon icon={room.icon} />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 flex-1">{room.name}</h1>
        <button
          onClick={() => {
            setEditingTask(null)
            setModalOpen(true)
          }}
          className="w-9 h-9 rounded-full bg-forest-500 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(55,85,52,0.3)] cursor-pointer active:scale-95 transition"
        >
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Загружаем задачи…</p>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-neutral-500 mb-3">В этой комнате пока нет задач</p>
          <button
            onClick={() => setModalOpen(true)}
            className="text-sm font-semibold text-forest-700 cursor-pointer"
          >
            Добавить первую
          </button>
        </div>
      ) : (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            done={isToday(task.last_completed_at)}
            onComplete={() => handleComplete(task)}
            onToggleSubtask={(s) => handleToggleSubtask(task, s)}
            onEdit={() => {
              setEditingTask(task)
              setModalOpen(true)
            }}
          />
        ))
      )}

      {modalOpen && (
        <TaskModal
          room={room}
          task={editingTask}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            loadTasks()
            onChanged()
          }}
        />
      )}
    </div>
  )
}