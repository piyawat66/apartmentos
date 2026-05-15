import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, Clock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { housekeepingService, roomsService } from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Select, Textarea } from '../components/ui/Input'
import { HK_STATUS } from '../utils/statusUtils'
import { formatDateTimeTH } from '../utils/dateUtils'

export default function Housekeeping() {
  const { activePropertyId } = useProperty()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const { data: logs = [] } = useQuery({
    queryKey: ['housekeeping', activePropertyId],
    queryFn: () => housekeepingService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const dirtyRooms = rooms.filter(r => r.status === 'dirty')

  const createMutation = useMutation({
    mutationFn: (data) => housekeepingService.create({ ...data, status: 'pending', assigned_to: 'user-housekeeper' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['housekeeping'] }); toast.success('สร้างงานสำเร็จ'); setModal(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => housekeepingService.update(id, { status, ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['housekeeping'] }); qc.invalidateQueries({ queryKey: ['rooms'] }); toast.success('อัปเดตสถานะสำเร็จ') },
  })

  const filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter)

  const statusCounts = { pending: logs.filter(l => l.status === 'pending').length, in_progress: logs.filter(l => l.status === 'in_progress').length, done: logs.filter(l => l.status === 'done').length }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="แม่บ้าน" />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(HK_STATUS).map(([key, val]) => (
            <div key={key} className={`rounded-xl border p-4 flex items-center gap-3 bg-white`}>
              <div className={`w-9 h-9 rounded-lg ${val.bg} flex items-center justify-center`}>
                {key === 'done' ? <CheckCircle size={18} className={val.text} /> : key === 'in_progress' ? <Sparkles size={18} className={val.text} /> : <Clock size={18} className={val.text} />}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{statusCounts[key] || 0}</p>
                <p className="text-xs text-gray-500">{val.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dirty rooms alert */}
        {dirtyRooms.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">ห้องรอทำความสะอาด {dirtyRooms.length} ห้อง</p>
            <div className="flex flex-wrap gap-2">
              {dirtyRooms.map(r => (
                <button key={r.id} onClick={() => createMutation.mutate({ room_id: r.id, notes: '' })}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors">
                  ห้อง {r.room_number} → มอบหมาย
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter + Create */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['all', 'pending', 'in_progress', 'done'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {s === 'all' ? 'ทั้งหมด' : HK_STATUS[s]?.label}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={14} /> สร้างงาน</Button>
        </div>

        {/* Log Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm col-span-full text-center py-8">ไม่พบรายการ</p>
          ) : filtered.map(log => {
            const room = rooms.find(r => r.id === log.room_id)
            const s = HK_STATUS[log.status] || { label: log.status, bg: 'bg-gray-100', text: 'text-gray-600' }
            return (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-800">ห้อง {room?.room_number || log.room_id}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                </div>
                {log.notes && <p className="text-xs text-gray-500 mb-2">{log.notes}</p>}
                {log.completed_at && <p className="text-xs text-green-600">เสร็จเมื่อ: {formatDateTimeTH(log.completed_at)}</p>}
                <div className="flex gap-2 mt-3">
                  {log.status === 'pending' && (
                    <button onClick={() => updateMutation.mutate({ id: log.id, status: 'in_progress' })}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">เริ่มทำความสะอาด</button>
                  )}
                  {log.status === 'in_progress' && (
                    <button onClick={() => { updateMutation.mutate({ id: log.id, status: 'done' }); roomsService.updateStatus(log.room_id, 'available') }}
                      className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">เสร็จแล้ว</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="สร้างงานทำความสะอาด" size="sm">
        <HKCreateForm rooms={rooms} onSubmit={d => createMutation.mutate(d)} onClose={() => setModal(false)} loading={createMutation.isPending} />
      </Modal>
    </div>
  )
}

function HKCreateForm({ rooms, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ room_id: '', notes: '' })
  return (
    <div className="space-y-4">
      <Select label="ห้อง *" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
        <option value="">— เลือกห้อง —</option>
        {rooms.map(r => <option key={r.id} value={r.id}>ห้อง {r.room_number}</option>)}
      </Select>
      <Input label="หมายเหตุ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.room_id || loading}>สร้าง</Button>
      </div>
    </div>
  )
}
