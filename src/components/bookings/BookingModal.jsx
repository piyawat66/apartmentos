import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Select, Textarea } from '../ui/Input'
import { bookingsService, guestsService, roomsService } from '../../lib/database'
import { ROOM_STATUS, ROOM_TYPE } from '../../utils/statusUtils'
import { formatPrice } from '../../utils/priceUtils'
import { nightCount, todayISO } from '../../utils/dateUtils'

export default function BookingModal({ isOpen, onClose, rooms, guests, propertyId, onSuccess }) {
  const availableRooms = rooms.filter(r => r.status === 'available')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    room_id: '', guest_id: '', booking_type: 'nightly',
    check_in_date: todayISO(), check_out_date: '', deposit_amount: 0, notes: '',
    new_guest_name: '', new_guest_phone: '',
  })
  const [guestMode, setGuestMode] = useState('existing') // existing | new

  const selectedRoom = rooms.find(r => r.id === form.room_id)
  const nights = nightCount(form.check_in_date, form.check_out_date)
  const totalAmount = form.booking_type === 'nightly' ? nights * (selectedRoom?.base_price || 0) : selectedRoom?.base_price || 0

  const mutation = useMutation({
    mutationFn: async (data) => {
      let guestId = data.guest_id
      if (guestMode === 'new') {
        const g = guestsService.create({ property_id: propertyId, full_name: data.new_guest_name, phone: data.new_guest_phone, is_blacklisted: false, notes: '' })
        guestId = g.id
      }
      const booking = bookingsService.create({
        property_id: propertyId, room_id: data.room_id, guest_id: guestId,
        booking_type: data.booking_type, check_in_date: data.check_in_date,
        check_out_date: data.booking_type === 'monthly' ? null : data.check_out_date,
        status: 'reserved', total_amount: totalAmount, deposit_amount: Number(data.deposit_amount),
        notes: data.notes, created_by: 'user-admin',
      })
      roomsService.updateStatus(data.room_id, 'reserved')
      return booking
    },
    onSuccess: () => { toast.success('จองห้องสำเร็จ'); onSuccess(); resetForm() },
  })

  function resetForm() {
    setForm({ room_id: '', guest_id: '', booking_type: 'nightly', check_in_date: todayISO(), check_out_date: '', deposit_amount: 0, notes: '', new_guest_name: '', new_guest_phone: '' })
    setStep(1); setGuestMode('existing')
  }

  const canProceed1 = !!form.room_id
  const canProceed2 = guestMode === 'existing' ? !!form.guest_id : !!form.new_guest_name
  const canSubmit = canProceed2 && !!form.check_in_date && (form.booking_type === 'monthly' || !!form.check_out_date)

  const blacklistedGuest = guests.find(g => g.id === form.guest_id && g.is_blacklisted)

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm() }} title="จองห้อง" size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-12 transition-colors ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <p className="ml-3 text-sm text-gray-500">{step === 1 ? 'เลือกห้อง' : step === 2 ? 'ข้อมูลแขก' : 'วันที่และยืนยัน'}</p>
      </div>

      {/* Step 1: Room */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">ห้องที่ว่าง ({availableRooms.length} ห้อง)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {availableRooms.map(r => (
              <button key={r.id} onClick={() => setForm(f => ({ ...f, room_id: r.id }))}
                className={`p-3 rounded-lg border text-left transition-all ${form.room_id === r.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200 bg-white'}`}>
                <p className="font-bold text-gray-800">ห้อง {r.room_number}</p>
                <p className="text-xs text-gray-500">{ROOM_TYPE[r.room_type]}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1">{formatPrice(r.base_price)}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setStep(2)} disabled={!canProceed1}>ถัดไป →</Button>
          </div>
        </div>
      )}

      {/* Step 2: Guest */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setGuestMode('existing')} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${guestMode === 'existing' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>แขกเก่า</button>
            <button onClick={() => setGuestMode('new')} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${guestMode === 'new' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>แขกใหม่</button>
          </div>

          {guestMode === 'existing' ? (
            <Select label="เลือกแขก" value={form.guest_id} onChange={e => setForm(f => ({ ...f, guest_id: e.target.value }))}>
              <option value="">— เลือกแขก —</option>
              {guests.filter(g => !g.is_blacklisted).map(g => (
                <option key={g.id} value={g.id}>{g.full_name} ({g.phone})</option>
              ))}
            </Select>
          ) : (
            <div className="space-y-3">
              <Input label="ชื่อ-นามสกุล *" value={form.new_guest_name} onChange={e => setForm(f => ({ ...f, new_guest_name: e.target.value }))} placeholder="ชื่อ นามสกุล" />
              <Input label="เบอร์โทร" value={form.new_guest_phone} onChange={e => setForm(f => ({ ...f, new_guest_phone: e.target.value }))} placeholder="0xx-xxx-xxxx" />
            </div>
          )}

          {blacklistedGuest && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠️ แขกคนนี้อยู่ใน Blacklist กรุณาตรวจสอบ
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>← ย้อนกลับ</Button>
            <Button variant="primary" onClick={() => setStep(3)} disabled={!canProceed2}>ถัดไป →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Dates & Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <Select label="ประเภทการเข้าพัก" value={form.booking_type} onChange={e => setForm(f => ({ ...f, booking_type: e.target.value }))}>
            <option value="nightly">รายคืน</option>
            <option value="monthly">รายเดือน</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="วัน Check-in" type="date" value={form.check_in_date} onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))} />
            {form.booking_type === 'nightly' && (
              <Input label="วัน Check-out" type="date" value={form.check_out_date} onChange={e => setForm(f => ({ ...f, check_out_date: e.target.value }))} />
            )}
          </div>

          <Input label="เงินมัดจำ (บาท)" type="number" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />

          <Textarea label="หมายเหตุ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />

          {selectedRoom && (
            <div className="p-4 bg-indigo-50 rounded-xl">
              <p className="text-sm font-semibold text-indigo-800 mb-2">สรุปการจอง</p>
              <div className="space-y-1 text-sm text-indigo-700">
                <p>ห้อง {selectedRoom.room_number} — {ROOM_TYPE[selectedRoom.room_type]}</p>
                {form.booking_type === 'nightly' && nights > 0 && <p>{nights} คืน × {formatPrice(selectedRoom.base_price)}</p>}
                <p className="font-bold text-base">ยอดรวม: {formatPrice(totalAmount)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>← ย้อนกลับ</Button>
            <Button variant="primary" onClick={() => mutation.mutate(form)} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
