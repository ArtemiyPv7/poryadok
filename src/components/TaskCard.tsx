import { Pencil, ListChecks } from 'lucide-react'
import { difficultyInfo } from '../lib/difficulty'
import type { TaskWithSubtasks } from '../types'

interface TaskCardProps {
  task: TaskWithSubtasks
  done: boolean
  onComplete: () => void
  onEdit: () => void
}

export default function TaskCard({ task, done, onComplete, onEdit }: TaskCardProps) {
  const info = difficultyInfo(task.difficulty)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-2 flex items-center gap-3 anim-fade-up">
      <button
        onClick={onComplete}
        disabled={done}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 text-white text-sm transition cursor-pointer ${
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
          {task.subtasks.length > 0 && (
            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
              <ListChecks size={12} /> {task.subtasks.length}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="text-neutral-300 hover:text-forest-700 p-2 cursor-pointer transition-colors"
      >
        <Pencil size={18} />
      </button>
    </div>
  )
}