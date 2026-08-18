import { Sparkles } from 'lucide-react'
import { ROOM_ICONS } from '../lib/roomIcons'

interface RoomIconProps {
  icon: string
  size?: number
}

export default function RoomIcon({ icon, size = 22 }: RoomIconProps) {
  const Icon = ROOM_ICONS[icon] ?? Sparkles
  return <Icon size={size} />
}