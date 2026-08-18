import { useEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import ScenariosScreen from './screens/ScenariosScreen'
import StatsScreen from './screens/StatsScreen'
import SettingsScreen from './screens/SettingsScreen'
import { isOnline, flushPending } from './lib/offline'
import { loadSettings } from './lib/settings'
import { checkReminder } from './lib/reminder'
import { applyTheme } from './lib/theme'
import type { Screen } from './types'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    loadSettings().then((s) => {
      applyTheme(s?.dark_mode ?? false)
      checkReminder()
    })

    const reminderTimer = setInterval(checkReminder, 60000)

    const goOnline = () => {
      setOnline(true)
      flushPending()
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      clearInterval(reminderTimer)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-md mx-auto min-h-screen relative">
        {!online && (
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-accent-peach text-neutral-900 text-xs font-semibold text-center py-1.5">
            Офлайн — показываем сохранённые данные
          </div>
        )}
        <main key={screen} className="pb-20 anim-fade">
          {screen === 'home' && <HomeScreen />}
          {screen === 'scenarios' && <ScenariosScreen />}
          {screen === 'stats' && <StatsScreen />}
          {screen === 'settings' && <SettingsScreen />}
        </main>
        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </div>
  )
}

export default App