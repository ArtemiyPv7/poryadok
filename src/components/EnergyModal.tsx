import { X } from 'lucide-react'
import { ENERGY_OPTIONS } from '../lib/energy'
import type { Energy } from '../lib/daily'

interface EnergyModalProps {
  current: Energy
  onSelect: (energy: Energy) => void
  onClose: () => void
}

export default function EnergyModal({ current, onSelect, onClose }: EnergyModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/40 flex items-end justify-center sm:items-center anim-fade"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 anim-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-neutral-900">Сколько сегодня сил?</h2>
          <button onClick={onClose} className="text-neutral-500 p-1 cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-2">
          {ENERGY_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = current === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition cursor-pointer text-left ${
                  isActive ? 'border-forest-500 bg-forest-100/50' : 'border-neutral-100'
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-forest-500 text-white' : 'bg-neutral-50 text-neutral-500'
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-neutral-900">{opt.label}</span>
                  <span className="block text-xs text-neutral-500">{opt.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}