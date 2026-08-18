import { supabase } from './supabase'
import { getSettings } from './settings'
import { isPushSubscribed } from './push'

function localDateStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

async function showNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png' })
      return
    }
  } catch {
    // переходим к обычному Notification ниже
  }
  new Notification(title, { body })
}

// Проверяем, пора ли напомнить о дейликах
export async function checkReminder(): Promise<void> {
  if (isPushSubscribed()) return
  const settings = getSettings()
  if (!settings) return
  if (!settings.notifications_enabled) return

  const today = localDateStr()
  if (settings.paused_until !== null && settings.paused_until >= today) return

  const now = new Date()
  const [h, m] = (settings.reminder_time ?? '09:00').slice(0, 5).split(':').map(Number)
  const reminderTime = new Date()
  reminderTime.setHours(h, m, 0, 0)
  if (now < reminderTime) return

  // Уже напоминали сегодня — не спамим
  const remindedKey = `poryadok_reminded_${today}`
  if (localStorage.getItem(remindedKey)) return

  const { data } = await supabase
    .from('daily_plans')
    .select('id, is_completed')
    .eq('plan_date', today)
    .eq('is_completed', false)

  if (!data || data.length === 0) return

  localStorage.setItem(remindedKey, '1')
  await showNotification(
    'Пора навести порядок 🌿',
    `Осталось задач: ${data.length}. Загляни в приложение!`,
  )
}