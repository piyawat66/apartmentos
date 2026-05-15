import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, FileText, CheckCircle, Clock, AlertCircle, ChevronRight, Images, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  contractsService, invoicesService, guestsService,
  roomsService, floorsService,
} from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Select, Textarea } from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import MultiImagePicker from '../components/ui/MultiImagePicker'
import GuestSearchInput from '../components/ui/GuestSearchInput'
import { formatDateTH } from '../utils/dateUtils'
import { formatPrice } from '../utils/priceUtils'

const now = new Date()
const CY = now.getFullYear()
const CM = now.getMonth() + 1

function invoiceStatusDisplay(inv) {
  if (!inv) return { label: 'ยังไม่มีใบแจ้งหนี้', cls: 'bg-gray-100 text-gray-500' }
  if (inv.status === 'paid') return { label: 'ชำระแล้ว', cls: 'bg-green-100 text-green-700' }
  const overdue = inv.due_date && new Date(inv.due_date) < now
  if (overdue) return { label: 'เกินกำหนด', cls: 'bg-red-100 text-red-700' }
  return { label: 'ค้างชำระ', cls: 'bg-orange-100 text-orange-700' }
}

export default function Contracts() {
  const { activePropertyId } = useProperty()
  const { user } = useAuth()
  const qc = useQueryClient()
  const canEdit = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [createModal, setCreateModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailModal, setDetailModal] = useState(false)
  const [editModal, setEditModal] = useState(false)

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', activePropertyId],
    queryFn: () => contractsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activePropertyId],
    queryFn: () => guestsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: floors = [] } = useQuery({
    queryKey: ['floors', activePropertyId],
    queryFn: () => floorsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices-month', activePropertyId, CY, CM],
    queryFn: () => invoicesService.getByMonth(activePropertyId, CY, CM),
    enabled: !!activePropertyId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => contractsService.create({ ...data, property_id: activePropertyId, created_by: user?.id || 'user-admin' }),
    onSuccess: () => { qc.invalidateQueries(); toast.success('สร้างสัญญาเช่าสำเร็จ'); setCreateModal(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => contractsService.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries()
      toast.success('บันทึกสำเร็จ')
      setSelected(prev => prev?.id === updated?.id ? updated : prev)
    },
  })
  const endMutation = useMutation({
    mutationFn: (id) => contractsService.end(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('สิ้นสุดสัญญาแล้ว'); setDetailModal(false) },
  })

  const filtered = contracts.filter(c => {
    const guest = guests.find(g => g.id === c.guest_id)
    const room = rooms.find(r => r.id === c.room_id)
    const matchSearch = !search ||
      (guest?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (room?.room_number || '').includes(search)
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  }).sort((a, b) => {
    const roomA = rooms.find(r => r.id === a.room_id)
    const roomB = rooms.find(r => r.id === b.room_id)
    const floorA = floors.find(f => f.id === roomA?.floor_id)?.floor_number ?? 999
    const floorB = floors.find(f => f.id === roomB?.floor_id)?.floor_number ?? 999
    if (floorA !== floorB) return floorA - floorB
    return (roomA?.room_number || '').localeCompare(roomB?.room_number || '', undefined, { numeric: true })
  })

  // KPI for active contracts
  const active = contracts.filter(c => c.status === 'active')
  const unpaidThisMonth = allInvoices.filter(inv => inv.status !== 'paid')
  const paidThisMonth = allInvoices.filter(inv => inv.status === 'paid')
  const totalExpectedThisMonth = allInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalPaidThisMonth = paidThisMonth.reduce((s, i) => s + (i.paid_amount || 0), 0)

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="สัญญาเช่า" />
      <div className="p-4 sm:p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiTile icon={FileText}      color="indigo"  label="สัญญาที่ใช้งาน"    value={active.length} sub="สัญญา" />
          <KpiTile icon={CheckCircle}   color="green"   label="ชำระแล้วเดือนนี้"   value={paidThisMonth.length} sub={`จาก ${allInvoices.length} ห้อง`} />
          <KpiTile icon={AlertCircle}   color="orange"  label="ค้างชำระเดือนนี้"   value={unpaidThisMonth.length} sub="ห้อง" />
          <KpiTile icon={Clock}         color="blue"    label="รับเงินแล้วเดือนนี้" value={formatPrice(totalPaidThisMonth).replace(' บาท','')} sub={`จาก ${formatPrice(totalExpectedThisMonth)}`} />
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9" placeholder="ค้นหาชื่อผู้เช่า, ห้อง..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {canEdit && (
            <Button variant="primary" onClick={() => setCreateModal(true)} className="shrink-0">
              <Plus size={15} /> สัญญาใหม่
            </Button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'active', label: `กำลังเช่า (${contracts.filter(c => c.status === 'active').length})` },
            { key: 'ended',  label: `สิ้นสุดแล้ว (${contracts.filter(c => c.status === 'ended').length})` },
            { key: 'all',    label: `ทั้งหมด (${contracts.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Contract List */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ห้อง</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้เช่า</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">เริ่มสัญญา</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ค่าเช่า/เดือน</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ใบแจ้งหนี้เดือนนี้</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">ไม่พบรายการ</td></tr>
              ) : filtered.map(c => {
                const guest = guests.find(g => g.id === c.guest_id)
                const room = rooms.find(r => r.id === c.room_id)
                const inv = allInvoices.find(i => i.contract_id === c.id)
                const invStatus = invoiceStatusDisplay(inv)
                const months = Math.max(0, Math.round((new Date() - new Date(c.start_date)) / (1000 * 60 * 60 * 24 * 30)))
                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { setSelected(c); setDetailModal(true) }}>
                    <td className="px-4 py-3 font-semibold text-gray-800">ห้อง {room?.room_number || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-medium">{guest?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">{guest?.phone || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{formatDateTH(c.start_date)}</p>
                      {c.end_date && <p className="text-gray-400">ถึง {formatDateTH(c.end_date)}</p>}
                      {!c.end_date && <p className="text-gray-400">{months} เดือน</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatPrice(c.monthly_rent)}</td>
                    <td className="px-4 py-3">
                      {c.status === 'active' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${invStatus.cls}`}>{invStatus.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.status === 'active' ? 'กำลังเช่า' : 'สิ้นสุดแล้ว'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400"><ChevronRight size={16} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {createModal && canEdit && (
        <CreateContractModal
          rooms={rooms} guests={guests} floors={floors}
          existingContracts={contracts}
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
          onClose={() => setCreateModal(false)}
        />
      )}

      {selected && (
        <ContractDetailModal
          isOpen={detailModal}
          onClose={() => setDetailModal(false)}
          contract={selected}
          guest={guests.find(g => g.id === selected.guest_id)}
          room={rooms.find(r => r.id === selected.room_id)}
          canEdit={canEdit}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          updateLoading={updateMutation.isPending}
          onEdit={() => setEditModal(true)}
          onEnd={() => {
            if (confirm('ยืนยันการสิ้นสุดสัญญา?')) endMutation.mutate(selected.id)
          }}
        />
      )}

      {selected && editModal && canEdit && (
        <EditContractModal
          isOpen={editModal}
          onClose={() => setEditModal(false)}
          contract={selected}
          guest={guests.find(g => g.id === selected.guest_id)}
          room={rooms.find(r => r.id === selected.room_id)}
          onSubmit={data => updateMutation.mutate(
            { id: selected.id, data },
            { onSuccess: () => setEditModal(false) }
          )}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  )
}

function KpiTile({ icon: Icon, color, label, value, sub }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    blue:   'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
        <p className="text-xs text-gray-400 truncate">{sub}</p>
      </div>
    </div>
  )
}

function CreateContractModal({ rooms, guests, floors, existingContracts, onSubmit, loading, onClose }) {
  const activeRoomIds = new Set(existingContracts.filter(c => c.status === 'active').map(c => c.room_id))
  const availableRooms = rooms.filter(r => !activeRoomIds.has(r.id))

  const [form, setForm] = useState({
    room_id: '',
    guest_id: '',
    start_date: new Date().toISOString().split('T')[0],
    monthly_rent: '',
    deposit_amount: '',
    deposit_receipt_images: [],
    water_rate: 18,
    electric_rate: 5,
    notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleRoomChange(roomId) {
    const room = rooms.find(r => r.id === roomId)
    set('room_id', roomId)
    if (room) { set('monthly_rent', room.base_price); set('deposit_amount', room.base_price) }
  }

  function getFloorLabel(room) {
    const floor = floors.find(f => f.id === room.floor_id)
    return floor ? `${floor.name} — ` : ''
  }

  const valid = form.room_id && form.guest_id && form.start_date && form.monthly_rent && form.deposit_amount

  return (
    <Modal isOpen title="สร้างสัญญาเช่าใหม่" onClose={onClose} size="md">
      <div className="space-y-4">
        <Select label="ห้อง *" value={form.room_id} onChange={e => handleRoomChange(e.target.value)}>
          <option value="">— เลือกห้อง —</option>
          {availableRooms.map(r => (
            <option key={r.id} value={r.id}>{getFloorLabel(r)}ห้อง {r.room_number} — {r.base_price.toLocaleString()} บาท/เดือน</option>
          ))}
        </Select>
        <GuestSearchInput
          label="ผู้เช่า *"
          guests={guests}
          value={form.guest_id}
          onChange={v => set('guest_id', v)}
        />
        <Input label="วันเริ่มสัญญา *" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="ค่าเช่า/เดือน (บาท) *" type="number" value={form.monthly_rent} onChange={e => set('monthly_rent', +e.target.value)} />
          <Input label="ค่าประกัน (บาท) *" type="number" value={form.deposit_amount} onChange={e => set('deposit_amount', +e.target.value)} />
        </div>

        {/* Deposit receipts */}
        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
          <MultiImagePicker
            label="รูปใบเสร็จค่าประกัน (ไม่บังคับ)"
            images={form.deposit_receipt_images}
            onChange={v => set('deposit_receipt_images', v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="ค่าน้ำ (บาท/หน่วย)" type="number" value={form.water_rate} onChange={e => set('water_rate', +e.target.value)} />
          <Input label="ค่าไฟ (บาท/หน่วย)" type="number" value={form.electric_rate} onChange={e => set('electric_rate', +e.target.value)} />
        </div>
        <Textarea label="หมายเหตุ" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => onSubmit(form)} disabled={!valid || loading}>
            {loading ? 'กำลังบันทึก...' : 'สร้างสัญญา'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ContractDetailModal({ isOpen, onClose, contract, guest, room, canEdit, onEnd, onEdit, onUpdate, updateLoading }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['contract-invoices', contract.id],
    queryFn: () => invoicesService.getByContract(contract.id),
    enabled: isOpen && !!contract.id,
  })
  const [editingReceipts, setEditingReceipts] = useState(false)
  const [localImages, setLocalImages] = useState([])

  function startEditReceipts() {
    setLocalImages(contract.deposit_receipt_images || [])
    setEditingReceipts(true)
  }
  function cancelEditReceipts() {
    setEditingReceipts(false)
    setLocalImages([])
  }
  function saveReceipts() {
    onUpdate(contract.id, { deposit_receipt_images: localImages })
    setEditingReceipts(false)
  }

  const months = Math.max(0, Math.round((new Date() - new Date(contract.start_date)) / (1000 * 60 * 60 * 24 * 30)))
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount || 0), 0)
  const receiptImages = contract.deposit_receipt_images || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`สัญญา — ห้อง ${room?.room_number || ''}`} size="lg">
      <div className="space-y-5">
        {/* Header info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">ข้อมูลผู้เช่า</h4>
            <p className="font-semibold text-gray-800 text-base">{guest?.full_name}</p>
            <p className="text-gray-600">{guest?.phone}</p>
            {guest?.occupation && <p className="text-gray-500 text-xs">อาชีพ: {guest.occupation}</p>}
            {guest?.emergency_contact_name && (
              <p className="text-gray-500 text-xs">ผู้ติดต่อฉุกเฉิน: {guest.emergency_contact_name} ({guest.emergency_contact_phone})</p>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">ข้อมูลสัญญา</h4>
            <p className="text-gray-600">เริ่มสัญญา: <span className="font-medium text-gray-800">{formatDateTH(contract.start_date)}</span></p>
            {contract.end_date && <p className="text-gray-600">สิ้นสุด: <span className="font-medium text-gray-800">{formatDateTH(contract.end_date)}</span></p>}
            {!contract.end_date && <p className="text-gray-600">ระยะเวลา: <span className="font-medium text-gray-800">{months} เดือน</span></p>}
            <p className="text-gray-600">ค่าเช่า: <span className="font-bold text-gray-800">{formatPrice(contract.monthly_rent)}</span></p>
            <p className="text-gray-600">ค่าประกัน: <span className="font-medium text-gray-800">{formatPrice(contract.deposit_amount)}</span></p>
            <p className="text-gray-600">ค่าน้ำ/ไฟ: <span className="font-medium text-gray-800">{contract.water_rate} / {contract.electric_rate} บาท/หน่วย</span></p>
          </div>
        </div>

        {/* Deposit receipts section */}
        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              <Images size={13} className="text-indigo-400" /> รูปใบเสร็จค่าประกัน
              {receiptImages.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {receiptImages.length}
                </span>
              )}
            </p>
            {canEdit && !editingReceipts && (
              <button
                onClick={startEditReceipts}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
              >
                <Pencil size={11} /> {receiptImages.length > 0 ? 'แก้ไข/เพิ่มรูป' : 'เพิ่มรูป'}
              </button>
            )}
          </div>

          {editingReceipts ? (
            <div className="space-y-3">
              <MultiImagePicker images={localImages} onChange={setLocalImages} />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={cancelEditReceipts} className="text-xs py-1.5">ยกเลิก</Button>
                <Button variant="primary" onClick={saveReceipts} disabled={updateLoading} className="text-xs py-1.5">
                  {updateLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </div>
            </div>
          ) : receiptImages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {receiptImages.map((src, i) => (
                <ReceiptThumb key={i} src={src} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">ยังไม่มีรูปใบเสร็จ</p>
          )}
        </div>

        <div className="p-3 bg-indigo-50 rounded-lg flex items-center justify-between text-sm">
          <span className="text-indigo-700 font-medium">รวมยอดที่รับแล้วทั้งหมด</span>
          <span className="font-bold text-indigo-800 text-base">{formatPrice(totalPaid)}</span>
        </div>

        {/* Invoice history */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">ประวัติใบแจ้งหนี้ ({invoices.length} เดือน)</h4>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
            {invoices.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีใบแจ้งหนี้</p>
              : invoices.map(inv => {
              const overdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < now
              return (
                <div key={inv.id} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-medium w-16 shrink-0">{inv.month}/{inv.year}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700'
                      : overdue ? 'bg-red-100 text-red-600'
                      : 'bg-orange-100 text-orange-700'
                    }`}>
                      {inv.status === 'paid' ? 'ชำระแล้ว' : overdue ? 'เกินกำหนด' : 'ค้างชำระ'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatPrice(inv.total_amount)}</p>
                    {inv.status === 'paid' && <p className="text-xs text-gray-400">{inv.payment_method}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil size={13} /> แก้ไขสัญญา
            </Button>
            {contract.status === 'active' && (
              <Button variant="danger" size="sm" onClick={onEnd}>สิ้นสุดสัญญา</Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ReceiptThumb({ src, index }) {
  const [lightbox, setLightbox] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors group shrink-0"
      >
        <img src={src} alt={`receipt-${index + 1}`} className="w-full h-full object-cover" />
        <span className="absolute bottom-1 left-1 text-[9px] bg-black/40 text-white rounded px-1 leading-tight">
          {index + 1}
        </span>
      </button>
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={src}
            alt="receipt"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

function EditContractModal({ isOpen, onClose, contract, guest, room, onSubmit, loading }) {
  const [form, setForm] = useState({
    start_date: '',
    monthly_rent: '',
    deposit_amount: '',
    water_rate: '',
    electric_rate: '',
    notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (isOpen && contract) {
      setForm({
        start_date:     contract.start_date || '',
        monthly_rent:   contract.monthly_rent ?? '',
        deposit_amount: contract.deposit_amount ?? '',
        water_rate:     contract.water_rate ?? 18,
        electric_rate:  contract.electric_rate ?? 5,
        notes:          contract.notes || '',
      })
    }
  }, [isOpen, contract])

  const valid = form.start_date && form.monthly_rent !== '' && form.deposit_amount !== ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขสัญญาเช่า" size="sm">
      <div className="space-y-4">

        {/* Read-only info bar */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-sm">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            {room && (
              <span className="font-bold text-indigo-700 shrink-0">ห้อง {room.room_number}</span>
            )}
            {guest && (
              <span className="text-gray-600 truncate">{guest.full_name}{guest.phone ? ` · ${guest.phone}` : ''}</span>
            )}
          </div>
          <span className="text-xs text-indigo-400 shrink-0">ห้อง/ผู้เช่าแก้ไขไม่ได้</span>
        </div>

        <Input
          label="วันเริ่มสัญญา *"
          type="date"
          value={form.start_date}
          onChange={e => set('start_date', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="ค่าเช่า/เดือน (บาท) *"
            type="number"
            min={0}
            value={form.monthly_rent}
            onChange={e => set('monthly_rent', +e.target.value)}
          />
          <Input
            label="ค่าประกัน (บาท) *"
            type="number"
            min={0}
            value={form.deposit_amount}
            onChange={e => set('deposit_amount', +e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="ค่าน้ำ (บาท/หน่วย)"
            type="number"
            min={0}
            value={form.water_rate}
            onChange={e => set('water_rate', +e.target.value)}
          />
          <Input
            label="ค่าไฟ (บาท/หน่วย)"
            type="number"
            min={0}
            value={form.electric_rate}
            onChange={e => set('electric_rate', +e.target.value)}
          />
        </div>

        <Textarea
          label="หมายเหตุ"
          rows={2}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => onSubmit(form)} disabled={!valid || loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
