import { Pencil } from 'lucide-react'
import RoomIcon from './RoomIcon'
import { cleanlinessBarClass, cleanlinessTextClass } from '../lib/cleanliness'
import type { Room } from '../types'

interface RoomCardProps {
  room: Room
  cleanliness: number | null
  onOpen: () => void
  onEdit: () => void
}

export default function RoomCard({ room, cleanliness, onOpen, onEdit }: RoomCardProps) {
  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl p-4 shadow-sm mb-2 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition anim-fade-up"
    >
      <div className="w-11 h-11 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
        <RoomIcon icon={room.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-semibold text-neutral-900">{room.name}</span>
          {cleanliness !== null ? (
            <span className={`text-xs font-semibold ${cleanlinessTextClass(cleanliness)}`}>
              {cleanliness}%
            </span>
          ) : (
            <span className="text-xs text-neutral-500">нет задач</span>
          )}
        </div>
        {cleanliness !== null && (
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${cleanlinessBarClass(cleanliness)}`}
              style={{ width: `${cleanliness}%` }}
            />
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        className="text-neutral-300 hover:text-forest-700 p-2 cursor-pointer transition-colors shrink-0"
      >
        <Pencil size={18} />
      </button>
    </div>
  )
}