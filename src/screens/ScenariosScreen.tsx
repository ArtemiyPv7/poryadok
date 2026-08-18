import { useState } from 'react'
import {
  ListChecks, Target, Users, Timer, Sparkles, PartyPopper, CalendarDays,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import FreeModeScreen from './FreeModeScreen'
import ScenarioRunScreen from '../components/ScenarioRunScreen'
import SeasonalScreen from './SeasonalScreen'
import type { ScenarioKind } from '../lib/scenarios'

const RUN_CARDS: {
  kind: ScenarioKind
  title: string
  subtitle: string
  icon: LucideIcon
  bg: string
}[] = [
  {
    kind: 'one',
    title: 'Одна задача',
    subtitle: 'Самая нужная задача прямо сейчас',
    icon: Target,
    bg: 'bg-forest-100 text-forest-700',
  },
  {
    kind: 'guests',
    title: 'Гости через час',
    subtitle: 'Видимые зоны, быстрая уборка · ~20 мин',
    icon: Users,
    bg: 'bg-accent-orange/15 text-accent-orange',
  },
  {
    kind: 'quick',
    title: 'Быстрая уборка',
    subtitle: 'Самые срочные задачи · 15 мин',
    icon: Timer,
    bg: 'bg-forest-100 text-forest-700',
  },
  {
    kind: 'deep',
    title: 'Генеральная',
    subtitle: 'Большая уборка · до 2 часов',
    icon: Sparkles,
    bg: 'bg-accent-peach/40 text-neutral-700',
  },
  {
    kind: 'party',
    title: 'После вечеринки',
    subtitle: 'Кухня, гостиная, прихожая · 45 мин',
    icon: PartyPopper,
    bg: 'bg-accent-peach/40 text-neutral-700',
  },
]

type View =
  | { type: 'list' }
  | { type: 'free' }
  | { type: 'seasonal' }
  | { type: 'run'; kind: ScenarioKind; title: string; subtitle: string }

export default function ScenariosScreen() {
  const [view, setView] = useState<View>({ type: 'list' })

  if (view.type === 'free') {
    return <FreeModeScreen onBack={() => setView({ type: 'list' })} />
  }

  if (view.type === 'seasonal') {
    return <SeasonalScreen onBack={() => setView({ type: 'list' })} />
  }

  if (view.type === 'run') {
    return (
      <ScenarioRunScreen
        kind={view.kind}
        title={view.title}
        subtitle={view.subtitle}
        onBack={() => setView({ type: 'list' })}
      />
    )
  }

  return (
    <div className="px-5 pt-6">
      <p className="text-sm text-neutral-500 mb-1">Быстрый старт</p>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-5">Сценарии</h1>

      <div
        onClick={() => setView({ type: 'free' })}
        className="bg-white rounded-2xl p-5 shadow-sm mb-3 cursor-pointer active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center">
            <ListChecks size={22} />
          </div>
          <div className="font-semibold text-neutral-900">Свободный режим</div>
        </div>
        <p className="text-sm text-neutral-500">
          Все задачи дома, грязные комнаты сверху. Отмечай что хочешь.
        </p>
      </div>

      {RUN_CARDS.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.kind}
            onClick={() =>
              setView({ type: 'run', kind: card.kind, title: card.title, subtitle: card.subtitle })
            }
            className="bg-white rounded-2xl p-5 shadow-sm mb-3 cursor-pointer active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg}`}>
                <Icon size={22} />
              </div>
              <div className="font-semibold text-neutral-900">{card.title}</div>
            </div>
            <p className="text-sm text-neutral-500">{card.subtitle}</p>
          </div>
        )
      })}

      <div
        onClick={() => setView({ type: 'seasonal' })}
        className="bg-white rounded-2xl p-5 shadow-sm mb-3 cursor-pointer active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div className="font-semibold text-neutral-900">Сезонные задачи</div>
        </div>
        <p className="text-sm text-neutral-500">
          Окна, кондиционер, гардероб — когда придёт время.
        </p>
      </div>
    </div>
  )
}