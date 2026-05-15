import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, UserX, UserCheck, Pencil, Phone, Briefcase, Users, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { guestsService, contractsService, invoicesService, roomsService } from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Textarea, Select } from '../components/ui/Input'
import ImagePicker from '../components/ui/ImagePicker'
import { formatDateTH } from '../utils/dateUtils'
import { formatPrice } from '../utils/priceUtils'

function GuestAvatar({ name, size = 'md' }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('') : '?'
  const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0
  const sz = size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} ${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}

export default function Guests() {
  const { activePropertyId } = useProperty()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailModal, setDetailModal] = useState(false)

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activePropertyId],
    queryFn: () => guestsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', activePropertyId],
    queryFn: () => contractsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? guestsService.update(editing.id, data)
      : guestsService.create({ ...data, property_id: activePropertyId, is_blacklisted: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guests'] }); toast.success('บันทึกสำเร็จ'); setModal(false); setEditing(null) },
  })
  const blacklistMutation = useMutation({
    mutationFn: ({ id, val }) => guestsService.setBlacklist(id, val),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guests'] }); toast.success('อัปเดตสำเร็จ') },
  })

  // Compute active tenant status per guest
  const activeContractByGuest = {}
  contracts.filter(c => c.status === 'active').forEach(c => { activeContractByGuest[c.guest_id] = c })

  const filtered = guests.filter(g => {
    const matchSearch = !search ||
      g.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (g.phone || '').includes(search) ||
      (g.occupation || '').toLowerCase().includes(search.toLowerCase())
    const isActive = !!activeContractByGuest[g.id]
    if (filterType === 'active') return matchSearch && isActive
    if (filterType === 'blacklist') return matchSearch && g.is_blacklisted
    return matchSearch
  }).sort((a, b) => {
    // Active tenants first
    const aActive = !!activeContractByGuest[a.id]
    const bActive = !!activeContractByGuest[b.id]
    if (aActive !== bActive) return aActive ? -1 : 1
    return a.full_name.localeCompare(b.full_name, 'th')
  })

  const activeCount = guests.filter(g => !!activeContractByGuest[g.id]).length
  const blacklistCount = guests.filter(g => g.is_blacklisted).length

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="ผู้เช่า" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9" placeholder="ค้นหาชื่อ, เบอร์โทร, อาชีพ..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => { setEditing(null); setModal(true) }} className="shrink-0">
            <Plus size={15} /> เพิ่มผู้เช่า
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all',       label: `ทั้งหมด (${guests.length})` },
            { key: 'active',    label: `เช่าอยู่ (${activeCount})` },
            { key: 'blacklist', label: `Blacklist (${blacklistCount})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterType(key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Guest Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">ไม่พบผู้เช่า</div>
          ) : filtered.map(g => {
            const activeContract = activeContractByGuest[g.id]
            const room = activeContract ? rooms.find(r => r.id === activeContract.room_id) : null
            return (
              <div key={g.id}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${
                  g.is_blacklisted ? 'border-red-200 bg-red-50' : 'border-gray-100'
                }`}
                onClick={() => { setSelected(g); setDetailModal(true) }}>
                <div className="flex items-start gap-3">
                  <GuestAvatar name={g.full_name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{g.full_name}</p>
                      {g.is_blacklisted && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">Blacklist</span>
                      )}
                      {activeContract && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">เช่าอยู่</span>
                      )}
                    </div>
                    {g.phone && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={11} /> {g.phone}</p>}
                    {g.occupation && <p className="text-xs text-gray-400 flex items-center gap-1"><Briefcase size={10} /> {g.occupation}</p>}
                    {activeContract && room && (
                      <p className="text-xs text-indigo-600 font-medium mt-1">ห้อง {room.room_number} — {formatPrice(activeContract.monthly_rent)}/เดือน</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditing(g); setModal(true) }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil size={13} /></button>
                    <button onClick={() => blacklistMutation.mutate({ id: g.id, val: !g.is_blacklisted })}
                      className={`p-1.5 rounded hover:bg-gray-100 ${g.is_blacklisted ? 'text-green-500' : 'text-red-400'}`}>
                      {g.is_blacklisted ? <UserCheck size={13} /> : <UserX size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <GuestModal
        isOpen={modal}
        onClose={() => { setModal(false); setEditing(null) }}
        initial={editing}
        onSubmit={d => saveMutation.mutate(d)}
        loading={saveMutation.isPending}
      />

      {selected && (
        <GuestDetailModal
          isOpen={detailModal}
          onClose={() => setDetailModal(false)}
          guest={selected}
          contracts={contracts.filter(c => c.guest_id === selected.id)}
          rooms={rooms}
          activePropertyId={activePropertyId}
        />
      )}
    </div>
  )
}

