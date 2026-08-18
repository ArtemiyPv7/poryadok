import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ROOM_ICONS, ROOM_ICON_LABELS } from '../lib/roomIcons'
import type { Room } from '../types'

interface RoomModalProps {
  room: Room | null
  onClose: () => void
  onSaved: () => void
}

export default function RoomModal({ room, onClose, onSaved }: RoomModalProps) {
  const [name, setName] = useState(room?.name ?? '')
  const [icon, setIcon] = useState(room?.icon ?? 'other')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('Введите название комнаты')
      return
    }
    setSaving(true)
    setError(null)

    const payload = { name: name.trim(), icon }
    const { error: err } = room
      ? await supabase.from('rooms').update(payload).eq('id', room.id)
      : await supabase.from('rooms').insert(payload)

    setSaving(false)
    if (err) {
      setError('Не удалось сохранить: ' + err.message)
      return
    }
    onSaved()
  }

  async function handleDelete() {
    if (!room) return
    if (!confirm(`Удалить комнату «${room.name}» вместе с её задачами?`)) return

    const { error: err } = await supabase.from('rooms').delete().eq('id', room.id)
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
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 anim-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-neutral-900">
            {room ? 'Редактировать комнату' : 'Новая комната'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 p-1 cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Название
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Кухня"
          className="w-full rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none focus:border-forest-500 mb-5"
        />

        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Иконка
        </label>
        <div className="grid grid-cols-6 gap-2 mb-6">
          {Object.entries(ROOM_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              title={ROOM_ICON_LABELS[key]}
              onClick={() => setIcon(key)}
              className={`p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer ${
                icon === key
                  ? 'bg-forest-500 text-white'
                  : 'bg-neutral-50 text-neutral-500 hover:bg-forest-100'
              }`}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-accent-orange mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-forest-500 text-white font-semibold py-3 cursor-pointer disabled:opacity-50 transition"
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {room && (
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