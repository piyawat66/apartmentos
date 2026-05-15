import { useQuery } from '@tanstack/react-query'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { BOOKING_STATUS, ROOM_TYPE } from '../../utils/statusUtils'
import { formatDateTH, formatDateTimeTH, nightCount } from '../../utils/dateUtils'
import { formatPrice } from '../../utils/priceUtils'
import { paymentsService } from '../../lib/database'
import { LogIn, LogOut, X, CreditCard } from 'lucide-react'

export default function BookingDetailModal({ isOpen, onClose, booking, rooms, guests, onCheckin, onCheckout, onCancel }) {
  if (!booking) return null

  const room = rooms.find(r => r.id === booking.room_id)
  const guest = guests.find(g => g.id === booking.guest_id)
  const s = BOOKING_STATUS[booking.status] || { label: booking.status, bg: 'bg-gray-100', text: 'text-gray-600' }

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', booking.id],
    queryFn: () => paymentsService.getByBooking(booking.id),
    enabled: isOpen && !!booking.id,
  })

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const nights = nightCount(booking.check_in_date, booking.check_out_date)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`รายละเอียดการจอง`} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>{s.label}</span>
          <span className="text-xs text-gray-400">ID: {booking.id.slice(-8).toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InfoGroup label="ห้อง" value={`ห้อง ${room?.room_number || '-'} (${ROOM_TYPE[room?.room_type] || '-'})`} />
          <InfoGroup label="ผู้เข้าพัก" value={guest?.full_name || '-'} sub={guest?.phone} />
          <InfoGroup label="วัน Check-in" value={formatDateTH(booking.check_in_date)} sub={booking.actual_check_in ? `เวลาจริง: ${formatDateTimeTH(booking.actual_check_in)}` : 'ยังไม่ได้ Check-in'} />
          <InfoGroup label="วัน Check-out" value={booking.check_out_date ? formatDateTH(booking.check_out_date) : 'รายเดือน'}
            sub={booking.actual_check_out ? `เวลาจริง: ${formatDateTimeTH(booking.actual_check_out)}` : ''} />
          <InfoGroup label="ประเภท" value={booking.booking_type === 'nightly' ? `รายคืน (${nights} คืน)` : 'รายเดือน'} />
          <InfoGroup label="ยอดรวม" value={formatPrice(booking.total_amount)} sub={`มัดจำ: ${formatPrice(booking.deposit_amount)}`} />
        </div>

        {booking.notes && <div className="p-3 bg-yellow-50 rounded-lg text-sm text-gray-700">{booking.notes}</div>}

        {/* Payments */}
        <div>
          <p className="font-medium text-gray-800 mb-2">ประวัติการชำระเงิน</p>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีรายการชำระเงิน</p>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-800">{formatPrice(p.amount)}</span>
                    <span className="text-gray-400 ml-2">({p.payment_type})</span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">{p.payment_method}</p>
                    <p className="text-xs text-gray-400">{formatDateTimeTH(p.paid_at)}</p>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                <span>ชำระแล้ว</span>
                <span className="text-green-600">{formatPrice(totalPaid)}</span>
              </div>
              {totalPaid < booking.total_amount && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>ค้างชำระ</span>
                  <span>{formatPrice(booking.total_amount - totalPaid)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {booking.status === 'reserved' && (
            <Button variant="primary" size="sm" onClick={onCheckin}><LogIn size={14} /> Check-in</Button>
          )}
          {booking.status === 'checked_in' && (
            <Button variant="success" size="sm" onClick={onCheckout}><LogOut size={14} /> Check-out</Button>
          )}
          {['reserved', 'checked_in'].includes(booking.status) && (
            <Button variant="danger" size="sm" onClick={onCancel}><X size={14} /> ยกเลิก</Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </Modal>
  )
}

function InfoGroup({ label, value, sub }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}
