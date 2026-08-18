import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { buildScenario, type ScenarioKind } from '../lib/scenarios'
import { completeTask } from '../lib/daily'
import { difficultyInfo } from '../lib/difficulty'
import type { TaskWithSubtasks } from '../types'

interface ScenarioRunScreenProps {
  kind: ScenarioKind
  title: string
  subtitle: string
  onBack: () => void
}

export default function ScenarioRunScreen({
  kind,
  title,
  subtitle,
  onBack,
}: ScenarioRunScreenProps) {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([])
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setDoneIds(new Set())
    const res = await buildScenario(kind)
    setTasks(res.tasks)
    setLoading(false)
  }, [kind])

  useEffect(() => {
    load()
  }, [load])

  async function handleComplete(task: TaskWithSubtasks) {
    await completeTask(task)
    setDoneIds((prev) => new Set(prev).add(task.id))
  }

  const remaining = tasks.filter((t) => !doneIds.has(t.id))
  const remainingMinutes = remaining.reduce((sum, t) => sum + t.duration_minutes, 0)

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      </div>
      <p className="text-sm text-neutral-500 mb-4 ml-12">{subtitle}</p>

      {!loading && tasks.length > 0 && (
        <p className="text-xs text-neutral-500 mb-3 ml-1">
          {tasks.length - remaining.length} из {tasks.length} · осталось ≈ {remainingMinutes} мин
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Подбираем задачи…</p>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-neutral-500">Ничего не нужно — всё чисто!</p>
        </div>
      ) : (
        tasks.map((task) => {
          const done = doneIds.has(task.id)
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
                <div className={`font-medium ${done ? 'text-neutral-500' : 'text-neutral-900'}`}>
                  <span className={done ? 'strike-center' : ''}>{task.title}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center mt-1">
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${info.tagClass}`}>
                    {info.label}
                  </span>
                  <span className="text-[11px] text-neutral-500">{task.duration_minutes} мин</span>
                </div>
              </div>
            </div>
          )
        })
      )}

      {!loading && kind === 'one' && tasks.length > 0 && remaining.length === 0 && (
        <button
          onClick={load}
          className="mt-3 w-full rounded-xl bg-forest-500 text-white font-semibold py-3 cursor-pointer active:scale-[0.99] transition"
        >
          Показать ещё одну
        </button>
      )}
    </div>
  )
}