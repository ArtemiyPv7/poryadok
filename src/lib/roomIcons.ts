import {
  CookingPot, Bath, ShowerHead, Sofa, BedDouble, Baby,
  DoorOpen, Laptop, TreePine, WashingMachine, Car, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ROOM_ICONS: Record<string, LucideIcon> = {
  kitchen: CookingPot,
  bath: Bath,
  shower: ShowerHead,
  living: Sofa,
  bedroom: BedDouble,
  kids: Baby,
  hall: DoorOpen,
  office: Laptop,
  balcony: TreePine,
  laundry: WashingMachine,
  garage: Car,
  other: Sparkles,
}

export const ROOM_ICON_LABELS: Record<string, string> = {
  kitchen: 'Кухня',
  bath: 'Ванная',
  shower: 'Душ',
  living: 'Гостиная',
  bedroom: 'Спальня',
  kids: 'Детская',
  hall: 'Прихожая',
  office: 'Кабинет',
  balcony: 'Балкон',
  laundry: 'Прачечная',
  garage: 'Гараж',
  other: 'Другое',
}