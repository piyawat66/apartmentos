import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { ROOM_STATUS, ROOM_TYPE, AMENITY_LABELS } from '../../utils/statusUtils'
import { formatPrice } from '../../utils/priceUtils'
import { Pencil, User, Wifi, Wind, Tv, Refrigerator, Droplets } from 'lucide-react'

const amenityIcons = { wifi: Wifi, ac: Wind, tv: Tv, fridge: Refrigerator, water_heater: Droplets }

export default function RoomDetailModal({ isOpen, onClose, room, onStatusChange, onEdit, canEdit }) {
  if (!room) return null
  const s = ROOM_STATUS[room.status] || { label: room.status, bg: 'bg-gray-100', text: 'text-gray-600' }

  const canChangeStatus = ['available', 'dirty', 'maintenance'].includes(room.status)
  const statusActions = room.status === 'dirty'
    ? [{ status: 'available', label: 'ทำความสะอาดแล้ว', variant: 'success' }]
    : room.status === 'maintenance'
    ? [{ status: 'available', label: 'ซ่อมเสร็จแล้ว', variant: 'success' }]
    : room.status === 'available'
    ? [{ status: 'dirty', label: 'ตั้งเป็นรอทำความสะอาด', variant: 'secondary' }, { status: 'maintenance', label: 'ตั้งเป็นซ่อมบำรุง', variant: 'danger' }]
    : []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ห้อง ${room.room_number}`} size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>{s.label}</span>
          {canEdit && (
            <button onClick={() => onEdit(room)} className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              <Pencil size={13} /> แก้ไขข้อมูล
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">ประเภท:</span> <span className="font-medium">{ROOM_TYPE[room.room_type] || room.room_type}</span></div>
          <div><span className="text-gray-500">ราคา:</span> <span className="font-medium text-indigo-600">{formatPrice(room.base_price)}</span></div>
          <div className="flex items-center gap-1"><User size={13} className="text-gray-400" /> <span className="text-gray-500">สูงสุด</span> <span className="font-medium">{room.max_occupancy} คน</span></div>
        </div>

        {(room.amenities || []).length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">สิ่งอำนวยความสะดวก</p>
            <div className="flex flex-wrap gap-1.5">
              {room.amenities.map(a => {
                const Icon = amenityIcons[a]
                return (
                  <span key={a} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                    {Icon && <Icon size={11} />} {AMENITY_LABELS[a] || a}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {room.notes && <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{room.notes}</p>}

        {statusActions.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-2">เปลี่ยนสถานะ</p>
            <div className="flex flex-wrap gap-2">
              {statusActions.map(a => (
                <Button key={a.status} variant={a.variant} size="sm" onClick={() => onStatusChange(room.id, a.status)}>{a.label}</Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
