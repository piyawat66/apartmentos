import { Wifi, Wind, Tv, Refrigerator, Droplets, Users } from 'lucide-react'
import { ROOM_TYPE, AMENITY_LABELS } from '../../utils/statusUtils'

const amenityIcons = { wifi: Wifi, ac: Wind, tv: Tv, fridge: Refrigerator, water_heater: Droplets }

const STATUS_STYLE = {
  available:   {
    border: 'border-l-emerald-400', bg: 'hover:bg-emerald-50/60',
    badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400',
    price: 'text-emerald-700', label: 'ว่าง',
  },
  occupied:    {
    border: 'border-l-blue-500',   bg: 'bg-blue-50/50 hover:bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',
    price: 'text-blue-700',        label: 'มีผู้เช่า',
  },
  dirty:       {
    border: 'border-l-amber-400',  bg: 'bg-amber-50/40 hover:bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400',
    price: 'text-amber-700',       label: 'รอทำความสะอาด',
  },
  maintenance: {
    border: 'border-l-red-400',    bg: 'bg-red-50/40 hover:bg-red-50',
    badge: 'bg-red-100 text-red-700',         dot: 'bg-red-400',
    price: 'text-red-700',         label: 'ซ่อมบำรุง',
  },
  reserved:    {
    border: 'border-l-violet-400', bg: 'bg-violet-50/40 hover:bg-violet-50',
    badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400',
    price: 'text-violet-700',      label: 'จองแล้ว',
  },
}

export default function RoomCard({ room, onClick }) {
  const s = STATUS_STYLE[room.status] || STATUS_STYLE.available

  return (
    <button
      onClick={() => onClick?.(room)}
      className={`group relative w-full text-left rounded-xl border border-gray-100 border-l-4 ${s.border} ${s.bg} bg-white p-3 transition-all hover:shadow-md hover:-translate-y-px`}
    >
      {/* Room number + status dot */}
      <div className="flex items-start justify-between mb-1">
        <span className="text-xl font-black text-gray-800 leading-none tracking-tight">
          {room.room_number}
        </span>
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
      </div>

      {/* Type label */}
      <p className="text-xs text-gray-400 mb-2.5">{ROOM_TYPE[room.room_type] || room.room_type}</p>

      {/* Price */}
      <p className={`text-sm font-bold leading-none mb-3 ${s.price}`}>
        {room.base_price?.toLocaleString()}<span className="text-xs font-normal ml-0.5">฿</span>
      </p>

      {/* Bottom: amenity icons + occupancy */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100/80">
        <div className="flex gap-0.5">
          {(room.amenities || []).slice(0, 4).map(a => {
            const Icon = amenityIcons[a]
            return Icon ? (
              <span key={a} title={AMENITY_LABELS[a]}
                className="w-5 h-5 rounded-md flex items-center justify-center bg-gray-100 text-gray-400 group-hover:bg-gray-200 transition-colors">
                <Icon size={10} strokeWidth={2.5} />
              </span>
            ) : null
          })}
          {(room.amenities || []).length > 4 && (
            <span className="w-5 h-5 rounded-md flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-bold">
              +{(room.amenities || []).length - 4}
            </span>
          )}
        </div>
        <span className="flex items-center gap-0.5 text-xs text-gray-400">
          <Users size={10} strokeWidth={2.5} /> {room.max_occupancy}
        </span>
      </div>
    </button>
  )
}
