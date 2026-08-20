import { useState } from 'react'
import { Pencil, ListChecks, ChevronDown } from 'lucide-react'
import { difficultyInfo } from '../lib/difficulty'
import type { Subtask, TaskWithSubtasks } from '../types'

interface TaskCardProps {
  task: TaskWithSubtasks
  done: boolean
  onComplete: () => void
  onToggleSubtask: (subtask: Subtask) => void
  onEdit: () => void
}

export default function TaskCard({
  task,
  done,
  onComplete,
  onToggleSubtask,
  onEdit,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const info = difficultyInfo(task.difficulty)
  const hasSubtasks = task.subtasks.length > 0

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-2 flex items-start gap-3 anim-fade-up">
      <button
        onClick={onComplete}
        disabled={done}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 text-white text-sm transition cursor-pointer ${
          done ? 'bg-forest-500 border-forest-500' : 'border-neutral-300 hover:border-forest-500'
        }`}
      >
        {done ? '✓' : ''}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold mb-1.5 ${done ? 'text-neutral-500' : 'text-neutral-900'}`}>
          <span className={done ? 'strike-center' : ''}>{task.title}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${info.tagClass}`}>
            {info.label}
          </span>
          <span className="text-[11px] text-neutral-500">{task.duration_minutes} мин</span>
          <span className="text-[11px] text-neutral-500">· раз в {task.frequency_days} дн</span>
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
                onClick={() => onToggleSubtask(s)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] text-white ${
                    s.is_completed ? 'bg-forest-500 border-forest-500' : 'border-neutral-300'
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
      <div className="flex flex-col items-center gap-1 shrink-0">
        {hasSubtasks && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-neutral-300 p-1 cursor-pointer"
          >
            <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
        <button
          onClick={onEdit}
          className="text-neutral-300 hover:text-forest-700 p-1 cursor-pointer transition-colors"
        >
          <Pencil size={18} />
        </button>
      </div>
    </div>
  )
}