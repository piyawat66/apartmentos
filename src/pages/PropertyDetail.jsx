import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, LayoutGrid,
  BedDouble, Users, Wrench, CheckCircle2, Layers, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { floorsService, roomsService } from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import RoomGrid from '../components/rooms/RoomGrid'
import BulkAddRoomModal from '../components/rooms/BulkAddRoomModal'
import RoomDetailModal from '../components/rooms/RoomDetailModal'
import { ROOM_STATUS, ROOM_TYPE } from '../utils/statusUtils'

const FILTER_CONFIG = [
  { key: 'all',         label: 'ทั้งหมด',          dot: null,             dotClass: '' },
  { key: 'available',   label: 'ว่าง',              dot: true,             dotClass: 'bg-emerald-400' },
  { key: 'occupied',    label: 'มีผู้เช่า',          dot: true,             dotClass: 'bg-blue-500' },
  { key: 'dirty',       label: 'รอทำความสะอาด',     dot: true,             dotClass: 'bg-amber-400' },
  { key: 'maintenance', label: 'ซ่อมบำรุง',          dot: true,             dotClass: 'bg-red-400' },
  { key: 'reserved',    label: 'จองแล้ว',            dot: true,             dotClass: 'bg-violet-400' },
]

export default function PropertyDetail() {
  const { activePropertyId, activeProperty } = useProperty()
  const { user } = useAuth()
  const navigate = useNavigate()
  const canEdit = ['admin', 'manager'].includes(user?.role)
  const qc = useQueryClient()

  const [floorModal, setFloorModal]           = useState(false)
  const [editFloor, setEditFloor]             = useState(null)
  const [roomModal, setRoomModal]             = useState(false)
  const [bulkModal, setBulkModal]             = useState(false)
  const [selectedFloor, setSelectedFloor]     = useState(null)
  const [selectedRoom, setSelectedRoom]       = useState(null)
  const [editRoom, setEditRoom]               = useState(null)
  const [roomDetailModal, setRoomDetailModal] = useState(false)
  const [filterStatus, setFilterStatus]       = useState('all')
  const [deleteFloorTarget, setDeleteFloorTarget] = useState(null)

  const { data: floors = [] } = useQuery({
    queryKey: ['floors', activePropertyId],
    queryFn: () => floorsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const saveFloorMutation = useMutation({
    mutationFn: (data) => editFloor
      ? floorsService.update(editFloor.id, data)
      : floorsService.create({ ...data, property_id: activePropertyId }),
    onSuccess: () => { qc.invalidateQueries(); toast.success('บันทึกสำเร็จ'); setFloorModal(false); setEditFloor(null) },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })
  const deleteFloorMutation = useMutation({
    mutationFn: (id) => floorsService.delete(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('ลบชั้นสำเร็จ') },
  })
  const saveRoomMutation = useMutation({
    mutationFn: (data) => editRoom
      ? roomsService.update(editRoom.id, data)
      : roomsService.create({ ...data, floor_id: selectedFloor?.id, property_id: activePropertyId }),
    onSuccess: () => { qc.invalidateQueries(); toast.success('บันทึกสำเร็จ'); setRoomModal(false); setEditRoom(null) },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })
  const bulkAddMutation = useMutation({
    mutationFn: (r) => roomsService.bulkCreate(r),
    onSuccess: () => { qc.invalidateQueries(); toast.success('เพิ่มห้องสำเร็จ'); setBulkModal(false) },
  })
  const deleteRoomMutation = useMutation({
    mutationFn: (id) => roomsService.delete(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('ลบห้องสำเร็จ') },
  })
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => roomsService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(); toast.success('อัปเดตสถานะสำเร็จ') },
  })

  const filteredRooms = filterStatus === 'all' ? rooms : rooms.filter(r => r.status === filterStatus)

  // Stats
  const occupied    = rooms.filter(r => r.status === 'occupied').length
  const available   = rooms.filter(r => r.status === 'available').length
  const needsWork   = rooms.filter(r => ['maintenance', 'dirty'].includes(r.status)).length
  const occupancyPct = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title={`ผังห้อง — ${activeProperty?.name || ''}`}
        actions={canEdit && (
          <Button variant="outline" size="sm" onClick={() => navigate('/properties')}>
            <Building2 size={14} /> จัดการที่พัก
          </Button>
        )}
      />

      <div className="p-4 sm:p-6 space-y-5">

        {/* ─── Summary stats ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BedDouble}    color="indigo" label="ห้องทั้งหมด"    value={rooms.length}    sub={`${floors.length} ชั้น`} />
          <StatCard icon={Users}        color="blue"   label="มีผู้เช่า"       value={occupied}        sub={`Occupancy ${occupancyPct}%`} bar={occupancyPct} />
          <StatCard icon={CheckCircle2} color="green"  label="ห้องว่าง"        value={available}       sub="พร้อมให้เช่า" />
          <StatCard icon={Wrench}       color="orange" label="ซ่อม/รอทำความสะอาด" value={needsWork}  sub="ต้องดำเนินการ" />
        </div>

        {/* ─── Filter pills ─── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_CONFIG.map(({ key, label, dot, dotClass }) => {
            const count = key === 'all' ? rooms.length : rooms.filter(r => r.status === key).length
            const active = filterStatus === key
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-white/70' : dotClass}`} />}
                {label}
                <span className={`text-xs font-bold ${active ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* ─── Floor + Room Grid ─── */}
        {!activePropertyId ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <LayoutGrid size={48} className="mb-4 opacity-20" />
            <p className="text-sm">กรุณาเลือกที่พักก่อน หรือโหลดข้อมูลตัวอย่างที่หน้า ตั้งค่า</p>
          </div>
        ) : floors.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <LayoutGrid size={48} className="mb-4 opacity-20" />
            <p className="text-sm">ยังไม่มีชั้น — เพิ่มชั้นก่อนเพื่อเริ่มต้น</p>
            {canEdit && (
              <Button variant="primary" className="mt-4" onClick={() => { setEditFloor(null); setFloorModal(true) }}>
                <Plus size={14} /> เพิ่มชั้นแรก
              </Button>
            )}
          </div>
        ) : (
          <RoomGrid
            floors={floors}
            rooms={filteredRooms}
            onRoomClick={(room) => { setSelectedRoom(room); setRoomDetailModal(true) }}
            onAddRoom={canEdit ? (floor) => { setSelectedFloor(floor); setRoomModal(true); setEditRoom(null) } : null}
          />
        )}

        {/* ─── Floor management ─── */}
        {canEdit && floors.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers size={12} /> จัดการชั้น
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setEditFloor(null); setFloorModal(true) }}>
                <Plus size={14} /> เพิ่มชั้น
              </Button>
              {floors.map(f => (
                <div key={f.id}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
                  <span className="text-gray-700 font-medium">{f.name}</span>
                  <button
                    onClick={() => { setEditFloor(f); setFloorModal(true) }}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteFloorTarget(f)}
                    className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      <FloorModal
        isOpen={floorModal}
        onClose={() => { setFloorModal(false); setEditFloor(null) }}
        initial={editFloor}
        rooms={editFloor ? rooms.filter(r => r.floor_id === editFloor.id) : []}
        onSubmit={d => saveFloorMutation.mutate(d)}
        loading={saveFloorMutation.isPending}
        canEdit={canEdit}
        onEditRoom={(room) => {
          setFloorModal(false)
          setEditRoom(room)
          setSelectedFloor(floors.find(f => f.id === room.floor_id))
          setRoomModal(true)
        }}
        onDeleteRoom={(id) => deleteRoomMutation.mutate(id)}
      />

      <RoomModal
        isOpen={roomModal}
        onClose={() => { setRoomModal(false); setEditRoom(null) }}
        initial={editRoom}
        floor={selectedFloor}
        onSubmit={d => saveRoomMutation.mutate(d)}
        loading={saveRoomMutation.isPending}
        onBulk={() => { setRoomModal(false); setBulkModal(true) }}
      />

      <BulkAddRoomModal
        isOpen={bulkModal}
        onClose={() => setBulkModal(false)}
        floor={selectedFloor}
        onSuccess={r => bulkAddMutation.mutate(r)}
      />

      <DeleteFloorModal
        floor={deleteFloorTarget}
        isOpen={!!deleteFloorTarget}
        onClose={() => setDeleteFloorTarget(null)}
        onConfirm={() => { deleteFloorMutation.mutate(deleteFloorTarget.id); setDeleteFloorTarget(null) }}
        loading={deleteFloorMutation.isPending}
      />

      {selectedRoom && (
        <RoomDetailModal
          isOpen={roomDetailModal}
          onClose={() => setRoomDetailModal(false)}
          room={selectedRoom}
          canEdit={canEdit}
          onStatusChange={(id, status) => { updateStatusMutation.mutate({ id, status }); setRoomDetailModal(false) }}
          onEdit={(room) => {
            setEditRoom(room)
            setSelectedFloor(floors.find(f => f.id === room.floor_id))
            setRoomDetailModal(false)
            setRoomModal(true)
          }}
        />
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, label, value, sub, bar }) {
  const palette = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', bar: 'bg-indigo-400' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-400' },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', bar: 'bg-emerald-400' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', bar: 'bg-orange-400' },
  }
  const p = palette[color] || palette.indigo
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-11 h-11 ${p.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={20} className={p.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-black text-gray-800 leading-tight">{value}</p>
        {bar !== undefined ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${p.bar} rounded-full`} style={{ width: `${bar}%` }} />
            </div>
            <span className="text-xs text-gray-400 shrink-0">{sub}</span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}

// ─── FloorModal ───────────────────────────────────────────────────────────────

function FloorModal({ isOpen, onClose, initial, rooms, onSubmit, loading, canEdit, onEditRoom, onDeleteRoom }) {
  const [form, setForm] = useState({ name: '', floor_number: 1, description: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    if (initial) setForm({ name: initial.name || '', floor_number: initial.floor_number || 1, description: initial.description || '' })
    else setForm({ name: '', floor_number: 1, description: '' })
    setDeleteConfirm(null)
  }, [isOpen, initial?.id])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? `แก้ไขชั้น — ${initial.name}` : 'เพิ่มชั้น'} size={initial ? 'lg' : 'sm'}>
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="ชื่อชั้น *" placeholder="เช่น ชั้น 1, ชั้น G" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="ลำดับชั้น" type="number" value={form.floor_number} onChange={e => setForm(f => ({ ...f, floor_number: Number(e.target.value) }))} />
          </div>
          <Input label="หมายเหตุ" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.name || loading}>บันทึก</Button>
          </div>
        </div>

        {initial && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">ห้องในชั้นนี้ ({rooms.length} ห้อง)</p>
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีห้องในชั้นนี้</p>
            ) : (
              <div className="space-y-1.5">
                {rooms.map(room => (
                  <div key={room.id}>
                    {deleteConfirm === room.id ? (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm text-red-700 font-medium">ยืนยันลบห้อง {room.room_number}?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                          <button onClick={() => { onDeleteRoom(room.id); setDeleteConfirm(null) }} className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">ลบ</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-gray-800 w-10">ห้อง {room.room_number}</span>
                          <span className="text-xs text-gray-500">{ROOM_TYPE[room.room_type] || room.room_type}</span>
                          <RoomStatusDot status={room.status} />
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => onEditRoom(room)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteConfirm(room.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function RoomStatusDot({ status }) {
  const map = {
    available:   { dot: 'bg-emerald-400', label: 'ว่าง' },
    occupied:    { dot: 'bg-blue-500',    label: 'มีผู้เช่า' },
    dirty:       { dot: 'bg-amber-400',   label: 'รอทำความสะอาด' },
    maintenance: { dot: 'bg-red-400',     label: 'ซ่อมบำรุง' },
    reserved:    { dot: 'bg-violet-400',  label: 'จองแล้ว' },
  }
  const m = map[status] || { dot: 'bg-gray-300', label: status }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <span className={`w-2 h-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ─── DeleteFloorModal ─────────────────────────────────────────────────────────

function DeleteFloorModal({ floor, isOpen, onClose, onConfirm, loading }) {
  const [input, setInput] = useState('')
  if (!isOpen) return null

  function handleClose() { setInput(''); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">ลบชั้น "{floor?.name}"</h2>
            <p className="text-xs text-gray-500 mt-0.5">การดำเนินการนี้ไม่สามารถเรียกคืนได้</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-sm text-red-700">
          <p className="font-semibold mb-1">⚠️ ข้อควรระวัง</p>
          <p>ห้องทั้งหมดในชั้นนี้จะถูกลบออกพร้อมกัน รวมถึงข้อมูลที่เกี่ยวข้อง</p>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            พิมพ์ <span className="font-bold text-red-600">ยืนยัน</span> เพื่อดำเนินการต่อ
          </label>
          <input
            type="text" autoFocus value={input}
            onChange={e => setInput(e.target.value)} placeholder="ยืนยัน"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>ยกเลิก</Button>
          <button
            onClick={() => { onConfirm(); setInput('') }}
            disabled={input !== 'ยืนยัน' || loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'กำลังลบ...' : 'ลบชั้น'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RoomModal ────────────────────────────────────────────────────────────────

function RoomModal({ isOpen, onClose, initial, floor, onSubmit, loading, onBulk }) {
  const defaultForm = {
    room_number: '', room_type: 'ac', base_price: 4500,
    max_occupancy: 2, amenities: ['wifi', 'ac'], notes: '', status: 'available',
  }
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    if (!isOpen) return
    setForm(initial ? { ...defaultForm, ...initial, amenities: initial.amenities || [] } : defaultForm)
  }, [isOpen, initial?.id])

  const amenityOptions = [
    { key: 'wifi', label: 'WiFi' }, { key: 'ac', label: 'แอร์' }, { key: 'tv', label: 'ทีวี' },
    { key: 'fridge', label: 'ตู้เย็น' }, { key: 'water_heater', label: 'เครื่องทำน้ำอุ่น' },
  ]

  function toggleAmenity(key) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(key) ? f.amenities.filter(a => a !== key) : [...f.amenities, key],
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${initial ? 'แก้ไข' : 'เพิ่ม'}ห้อง — ${floor?.name || ''}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="หมายเลขห้อง *" placeholder="101" value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} />
          <Select label="ประเภทห้อง" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
            <option value="ac">ห้องแอร์</option>
            <option value="fan">ห้องพัดลม</option>
            <option value="large">ห้องใหญ่</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="ราคา/เดือน (บาท)" type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: Number(e.target.value) }))} />
          <Input label="จำนวนคนสูงสุด" type="number" min={1} value={form.max_occupancy} onChange={e => setForm(f => ({ ...f, max_occupancy: Number(e.target.value) }))} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">สิ่งอำนวยความสะดวก</p>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map(a => (
              <button key={a.key} type="button" onClick={() => toggleAmenity(a.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.amenities.includes(a.key)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                }`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <Input label="หมายเหตุ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <div className="flex justify-between items-center pt-2">
          {!initial && (
            <button type="button" onClick={onBulk} className="text-sm text-indigo-600 hover:underline">
              + เพิ่มหลายห้องพร้อมกัน
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.room_number || loading}>บันทึก</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
