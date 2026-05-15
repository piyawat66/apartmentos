import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, LogIn, LogOut, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { bookingsService, roomsService, guestsService, floorsService } from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import { BOOKING_STATUS } from '../utils/statusUtils'
import { formatDateTH } from '../utils/dateUtils'
import { formatPrice } from '../utils/priceUtils'
import BookingModal from '../components/bookings/BookingModal'
import BookingDetailModal from '../components/bookings/BookingDetailModal'

export default function Bookings() {
  const { activePropertyId } = useProperty()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [newBookingModal, setNewBookingModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [detailModal, setDetailModal] = useState(false)

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', activePropertyId],
    queryFn: () => bookingsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activePropertyId],
    queryFn: () => guestsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const { data: floors = [] } = useQuery({
    queryKey: ['floors', activePropertyId],
    queryFn: () => floorsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })

  const checkinMutation = useMutation({
    mutationFn: (id) => bookingsService.checkIn(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Check-in สำเร็จ') },
  })

  const checkoutMutation = useMutation({
    mutationFn: (id) => bookingsService.checkOut(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Check-out สำเร็จ') },
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => bookingsService.cancel(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('ยกเลิกการจองสำเร็จ') },
  })

  const filtered = bookings.filter(b => {
    const guest = guests.find(g => g.id === b.guest_id)
    const room = rooms.find(r => r.id === b.room_id)
    const matchSearch = !search ||
      (guest?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (room?.room_number || '').includes(search)
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchSearch && matchStatus
  }).sort((a, b) => {
    const roomA = rooms.find(r => r.id === a.room_id)
    const roomB = rooms.find(r => r.id === b.room_id)
    const floorA = floors.find(f => f.id === roomA?.floor_id)?.floor_number ?? 999
    const floorB = floors.find(f => f.id === roomB?.floor_id)?.floor_number ?? 999
    if (floorA !== floorB) return floorA - floorB
    return (roomA?.room_number || '').localeCompare(roomB?.room_number || '', undefined, { numeric: true })
  })

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="การจอง" />
      <div className="p-4 sm:p-6">
        {/* Search + Add */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9" placeholder="ค้นหาชื่อแขก, หมายเลขห้อง..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => setNewBookingModal(true)} className="shrink-0">
            <Plus size={15} /> จองห้อง
          </Button>
        </div>

        {/* Status filter buttons */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setFilterStatus('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            ทั้งหมด ({bookings.length})
          </button>
          {Object.entries(BOOKING_STATUS).map(([key, val]) => {
            const count = bookings.filter(b => b.status === key).length
            return (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === key ? `${val.bg} ${val.text} ring-2 ring-offset-1 ring-current` : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {val.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Booking List */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ห้อง</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้เข้าพัก</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ยอดรวม</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">ไม่พบรายการ</td></tr>
              ) : filtered.map(b => {
                const guest = guests.find(g => g.id === b.guest_id)
                const room = rooms.find(r => r.id === b.room_id)
                const s = BOOKING_STATUS[b.status] || { label: b.status, bg: 'bg-gray-100', text: 'text-gray-600' }
                return (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { setSelectedBooking(b); setDetailModal(true) }}>
                    <td className="px-4 py-3 font-semibold text-gray-800">ห้อง {room?.room_number || b.room_id}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{guest?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">{guest?.phone || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{formatDateTH(b.check_in_date)}</p>
                      {b.check_out_date && <p className="text-gray-400">→ {formatDateTH(b.check_out_date)}</p>}
                      {!b.check_out_date && <p className="text-gray-400">รายเดือน</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatPrice(b.total_amount)}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${s.bg} ${s.text}`}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {b.status === 'reserved' && (
                          <button onClick={() => checkinMutation.mutate(b.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                            <LogIn size={11} /> Check-in
                          </button>
                        )}
                        {b.status === 'checked_in' && (
                          <button onClick={() => checkoutMutation.mutate(b.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">
                            <LogOut size={11} /> Check-out
                          </button>
                        )}
                        {['reserved', 'checked_in'].includes(b.status) && (
                          <button onClick={() => cancelMutation.mutate(b.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <X size={11} /> ยกเลิก
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BookingModal isOpen={newBookingModal} onClose={() => setNewBookingModal(false)}
        rooms={rooms} guests={guests} propertyId={activePropertyId}
        onSuccess={() => { qc.invalidateQueries(); setNewBookingModal(false) }} />

      {selectedBooking && (
        <BookingDetailModal isOpen={detailModal} onClose={() => setDetailModal(false)}
          booking={selectedBooking} rooms={rooms} guests={guests}
          onCheckin={() => { checkinMutation.mutate(selectedBooking.id); setDetailModal(false) }}
          onCheckout={() => { checkoutMutation.mutate(selectedBooking.id); setDetailModal(false) }}
          onCancel={() => { cancelMutation.mutate(selectedBooking.id); setDetailModal(false) }} />
      )}
    </div>
  )
}
