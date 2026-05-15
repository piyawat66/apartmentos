export function formatPrice(amount) {
  if (amount === null || amount === undefined) return '-'
  return `${Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
}

export function formatPriceShort(amount) {
  if (amount === null || amount === undefined) return '-'
  return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
