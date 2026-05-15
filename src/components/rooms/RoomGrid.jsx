import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import RoomCard from './RoomCard'

const STATUS_MINI = {
  available:   { dot: 'bg-emerald-400', label: 'ว่าง' },
  occupied:    { dot: 'bg-blue-500',    label: 'เช่า' },
  dirty:       { dot: 'bg-amber-400',   label: 'รอ HK' },
  maintenance: { dot: 'bg-red-400',     label: 'ซ่อม' },
  reserved:    { dot: 'bg-violet-400',  label: 'จอง' },
}

export default function RoomGrid({ floors, rooms, onRoomClick, onAddRoom }) {
  const [collapsed, setCollapsed] = useState({})

  function toggle(floorId) {
    setCollapsed(prev => ({ ...prev, [floorId]: !prev[floorId] }))
  }

  return (
    <div className="space-y-3">
      {floors.map(floor => {
        const floorRooms = rooms.filter(r => r.floor_id === floor.id)
        const isCollapsed = collapsed[floor.id]

        const counts = {}
        Object.keys(STATUS_MINI).forEach(k => { counts[k] = floorRooms.filter(r => r.status === k).length })
        const occupiedCount = (counts.occupied || 0) + (counts.reserved || 0)
        const occupancyPct = floorRooms.length > 0 ? (occupiedCount / floorRooms.length) * 100 : 0

        return (
          <div key={floor.id}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

            {/* ─── Floor header ─── */}
            <button
              onClick={() => toggle(floor.id)}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100/80 transition-colors text-left"
            >
              <ChevronRight
                size={15}
                className={`text-gray-400 transition-transform duration-200 shrink-0 ${isCollapsed ? '' : 'rotate-90'}`}
              />

              <span className="font-bold text-gray-800 text-sm">{floor.name}</span>

              <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
                {floorRooms.length} ห้อง
              </span>

              {/* Status mini-breakdown */}
              <div className="flex items-center gap-3 ml-auto">
                {Object.entries(STATUS_MINI)
                  .filter(([k]) => counts[k] > 0)
                  .map(([k, v]) => (
                    <span key={k} className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${v.dot}`} />
                      <span className="font-medium text-gray-700">{counts[k]}</span>
                      <span className="text-gray-400">{v.label}</span>
                    </span>
                  ))}
              </div>

              {/* Occupancy bar */}
              {floorRooms.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">
                    {Math.round(occupancyPct)}%
                  </span>
                </div>
              )}
            </button>

            {/* ─── Room grid ─── */}
            {!isCollapsed && (
              <div className="p-4">
                {floorRooms.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-gray-400">
                    <p className="text-sm mb-3">ยังไม่มีห้องในชั้นนี้</p>
                    {onAddRoom && (
                      <button
                        onClick={() => onAddRoom(floor)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={12} /> เพิ่มห้องแรก
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                      {floorRooms.map(room => (
                        <RoomCard key={room.id} room={room} onClick={onRoomClick} />
                      ))}
                    </div>
                    {onAddRoom && (
                      <button
                        onClick={() => onAddRoom(floor)}
                        className="mt-3.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Plus size={13} /> เพิ่มห้อง
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