const EMPTY_GUEST_FORM = {
  full_name: '', phone: '', id_card: '', occupation: '', num_occupants: 1,
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  photo_url: '', id_card_url: '', notes: '',
}

function GuestModal({ isOpen, onClose, initial, onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY_GUEST_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        full_name: initial.full_name || '',
        phone: initial.phone || '',
        id_card: initial.id_card || '',
        occupation: initial.occupation || '',
        num_occupants: initial.num_occupants || 1,
        emergency_contact_name: initial.emergency_contact_name || '',
        emergency_contact_phone: initial.emergency_contact_phone || '',
        emergency_contact_relation: initial.emergency_contact_relation || '',
        photo_url: initial.photo_url || '',
        id_card_url: initial.id_card_url || '',
        notes: initial.notes || '',
      })
    } else {
      setForm(EMPTY_GUEST_FORM)
    }
  }, [isOpen, initial])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'แก้ไขข้อมูลผู้เช่า' : 'เพิ่มผู้เช่าใหม่'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="ชื่อ-นามสกุล *" value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
          <Input label="เบอร์โทร" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="อาชีพ" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
          <Input label="เลขบัตรประชาชน" value={form.id_card} onChange={e => set('id_card', e.target.value)} />
          <Input label="จำนวนผู้พักอาศัย" type="number" value={form.num_occupants} onChange={e => set('num_occupants', +e.target.value)} />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ผู้ติดต่อฉุกเฉิน</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="ชื่อ" value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
            <Input label="เบอร์โทร" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} />
            <div className="col-span-2">
              <Input label="ความสัมพันธ์" value={form.emergency_contact_relation} onChange={e => set('emergency_contact_relation', e.target.value)} placeholder="เช่น พ่อ, แม่, สามี, ภรรยา" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">รูปภาพ</p>
          <div className="grid grid-cols-2 gap-3">
            <ImagePicker label="รูปถ่ายผู้เช่า" value={form.photo_url} onChange={v => set('photo_url', v)} capture="user" />
            <ImagePicker label="สำเนาบัตรประชาชน" value={form.id_card_url} onChange={v => set('id_card_url', v)} capture="environment" />
          </div>
        </div>

        <Textarea label="หมายเหตุ" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.full_name || loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function GuestDetailModal({ isOpen, onClose, guest, contracts, rooms }) {
  const [tab, setTab] = useState('info')
  const { data: allInvoices = [] } = useQuery({
    queryKey: ['guest-invoices', guest.id],
    queryFn: () => {
      const contractIds = contracts.map(c => c.id)
      return Promise.all(contractIds.map(id => invoicesService.getByContract(id)))
        .then(results => results.flat())
    },
    enabled: isOpen && contracts.length > 0,
  })

  const activeContract = contracts.find(c => c.status === 'active')
  const activeRoom = activeContract ? rooms.find(r => r.id === activeContract.room_id) : null
  const totalPaid = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount || 0), 0)
  const unpaidInvoices = allInvoices.filter(i => i.status !== 'paid')

  const tabs = [
    { key: 'info',     label: 'ข้อมูลส่วนตัว' },
    { key: 'contract', label: `สัญญาเช่า (${contracts.length})` },
    { key: 'payment',  label: `ประวัติชำระ` },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100 mb-4">
        <GuestAvatar name={guest.full_name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-800">{guest.full_name}</h2>
            {guest.is_blacklisted && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                <AlertTriangle size={11} /> Blacklist
              </span>
            )}
            {activeContract && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">เช่าอยู่</span>
            )}
          </div>
          {activeRoom && <p className="text-sm text-indigo-600 font-medium">ห้อง {activeRoom.room_number} — {formatPrice(activeContract.monthly_rent)}/เดือน</p>}
          <p className="text-sm text-gray-500">{guest.phone}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-400 text-xs">ยอดชำระรวม</p>
          <p className="font-bold text-gray-800 text-lg">{formatPrice(totalPaid)}</p>
          {unpaidInvoices.length > 0 && (
            <p className="text-xs text-red-500">ค้าง {unpaidInvoices.length} เดือน</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: ข้อมูลส่วนตัว */}
      {tab === 'info' && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="ชื่อ-นามสกุล"  value={guest.full_name} />
            <InfoRow label="เบอร์โทร"       value={guest.phone || '-'} />
            <InfoRow label="อาชีพ"          value={guest.occupation || '-'} />
            <InfoRow label="จำนวนผู้พัก"    value={guest.num_occupants ? `${guest.num_occupants} คน` : '-'} />
            <InfoRow label="บัตรประชาชน"    value={guest.id_card || '-'} />
          </div>

          {(guest.emergency_contact_name || guest.emergency_contact_phone) && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs font-semibold text-orange-700 mb-2">ผู้ติดต่อฉุกเฉิน</p>
              <p className="font-medium text-gray-800">{guest.emergency_contact_name}</p>
              <p className="text-gray-600">{guest.emergency_contact_phone} {guest.emergency_contact_relation ? `(${guest.emergency_contact_relation})` : ''}</p>
            </div>
          )}

          {guest.notes && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs font-semibold text-yellow-700 mb-1">หมายเหตุ</p>
              <p className="text-gray-700">{guest.notes}</p>
            </div>
          )}

          {(guest.photo_url || guest.id_card_url) && (
            <div className="space-y-2">
              {guest.photo_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">รูปถ่าย</p>
                  <img src={guest.photo_url} alt="รูปถ่าย" className="h-32 rounded-lg object-cover border border-gray-200" onError={e => e.target.style.display='none'} />
                </div>
              )}
              {guest.id_card_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">สำเนาบัตรประชาชน</p>
                  <img src={guest.id_card_url} alt="บัตรประชาชน" className="h-32 rounded-lg object-cover border border-gray-200" onError={e => e.target.style.display='none'} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: สัญญาเช่า */}
      {tab === 'contract' && (
        <div className="space-y-3">
          {contracts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประวัติสัญญาเช่า</p>
          ) : contracts.map(c => {
            const room = rooms.find(r => r.id === c.room_id)
            const months = Math.max(0, Math.round((new Date(c.end_date || new Date()) - new Date(c.start_date)) / (1000 * 60 * 60 * 24 * 30)))
            return (
              <div key={c.id} className={`p-4 rounded-xl border ${c.status === 'active' ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">ห้อง {room?.room_number}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                    {c.status === 'active' ? 'กำลังเช่า' : 'สิ้นสุดแล้ว'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoRow label="ค่าเช่า" value={formatPrice(c.monthly_rent)} />
                  <InfoRow label="มัดจำ"   value={formatPrice(c.deposit_amount)} />
                  <InfoRow label="เริ่ม"   value={formatDateTH(c.start_date)} />
                  <InfoRow label="ระยะเวลา" value={c.end_date ? `${months} เดือน` : `${months} เดือน (ต่อเนื่อง)`} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: ประวัติชำระ */}
      {tab === 'payment' && (
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-none">
          {allInvoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประวัติการชำระ</p>
          ) : [...allInvoices].sort((a, b) => b.year - a.year || b.month - a.month).map(inv => {
            const overdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()
            return (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="font-medium text-gray-800">{inv.month}/{inv.year}</p>
                  {inv.status === 'paid' && <p className="text-xs text-gray-400">{inv.payment_method} — {formatDateTH(inv.paid_at)}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{formatPrice(inv.total_amount)}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700'
                    : overdue ? 'bg-red-100 text-red-600'
                    : 'bg-orange-100 text-orange-700'
                  }`}>
                    {inv.status === 'paid' ? 'ชำระแล้ว' : overdue ? 'เกินกำหนด' : 'ค้างชำระ'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  )
}
