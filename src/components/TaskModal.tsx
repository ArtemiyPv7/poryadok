import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DIFFICULTIES } from '../lib/difficulty'
import type { Difficulty, Room, TaskWithSubtasks } from '../types'

interface SubtaskRow {
  id: string | null
  title: string
}

interface TaskModalProps {
  room: Room
  task: TaskWithSubtasks | null
  onClose: () => void
  onSaved: () => void
}

const FREQUENCY_OPTIONS = [
  { days: 1, label: 'каждый день' },
  { days: 2, label: 'раз в 2 дня' },
  { days: 3, label: 'раз в 3 дня' },
  { days: 7, label: 'раз в неделю' },
  { days: 14, label: 'раз в 2 недели' },
  { days: 30, label: 'раз в месяц' },
]

export default function TaskModal({ room, task, onClose, onSaved }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(task?.difficulty ?? 'easy')
  const [duration, setDuration] = useState(task?.duration_minutes ?? 10)
  const [frequency, setFrequency] = useState(task?.frequency_days ?? 1)
  const [isSeasonal, setIsSeasonal] = useState(task?.is_seasonal ?? false)
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>(
    (task?.subtasks ?? []).map((s) => ({ id: s.id, title: s.title })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addSubtaskRow() {
    setSubtasks([...subtasks, { id: null, title: '' }])
  }

  function updateSubtaskRow(index: number, value: string) {
    setSubtasks(subtasks.map((row, i) => (i === index ? { ...row, title: value } : row)))
  }

  function removeSubtaskRow(index: number) {
    setSubtasks(subtasks.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Введите название задачи')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      room_id: room.id,
      title: title.trim(),
      difficulty,
      is_seasonal: isSeasonal,
      duration_minutes: duration,
      frequency_days: frequency,
    }

    // Сохраняем задачу
    let taskId: string
    if (task) {
      const { error: err } = await supabase.from('tasks').update(payload).eq('id', task.id)
      if (err) {
        setError('Не удалось сохранить: ' + err.message)
        setSaving(false)
        return
      }
      taskId = task.id
    } else {
      const { data, error: err } = await supabase.from('tasks').insert(payload).select().single()
      if (err || !data) {
        setError('Не удалось создать: ' + (err?.message ?? 'неизвестная ошибка'))
        setSaving(false)
        return
      }
      taskId = data.id
    }

    // Сохраняем подзадачи: существующие обновляем, новые создаём, удалённые стираем
    const keptIds = subtasks.filter((r) => r.id !== null).map((r) => r.id as string)
    const removedIds = (task?.subtasks ?? []).map((s) => s.id).filter((id) => !keptIds.includes(id))

    if (removedIds.length > 0) {
      await supabase.from('subtasks').delete().in('id', removedIds)
    }

    for (const row of subtasks) {
      if (!row.title.trim()) continue
      if (row.id) {
        await supabase.from('subtasks').update({ title: row.title.trim() }).eq('id', row.id)
      } else {
        await supabase.from('subtasks').insert({ task_id: taskId, title: row.title.trim() })
      }
    }

    setSaving(false)
    onSaved()
  }

  async function handleDelete() {
    if (!task) return
    if (!confirm(`Удалить задачу «${task.title}»?`)) return
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id)
    if (err) {
      setError('Не удалось удалить: ' + err.message)
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/40 flex items-end justify-center sm:items-center anim-fade"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto anim-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-neutral-900">
            {task ? 'Редактировать задачу' : `Новая задача · ${room.name}`}
          </h2>
          <button onClick={onClose} className="text-neutral-500 p-1 cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-2">Название</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например, Помыть полы"
          className="w-full rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none focus:border-forest-500 mb-4"
        />

        <label className="block text-sm font-medium text-neutral-700 mb-2">Сложность</label>
        <div className="flex gap-2 mb-4">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer ${
                difficulty === d.value ? d.activeClass : 'bg-neutral-50 text-neutral-500'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Время, минут: <span className="font-bold text-forest-700">{duration}</span>
        </label>
        <input
          type="number"
          min={1}
          step={5}
          value={duration}
          onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
          className="w-full rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none focus:border-forest-500 mb-4"
        />

        <label className="block text-sm font-medium text-neutral-700 mb-2">Периодичность</label>
        <div className="flex flex-wrap gap-2 mb-5">
          {FREQUENCY_OPTIONS.map((f) => (
            <button
              key={f.days}
              type="button"
              onClick={() => setFrequency(f.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                frequency === f.days
                  ? 'bg-forest-500 text-white'
                  : 'bg-neutral-50 text-neutral-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={isSeasonal}
            onChange={(e) => setIsSeasonal(e.target.checked)}
            className="w-5 h-5 accent-forest-500"
          />
          <span className="text-sm text-neutral-700">
            Сезонная задача (окна, кондиционер, гардероб)
          </span>
        </label>

        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-neutral-700">Подзадачи</label>
          <button
            type="button"
            onClick={addSubtaskRow}
            className="text-xs font-semibold text-forest-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> добавить
          </button>
        </div>
        {subtasks.length === 0 && (
          <p className="text-xs text-neutral-500 mb-4">Пока нет — можно разбить задачу на шаги</p>
        )}
        <div className="space-y-2 mb-5">
          {subtasks.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={row.title}
                onChange={(e) => updateSubtaskRow(index, e.target.value)}
                placeholder={`Шаг ${index + 1}`}
                className="flex-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-forest-500"
              />
              <button
                type="button"
                onClick={() => removeSubtaskRow(index)}
                className="text-neutral-300 hover:text-accent-orange p-2 cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-accent-orange mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-forest-500 text-white font-semibold py-3 cursor-pointer disabled:opacity-50 transition"
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {task && (
            <button
              onClick={handleDelete}
              className="rounded-xl px-4 py-3 text-accent-orange font-semibold bg-neutral-50 cursor-pointer transition"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}