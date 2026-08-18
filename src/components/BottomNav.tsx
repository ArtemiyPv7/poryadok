import { Home, Zap, BarChart3, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Screen } from '../types'

interface BottomNavProps {
  active: Screen
  onChange: (screen: Screen) => void
}

const items: { id: Screen; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'scenarios', icon: Zap, label: 'Сценарии' },
  { id: 'stats', icon: BarChart3, label: 'Прогресс' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
]

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-white border-t border-neutral-100 flex justify-around pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {items.map((item) => {
        const isActive = active === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex flex-col items-center px-2 py-1 cursor-pointer"
          >
            <span
              className={`p-2 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-forest-100 text-forest-700 shadow-[0_2px_8px_rgba(55,85,52,0.25)]'
                  : 'text-neutral-300'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            <span
              className={`text-[11px] mt-1 transition-colors ${
                isActive ? 'text-forest-700 font-semibold' : 'text-neutral-500'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}