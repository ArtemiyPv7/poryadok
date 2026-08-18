import type { Difficulty } from '../types'

export const DIFFICULTIES: {
  value: Difficulty
  label: string
  tagClass: string
  activeClass: string
}[] = [
  {
    value: 'easy',
    label: 'Легко',
    tagClass: 'bg-forest-100 text-forest-700',
    activeClass: 'bg-forest-500 text-white',
  },
  {
    value: 'medium',
    label: 'Средне',
    tagClass: 'bg-accent-peach/40 text-neutral-700',
    activeClass: 'bg-accent-peach text-neutral-900',
  },
  {
    value: 'hard',
    label: 'Сложно',
    tagClass: 'bg-accent-orange/15 text-accent-orange',
    activeClass: 'bg-accent-orange text-white',
  },
]

export function difficultyInfo(value: Difficulty) {
  return DIFFICULTIES.find((d) => d.value === value) ?? DIFFICULTIES[0]
}