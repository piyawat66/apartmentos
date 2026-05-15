import { format, parseISO, differenceInDays, isValid } from 'date-fns'

export function formatDateTH(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return '-'
    const buddhistYear = d.getFullYear() + 543
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${day}/${month}/${buddhistYear}`
  } catch {
    return '-'
  }
}

export function formatDateTimeTH(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return '-'
    const buddhistYear = d.getFullYear() + 543
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${buddhistYear} ${hours}:${minutes}`
  } catch {
    return '-'
  }
}

export function formatDateInput(dateStr) {
  if (!dateStr) return ''
  try {
    const d = parseISO(dateStr)
    return format(d, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function nightCount(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  try {
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
  } catch {
    return 0
  }
}

export function thaiMonthNames() {
  return ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
}
