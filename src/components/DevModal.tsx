import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pendingCount, flushPending } from '../lib/offline'
import { readCache } from '../lib/cache'
import { previewSound, previewVibration } from '../lib/settings'

interface DevModalProps {
  onClose: () => void
}

const BTN =
  'rounded-xl bg-neutral-50 text-neutral-700 text-sm font-medium py-2.5 cursor-pointer active:scale-[0.98] transition'

export default function DevModal({ onClose }: DevModalProps) {
  const [info, setInfo] = useState('')

  function refreshInfo() {
    const cache = readCache()
    const lines = [
      `online: ${navigator.onLine}`,
      `vibro: ${'vibrate' in navigator ? 'поддерживается' : 'НЕТ (на iOS так всегда)'}`,
      `notifications: ${
        'Notification' in window ? Notification.permission : 'НЕТ (на iOS так всегда)'
      }`,
      `очередь офлайн: ${pendingCount()}`,
      `кэш: ${cache ? new Date(cache.savedAt).toLocaleString('ru-RU') : 'пусто'}`,
    ]
    setInfo(lines.join('\n'))
  }

  useEffect(() => {
    refreshInfo()
  }, [])

  function testVibration() {
    if (!('vibrate' in navigator)) {
      setInfo((s) => s + '\n❌ Vibration API недоступен на этом устройстве')
      return
    }
    previewVibration()
  }

  async function testNotification() {
    if (!('Notification' in window)) {
      setInfo((s) => s + '\n❌ Notification API недоступен на этом устройстве')
      return
    }
    if (Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission !== 'granted') {
      setInfo((s) => s + '\n❌ Нет разрешения на уведомления')
      return
    }
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification('Тест 🌿', { body: 'Уведомления работают!' })
    } else {
      new Notification('Тест 🌿', { body: 'Уведомления работают!' })
    }
  }

  async function sendQueue() {
    await flushPending()
    refreshInfo()
  }

  function clearCache() {
    localStorage.removeItem('poryadok_cache_v1')
    localStorage.removeItem('poryadok_pending_completes')
    refreshInfo()
  }

  async function resetTodayPlan() {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    await supabase.from('daily_plans').delete().eq('plan_date', `${d.getFullYear()}-${m}-${day}`)
    setInfo((s) => s + '\n✅ План на сегодня сброшен — перегенерируется при входе')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/40 flex items-end justify-center sm:items-center anim-fade"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto anim-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-900">Для разработчика</h2>
          <button onClick={onClose} className="text-neutral-500 p-1 cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <pre className="text-xs bg-neutral-50 rounded-xl p-3 mb-4 whitespace-pre-wrap text-neutral-700">
          {info}
        </pre>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={testVibration} className={BTN}>
            Вибро 80мс
          </button>
          <button onClick={previewSound} className={BTN}>
            Звук
          </button>
          <button onClick={testNotification} className={BTN}>
            Уведомление
          </button>
          <button onClick={sendQueue} className={BTN}>
            Отправить очередь
          </button>
          <button onClick={clearCache} className={BTN}>
            Очистить кэш
          </button>
          <button onClick={resetTodayPlan} className={BTN}>
            Сбросить план
          </button>
        </div>
      </div>
    </div>
  )
}