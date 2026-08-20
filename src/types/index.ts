// Типы данных приложения "Порядок"

export interface Room {
  id: string
  name: string
  icon: string
  created_at: string
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Task {
  id: string
  room_id: string
  title: string
  description: string | null
  difficulty: Difficulty
  duration_minutes: number
  frequency_days: number
  is_seasonal: boolean
  due_month: number | null
  due_day: number | null
  last_completed_at: string | null
  created_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  created_at: string
}

export interface TaskHistory {
  id: string
  task_id: string
  completed_at: string
  duration_minutes: number | null
}

export interface UserSettings {
  id: string
  daily_tasks_count: number
  reminder_time: string
  notifications_enabled: boolean
  smart_hints_enabled: boolean
  dark_mode: boolean
  vibration_enabled: boolean
  sound_enabled: boolean
  paused_until: string | null
}

// Экраны приложения
export type Screen = 'home' | 'scenarios' | 'stats' | 'settings'

export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[]
}