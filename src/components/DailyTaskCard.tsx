import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { difficultyInfo } from '../lib/difficulty'
import type { DailyItem } from '../lib/daily'
import type { Subtask } from '../types'

interface DailyTaskCardProps {
  item: DailyItem
  roomName: string
  onComplete: () => void
  onToggleSubtask: (subtask: Subtask) => void
}

export default function DailyTaskCard({
  item,
  roomName,
  onComplete,
  onToggleSubtask,
}: DailyTaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const info = difficultyInfo(item.task.difficulty)
  const hasSubtasks = item.task.subtasks.length > 0

  return (
    <div className="py-3 border-b border-neutral-50 last:border-b-0">
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          disabled={item.isCompleted}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 text-white text-sm transition cursor-pointer ${
            item.isCompleted ? 'bg-forest-500 border-forest-500 anim-pop' : 'border-neutral-300'
          }`}
        >
          {item.isCompleted ? '✓' : ''}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className={`font-medium ${
              item.isCompleted ? 'text-neutral-500' : 'text-neutral-900'
            }`}
          >
            <span className={item.isCompleted ? 'strike-center' : ''}>
              {item.task.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center mt-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${info.tagClass}`}>
              {info.label}
            </span>
            <span className="text-[11px] text-neutral-500">{item.task.duration_minutes} мин</span>
            <span className="text-[11px] text-forest-700">{roomName}</span>
          </div>

          {hasSubtasks && expanded && (
            <div className="mt-2 space-y-1.5 pl-1">
              {item.task.subtasks.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onToggleSubtask(s)}
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
            onClick={() => setExpanded(!expanded)}
            className="text-neutral-300 p-1 cursor-pointer"
          >
            <ChevronDown
              size={18}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  )
}