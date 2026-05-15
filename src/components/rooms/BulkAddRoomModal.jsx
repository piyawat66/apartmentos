import { useState } from 'react'
import { Wifi, Wind, Tv, Refrigerator, Droplets } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

const AMENITIES = [
  { key: 'wifi',         label: 'WiFi',              icon: Wifi },
  { key: 'ac',           label: 'แอร์',               icon: Wind },
  { key: 'tv',           label: 'ทีวี',               icon: Tv },
  { key: 'fridge',       label: 'ตู้เย็น',            icon: Refrigerator },
  { key: 'water_heater', label: 'เครื่องทำน้ำอุ่น',   icon: Droplets },
]

export default function BulkAddRoomModal({ isOpen, onClose, onSuccess, floor }) {
  const [form, setForm] = useState({
    prefix: '',
    start: 1,
    end: 10,
    room_type: 'ac',
    base_price: 4500,
    max_occupancy: 2,
    amenities: ['wifi', 'ac'],
  })

  function toggleAmenity(key) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(key)
        ? f.amenities.filter(a => a !== key)
        : [...f.amenities, key],
    }))
  }

  function handleSubmit() {
    const rooms = []
    for (let i = form.start; i <= form.end; i++) {
      rooms.push({
        floor_id: floor?.id,
        property_id: floor?.property_id,
        room_number: `${form.prefix}${String(i).padStart(2, '0')}`,
        room_type: form.room_type,
        base_price: Number(form.base_price),
        max_occupancy: Number(form.max_occupancy),
        amenities: [...form.amenities],
        status: 'available',
        notes: '',
      })
    }
    onSuccess(rooms)
  }

  const count = Math.max(0, form.end - form.start + 1)
  const preview = count > 0
    ? `${form.prefix}${String(form.start).padStart(2, '0')} — ${form.prefix}${String(form.end).padStart(2, '0')}`
    : '—'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`เพิ่มห้องหลายห้อง — ${floor?.name}`} size="md">
      <div className="space-y-5">

        {/* Range */}
        <div className="grid grid-cols-3 gap-3">
          <Input label="คำนำหน้า (prefix)" placeholder="เช่น 1, A" value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} />
          <Input label="เริ่มที่เลข" type="number" min={1} value={form.start} onChange={e => setForm(f => ({ ...f, start: Number(e.target.value) }))} />
          <Input label="ถึงเลข" type="number" min={1} value={form.end} onChange={e => setForm(f => ({ ...f, end: Number(e.target.value) }))} />
        </div>

        {/* Preview badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-xl text-sm text-indigo-700">
          <span>จะสร้าง</span>
          <span className="font-black text-indigo-800 text-base">{count}</span>
          <span>ห้อง:</span>
          <span className="font-semibold">{preview}</span>
        </div>

        {/* Type + price + occupancy */}
        <div className="grid grid-cols-3 gap-3">
          <Select label="ประเภทห้อง" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
            <option value="ac">ห้องแอร์</option>
            <option value="fan">ห้องพัดลม</option>
            <option value="large">ห้องใหญ่</option>
          </Select>
          <Input label="ราคา/เดือน (บาท)" type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} />
          <Input label="จำนวนคนสูงสุด" type="number" min={1} value={form.max_occupancy} onChange={e => setForm(f => ({ ...f, max_occupancy: e.target.value }))} />
        </div>

        {/* Amenities */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2.5">สิ่งอำนวยความสะดวก</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(({ key, label, icon: Icon }) => {
              const active = form.amenities.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAmenity(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <Icon size={12} strokeWidth={2.5} />
                  {label}
                </button>
              )
            })}
          </div>
          {form.amenities.length === 0 && (
            <p className="text-xs text-gray-400 mt-1.5">ยังไม่ได้เลือกสิ่งอำนวยความสะดวก</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={count === 0}>
            สร้าง {count} ห้อง
          </Button>
        </div>
      </div>
    </Modal>
  )
}
