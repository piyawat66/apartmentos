export const ROOM_STATUS = {
  available:   { label: 'ว่าง',              bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  occupied:    { label: 'มีผู้เข้าพัก',       bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  dirty:       { label: 'รอทำความสะอาด',     bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  maintenance: { label: 'ซ่อมบำรุง',          bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  reserved:    { label: 'จองแล้ว',            bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
}

export const BOOKING_STATUS = {
  reserved:     { label: 'จองแล้ว',       bg: 'bg-purple-100', text: 'text-purple-700' },
  checked_in:   { label: 'เข้าพักแล้ว',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  checked_out:  { label: 'Check-out แล้ว', bg: 'bg-gray-100',   text: 'text-gray-600' },
  cancelled:    { label: 'ยกเลิก',         bg: 'bg-red-50',     text: 'text-red-500' },
  no_show:      { label: 'ไม่มาตามนัด',    bg: 'bg-orange-100', text: 'text-orange-700' },
}

export const ROOM_TYPE = {
  ac:    'ห้องแอร์',
  fan:   'ห้องพัดลม',
  large: 'ห้องใหญ่',
}

export const PRIORITY = {
  low:    { label: 'ต่ำ',       bg: 'bg-gray-100',    text: 'text-gray-600' },
  medium: { label: 'กลาง',      bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  high:   { label: 'สูง',       bg: 'bg-orange-100',  text: 'text-orange-700' },
  urgent: { label: 'เร่งด่วน',  bg: 'bg-red-100',     text: 'text-red-700' },
}

export const MAINTENANCE_STATUS = {
  open:        { label: 'เปิดใหม่',       bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'กำลังดำเนินการ', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved:    { label: 'แก้ไขแล้ว',     bg: 'bg-green-100',  text: 'text-green-700' },
  closed:      { label: 'ปิดแล้ว',       bg: 'bg-gray-100',   text: 'text-gray-600' },
}

export const HK_STATUS = {
  pending:     { label: 'รอดำเนินการ',     bg: 'bg-yellow-100', text: 'text-yellow-700' },
  in_progress: { label: 'กำลังทำความสะอาด', bg: 'bg-blue-100',   text: 'text-blue-700' },
  done:        { label: 'เสร็จแล้ว',      bg: 'bg-green-100',  text: 'text-green-700' },
}

export const ROLE_LABELS = {
  admin:       'ผู้ดูแลระบบ',
  manager:     'ผู้จัดการ',
  staff:       'พนักงาน Front Desk',
  housekeeper: 'แม่บ้าน',
}

export const AMENITY_LABELS = {
  wifi:         'WiFi',
  ac:           'แอร์',
  tv:           'ทีวี',
  fridge:       'ตู้เย็น',
  water_heater: 'เครื่องทำน้ำอุ่น',
}

export function roomStatusClass(status) {
  return ROOM_STATUS[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
}
