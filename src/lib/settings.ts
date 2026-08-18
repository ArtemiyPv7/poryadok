import { supabase } from './supabase'
import type { UserSettings } from '../types'

let current: UserSettings | null = null

export async function loadSettings(): Promise<UserSettings | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (data) current = data as UserSettings
  return current
}

export function setSettingsLocal(s: UserSettings) {
  current = s
}

export function getSettings(): UserSettings | null {
  return current
}

let audioCtx: AudioContext | null = null

function playDing() {
  try {
    audioCtx = audioCtx ?? new AudioContext()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.type = 'sine'
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3)
    o.connect(g).connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + 0.35)
  } catch {
    // звук недоступен — просто пропускаем
  }
}

// Превью для настроек и дев-меню: нажал — почувствовал
export function previewSound() {
  playDing()
}

export function previewVibration() {
  if ('vibrate' in navigator) navigator.vibrate(80)
}

export function playCompleteEffects() {
  if (current?.vibration_enabled && 'vibrate' in navigator) navigator.vibrate(80)
  if (current?.sound_enabled) playDing()
}