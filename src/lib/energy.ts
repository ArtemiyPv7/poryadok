import { BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Energy } from './daily'

export const ENERGY_OPTIONS: {
  value: Energy
  label: string
  hint: string
  icon: LucideIcon
}[] = [
  { value: 'low', label: 'Мало сил', hint: 'Лёгкие задачи, около 15 минут', icon: BatteryLow },
  { value: 'normal', label: 'Нормально', hint: 'Сбалансированно, около 30 минут', icon: BatteryMedium },
  { value: 'high', label: 'Много сил', hint: 'Возьмём и сложные, до 60 минут', icon: BatteryFull },
]