import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { loadSettings, setSettingsLocal, previewSound, previewVibration } from '../lib/settings'
import { applyTheme } from '../lib/theme'
import { APP_VERSION } from '../lib/version'
import DevModal from '../components/DevModal'
import type { UserSettings } from '../types'

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-7 rounded-full relative cursor-pointer transition-colors ${
        on ? 'bg-forest-500' : 'bg-neutral-300'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-white px-4 py-3.5 flex items-center justify-between border-b border-neutral-50 last:border-b-0">
      <span className="text-sm text-neutral-900">{label}</span>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 px-1">
        {title}
      </div>
      <div className="rounded-2xl overflow-hidden shadow-sm">{children}</div>
    </div>
  )
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [devOpen, setDevOpen] = useState(false)

  useEffect(() => {
    loadSettings().then((s) => setSettings(s))
  }, [])

  async function update(patch: Partial<UserSettings>) {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    setSettingsLocal(next)
    if (patch.dark_mode !== undefined) applyTheme(patch.dark_mode)
    await supabase.from('user_settings').update(patch).eq('id', settings.id)
  }

  async function toggleNotifications() {
    if (!settings) return
    const turningOn = !settings.notifications_enabled
    if (turningOn && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    update({ notifications_enabled: turningOn })
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const paused =
    settings !== null && settings.paused_until !== null && settings.paused_until >= todayStr

  async function togglePause() {
    if (!settings) return
    if (paused) {
      await update({ paused_until: null })
    } else {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      await update({ paused_until: d.toISOString().slice(0, 10) })
    }
  }

  if (!settings) {
    return (
      <div className="px-5 pt-6">
        <p className="text-sm text-neutral-500">Загружаем настройки…</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-6">
      <p className="text-sm text-neutral-500 mb-1">Настройки</p>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-5">Профиль</h1>

      <div
        onClick={togglePause}
        className="bg-white rounded-2xl p-4 shadow-sm mb-5 text-center cursor-pointer active:scale-[0.99] transition"
      >
        <div
          className={`text-sm font-semibold mb-1 flex items-center justify-center gap-1.5 ${
            paused ? 'text-forest-700' : 'text-accent-orange'
          }`}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Снять с паузы' : 'Поставить на паузу'}
        </div>
        <div className="text-xs text-neutral-500">
          {paused ? 'Напоминания снова включены' : 'Отпуск или болезнь — напоминания молчат до завтра'}
        </div>
      </div>

      <Section title="План на день">
        <Row label="Сколько дейликов в день">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => update({ daily_tasks_count: n })}
                className={`w-9 h-9 rounded-xl text-sm font-semibold cursor-pointer transition ${
                  settings.daily_tasks_count === n
                    ? 'bg-forest-500 text-white'
                    : 'bg-neutral-50 text-neutral-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Уведомления">
        <Row label="Напоминание о дейликах">
          <Toggle on={settings.notifications_enabled} onChange={toggleNotifications} />
        </Row>
        <Row label="Время напоминания">
          <input
            type="time"
            value={settings.reminder_time?.slice(0, 5) ?? '09:00'}
            onChange={(e) => update({ reminder_time: e.target.value })}
            className="text-sm text-neutral-900 bg-neutral-50 rounded-lg px-2 py-1 outline-none"
          />
        </Row>
        <Row label="Умные подсказки">
          <Toggle
            on={settings.smart_hints_enabled}
            onChange={() => update({ smart_hints_enabled: !settings.smart_hints_enabled })}
          />
        </Row>
      </Section>

      <Section title="Эффекты">
        <Row label="Вибро при завершении">
          <Toggle
            on={settings.vibration_enabled}
            onChange={() => {
              const next = !settings.vibration_enabled
              update({ vibration_enabled: next })
              if (next) previewVibration()
            }}
          />
        </Row>
        <Row label="Звук при завершении">
          <Toggle
            on={settings.sound_enabled}
            onChange={() => {
              const next = !settings.sound_enabled
              update({ sound_enabled: next })
              if (next) previewSound()
            }}
          />
        </Row>
      </Section>

      <Section title="Внешний вид">
        <Row label="Тёмная тема">
          <Toggle on={settings.dark_mode} onChange={() => update({ dark_mode: !settings.dark_mode })} />
        </Row>
      </Section>

      <button
        onClick={() => setDevOpen(true)}
        className="block mx-auto text-[11px] text-neutral-300 mb-4 cursor-pointer"
      >
        Порядок v{APP_VERSION}
      </button>

      {devOpen && <DevModal onClose={() => setDevOpen(false)} />}
    </div>
  )
}