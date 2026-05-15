import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Phone, MapPin, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { propertiesService } from '../lib/database'
import { useAuth } from '../context/AuthContext'
import { useProperty } from '../context/PropertyContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Textarea } from '../components/ui/Input'

export default function Properties() {
  const { user } = useAuth()
  const { switchProperty, refreshProperties } = useProperty()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: () => propertiesService.getUserProperties(user.id),
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => propertiesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries()
      refreshProperties()
      toast.success('ลบที่พักสำเร็จ')
      setDeleteTarget(null)
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? propertiesService.update(editing.id, data)
      : propertiesService.create({ ...data, is_active: true }, user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      refreshProperties()
      toast.success(editing ? 'แก้ไขที่พักสำเร็จ' : 'เพิ่มที่พักสำเร็จ')
      setModalOpen(false)
      setEditing(null)
    },
  })

  function openEdit(p) {
    setEditing(p)
    setModalOpen(true)
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="จัดการที่พัก" />
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">ที่พักทั้งหมด {properties.length} แห่ง</p>
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} /> เพิ่มที่พัก
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-indigo-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{p.name}</h3>
              {p.address && <p className="text-xs text-gray-500 flex items-start gap-1 mb-1"><MapPin size={11} className="mt-0.5 shrink-0" />{p.address}</p>}
              {p.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{p.phone}</p>}
              <button
                onClick={() => { switchProperty(p.id); navigate('/rooms') }}
                className="mt-4 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                จัดการห้อง <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <PropertyModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        initial={editing}
        onSubmit={data => saveMutation.mutate(data)}
        loading={saveMutation.isPending}
      />

      <DeletePropertyModal
        property={deleteTarget}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function DeletePropertyModal({ property, isOpen, onClose, onConfirm, loading }) {
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
            <h2 className="text-base font-bold text-gray-900">ลบที่พัก "{property?.name}"</h2>
            <p className="text-xs text-gray-500 mt-0.5">การดำเนินการนี้ไม่สามารถเรียกคืนได้</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-sm text-red-700">
          <p className="font-semibold mb-1">⚠️ ข้อควรระวัง</p>
          <p>ชั้น ห้อง และข้อมูลทั้งหมดของที่พักนี้จะถูกลบออกถาวร</p>
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
            {loading ? 'กำลังลบ...' : 'ลบที่พัก'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PropertyModal({ isOpen, onClose, initial, onSubmit, loading }) {
  const [form, setForm] = useState({ name: '', address: '', phone: '' })

  useState(() => {
    if (initial) setForm({ name: initial.name || '', address: initial.address || '', phone: initial.phone || '' })
    else setForm({ name: '', address: '', phone: '' })
  }, [initial, isOpen])

  // re-sync form when initial changes
  const [synced, setSynced] = useState(false)
  if (!synced && isOpen) {
    if (initial) setForm({ name: initial.name || '', address: initial.address || '', phone: initial.phone || '' })
    setSynced(true)
  }
  if (!isOpen && synced) setSynced(false)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'แก้ไขที่พัก' : 'เพิ่มที่พักใหม่'}>
      <div className="space-y-4">
        <Input label="ชื่อที่พัก *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น บ้านสุขใจ อพาร์ทเมนต์" />
        <Input label="ที่อยู่" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ที่อยู่เต็ม" />
        <Input label="เบอร์โทร" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="02-xxx-xxxx" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.name || loading}>
            {loading ? 'กำลังบันทึก...' : (initial ? 'บันทึก' : 'เพิ่มที่พัก')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
