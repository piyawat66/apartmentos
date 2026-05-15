import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { maintenanceService, roomsService } from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Select, Textarea } from '../components/ui/Input'
import { MAINTENANCE_STATUS, PRIORITY } from '../utils/statusUtils'
import { formatDateTimeTH } from '../utils/dateUtils'
import { formatPrice } from '../utils/priceUtils'

export default function Maintenance() {
  const { activePropertyId } = useProperty()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailModal, setDetailModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const { data: requests = [] } = useQuery({
    queryKey: ['maintenance', activePropertyId],
    queryFn: () => maintenanceService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => {
      const req = maintenanceService.create({ ...data, property_id: activePropertyId, status: 'open' })
      if (data.lock_room) roomsService.updateStatus(data.room_id, 'maintenance')
      return req
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success('แจ้งซ่อมสำเร็จ'); setModal(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, cost }) => {
      if (status === 'resolved') return maintenanceService.resolve(id, cost)
      return maintenanceService.update(id, { status })
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success('อัปเดตสำเร็จ'); setDetailModal(false) },
  })

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="แจ้งซ่อม" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {s === 'all' ? `ทั้งหมด (${requests.length})` : `${MAINTENANCE_STATUS[s]?.label} (${requests.filter(r => r.status === s).length})`}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={14} /> แจ้งซ่อม</Button>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Wrench size={32} className="mx-auto mb-2 opacity-30" /><p>ไม่พบรายการ</p></div>
          ) : filtered.map(req => {
            const room = rooms.find(r => r.id === req.room_id)
            const ms = MAINTENANCE_STATUS[req.status] || { label: req.status, bg: 'bg-gray-100', text: 'text-gray-600' }
            const pr = PRIORITY[req.priority] || { label: req.priority, bg: 'bg-gray-100', text: 'text-gray-600' }
            return (
              <div key={req.id} onClick={() => { setSelected(req); setDetailModal(true) }}
                className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.bg} ${pr.text}`}>{pr.label}</span>
                      <span className="text-xs text-gray-400">ห้อง {room?.room_number || req.room_id}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{req.title}</p>
                    {req.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{req.description}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${ms.bg} ${ms.text}`}>{ms.label}</span>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>{formatDateTimeTH(req.created_at)}</span>
                  {req.cost && <span className="font-medium text-gray-600">ค่าซ่อม: {formatPrice(req.cost)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="แจ้งซ่อม">
        <MaintenanceForm rooms={rooms} onSubmit={d => createMutation.mutate(d)} onClose={() => setModal(false)} loading={createMutation.isPending} />
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title="รายละเอียดการแจ้งซ่อม">
          <MaintenanceDetail req={selected} rooms={rooms} onUpdate={(id, status, cost) => updateMutation.mutate({ id, status, cost })} onClose={() => setDetailModal(false)} />
        </Modal>
      )}
    </div>
  )
}

function MaintenanceForm({ rooms, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ room_id: '', title: '', description: '', priority: 'medium', lock_room: false })
  return (
    <div className="space-y-4">
      <Select label="ห้อง *" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
        <option value="">— เลือกห้อง —</option>
        {rooms.map(r => <option key={r.id} value={r.id}>ห้อง {r.room_number}</option>)}
      </Select>
      <Input label="หัวข้อ *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น แอร์ไม่เย็น" />
      <Textarea label="รายละเอียด" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
      <Select label="ระดับความเร่งด่วน" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
        <option value="low">ต่ำ</option><option value="medium">กลาง</option>
        <option value="high">สูง</option><option value="urgent">เร่งด่วน</option>
      </Select>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.lock_room} onChange={e => setForm(f => ({ ...f, lock_room: e.target.checked }))} className="rounded" />
        <span className="text-gray-700">ล็อคห้อง (เปลี่ยนสถานะเป็น "ซ่อมบำรุง")</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.room_id || !form.title || loading}>แจ้งซ่อม</Button>
      </div>
    </div>
  )
}

function MaintenanceDetail({ req, rooms, onUpdate, onClose }) {
  const [cost, setCost] = useState(req.cost || '')
  const room = rooms.find(r => r.id === req.room_id)
  const ms = MAINTENANCE_STATUS[req.status]
  const pr = PRIORITY[req.priority]

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr?.bg} ${pr?.text}`}>{pr?.label}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ms?.bg} ${ms?.text}`}>{ms?.label}</span>
      </div>
      <p className="text-sm text-gray-500">ห้อง {room?.room_number}</p>
      <h3 className="font-semibold text-gray-800">{req.title}</h3>
      {req.description && <p className="text-sm text-gray-600">{req.description}</p>}

      {req.status !== 'resolved' && req.status !== 'closed' && (
        <div className="border-t pt-4 space-y-3">
          <Input label="ค่าซ่อม (บาท)" type="number" value={cost} onChange={e => setCost(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {req.status === 'open' && (
              <button onClick={() => onUpdate(req.id, 'in_progress')} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">เริ่มดำเนินการ</button>
            )}
            {req.status === 'in_progress' && (
              <button onClick={() => onUpdate(req.id, 'resolved', cost)} className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">แก้ไขแล้ว</button>
            )}
          </div>
        </div>
      )}
      <Button variant="secondary" onClick={onClose} className="w-full">ปิด</Button>
    </div>
  )
}
