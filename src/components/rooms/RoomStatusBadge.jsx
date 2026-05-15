import Badge from '../ui/Badge'
import { roomStatusClass } from '../../utils/statusUtils'

export default function RoomStatusBadge({ status }) {
  const s = roomStatusClass(status)
  return <Badge className={`${s.bg} ${s.text}`}>{s.label}</Badge>
}
