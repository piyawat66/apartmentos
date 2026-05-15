import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Droplets, Receipt, Plus, CheckCircle, AlertCircle,
  DollarSign, TrendingUp, Pencil, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  invoicesService, meterReadingsService, expensesService,
  contractsService, guestsService, roomsService, paymentsService,
} from '../lib/database'
import { useProperty } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input, { Select, Textarea } from '../components/ui/Input'
import { formatPrice, formatPriceShort } from '../utils/priceUtils'
import { formatDateTH } from '../utils/dateUtils'

const now = new Date()
const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const EXPENSE_CATEGORIES = {
  repair:    { label: 'ค่าซ่อมบำรุง',     cls: 'bg-red-50 text-red-700' },
  utilities: { label: 'ค่าสาธารณูปโภค',  cls: 'bg-blue-50 text-blue-700' },
  supplies:  { label: 'ค่าอุปกรณ์',       cls: 'bg-orange-50 text-orange-700' },
  other:     { label: 'อื่นๆ',             cls: 'bg-gray-100 text-gray-600' },
}

export default function Finance() {
  const { activePropertyId } = useProperty()
  const { user } = useAuth()
  const qc = useQueryClient()
  const canEdit = ['admin', 'manager'].includes(user?.role)

  const [tab, setTab] = useState('invoices')
  const [invoiceYear, setInvoiceYear] = useState(now.getFullYear())
  const [invoiceMonth, setInvoiceMonth] = useState(now.getMonth() + 1)
  const [payModal, setPayModal] = useState(null)  // invoice object
  const [meterYear, setMeterYear] = useState(now.getFullYear())
  const [meterMonth, setMeterMonth] = useState(now.getMonth() + 1)
  const [expenseModal, setExpenseModal] = useState(null) // null | 'create' | expense object
  const [expenseDeleteId, setExpenseDeleteId] = useState(null)

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts-active', activePropertyId],
    queryFn: () => contractsService.getActive(activePropertyId),
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
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices-month', activePropertyId, invoiceYear, invoiceMonth],
    queryFn: () => invoicesService.getByMonth(activePropertyId, invoiceYear, invoiceMonth),
    enabled: !!activePropertyId,
  })
  const { data: meterReadings = [] } = useQuery({
    queryKey: ['meter-readings', activePropertyId, meterYear, meterMonth],
    queryFn: () => meterReadingsService.getByMonth(activePropertyId, meterYear, meterMonth),
    enabled: !!activePropertyId,
  })
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', activePropertyId],
    queryFn: () => expensesService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: monthRevenue = 0 } = useQuery({
    queryKey: ['month-revenue', activePropertyId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => paymentsService.getMonthlyRevenue(activePropertyId, now.getFullYear(), now.getMonth() + 1),
    enabled: !!activePropertyId,
  })

  // Auto-generate invoices for current month when invoice tab opens
  const generateMutation = useMutation({
    mutationFn: (opts = {}) => invoicesService.generateAllForMonth(activePropertyId, invoiceYear, invoiceMonth),
    onSuccess: (data, opts) => {
      qc.invalidateQueries({ queryKey: ['invoices-month'] })
      if (!opts?.silent) toast.success('สร้างใบแจ้งหนี้สำเร็จ')
    },
  })

  useEffect(() => {
    if (activePropertyId && tab === 'invoices') {
      const isCurrentMonth = invoiceYear === now.getFullYear() && invoiceMonth === now.getMonth() + 1
      if (isCurrentMonth) generateMutation.mutate({ silent: true })
    }
  }, [activePropertyId, tab, invoiceYear, invoiceMonth])

  const payMutation = useMutation({
    mutationFn: (data) => invoicesService.markPaid(payModal.id, data),
    onSuccess: () => { qc.invalidateQueries(); toast.success('บันทึกการชำระเงินสำเร็จ'); setPayModal(null) },
  })
  const saveMeterMutation = useMutation({
    mutationFn: (data) => meterReadingsService.save(data),
    onSuccess: () => { qc.invalidateQueries(); toast.success('บันทึกมิเตอร์สำเร็จ') },
  })
  const saveExpenseMutation = useMutation({
    mutationFn: (data) => expenseModal && expenseModal !== 'create'
      ? expensesService.update(expenseModal.id, data)
      : expensesService.create({ ...data, property_id: activePropertyId, created_by: user?.id || 'user-admin' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('บันทึกสำเร็จ'); setExpenseModal(null) },
  })
  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => expensesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('ลบสำเร็จ'); setExpenseDeleteId(null) },
  })

  // KPIs
  const paid = invoices.filter(i => i.status === 'paid')
  const unpaid = invoices.filter(i => i.status !== 'paid')
  const totalExpected = invoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalCollected = paid.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const totalExpenses = expenses
    .filter(e => (e.paid_at || '').startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`))
    .reduce((s, e) => s + (e.amount || 0), 0)

  const tabs = [
    { key: 'invoices', label: 'ใบแจ้งหนี้', icon: FileText },
    { key: 'meters',   label: 'ค่าน้ำ/ค่าไฟ', icon: Droplets },
    { key: 'expenses', label: 'ค่าใช้จ่าย',  icon: Receipt },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="การเงิน" />
      <div className="p-4 sm:p-6 space-y-5">

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0"><DollarSign size={18} className="text-green-600" /></div>
            <div><p className="text-xs text-gray-500">รายได้เดือนนี้</p><p className="text-lg font-bold text-gray-800">{formatPriceShort(monthRevenue)}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={18} className="text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">ยอดคาด {TH_MONTHS[invoiceMonth-1]}</p><p className="text-lg font-bold text-gray-800">{formatPriceShort(totalExpected)}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0"><CheckCircle size={18} className="text-indigo-600" /></div>
            <div><p className="text-xs text-gray-500">รับแล้ว {paid.length} ราย</p><p className="text-lg font-bold text-gray-800">{formatPriceShort(totalCollected)}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0"><AlertCircle size={18} className="text-red-500" /></div>
            <div><p className="text-xs text-gray-500">ค้างชำระ {unpaid.length} ราย</p><p className="text-lg font-bold text-red-600">{formatPriceShort(totalExpected - totalCollected)}</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* ===== INVOICES TAB ===== */}
        {tab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={invoiceMonth} onChange={e => setInvoiceMonth(+e.target.value)}>
                  {TH_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={invoiceYear} onChange={e => setInvoiceYear(+e.target.value)}>
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y+543}</option>)}
                </select>
              </div>
              {canEdit && (
                <Button variant="secondary" onClick={() => generateMutation.mutate({})} disabled={generateMutation.isPending}>
                  <FileText size={14} /> {generateMutation.isPending ? 'กำลังสร้าง...' : 'สร้างใบแจ้งหนี้เดือนนี้'}
                </Button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ห้อง</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้เช่า</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ค่าเช่า</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ค่าน้ำ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ค่าไฟ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">รวม</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                    {canEdit && <th className="w-24" />}
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                      ยังไม่มีใบแจ้งหนี้ — กด "สร้างใบแจ้งหนี้เดือนนี้"
                    </td></tr>
                  ) : [...invoices].sort((a, b) => {
                    const ra = rooms.find(r => r.id === a.room_id)?.room_number || ''
                    const rb = rooms.find(r => r.id === b.room_id)?.room_number || ''
                    return ra.localeCompare(rb, undefined, { numeric: true })
                  }).map(inv => {
                    const guest = guests.find(g => g.id === inv.guest_id)
                    const room = rooms.find(r => r.id === inv.room_id)
                    const overdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < now
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">ห้อง {room?.room_number || '-'}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{guest?.full_name || '-'}</p>
                          <p className="text-xs text-gray-400">{guest?.phone || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{inv.rent_amount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-600 text-xs">
                          {inv.water_units > 0 ? `${inv.water_units}u = ${inv.water_amount?.toLocaleString()}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 text-xs">
                          {inv.electric_units > 0 ? `${inv.electric_units}u = ${inv.electric_amount?.toLocaleString()}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{inv.total_amount?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-700'
                            : overdue ? 'bg-red-100 text-red-600'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                            {inv.status === 'paid' ? 'ชำระแล้ว' : overdue ? 'เกินกำหนด' : 'ค้างชำระ'}
                          </span>
                          {inv.status === 'paid' && <p className="text-xs text-gray-400 mt-0.5">{inv.payment_method}</p>}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            {inv.status !== 'paid' && (
                              <button onClick={() => setPayModal(inv)}
                                className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                รับชำระ
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== METER READINGS TAB ===== */}
        {tab === 'meters' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={meterMonth} onChange={e => setMeterMonth(+e.target.value)}>
                {TH_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={meterYear} onChange={e => setMeterYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y+543}</option>)}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contracts.map(contract => {
                const guest = guests.find(g => g.id === contract.guest_id)
                const room = rooms.find(r => r.id === contract.room_id)
                const existing = meterReadings.find(m => m.contract_id === contract.id)
                return (
                  <MeterCard
                    key={contract.id}
                    contract={contract}
                    guest={guest}
                    room={room}
                    existing={existing}
                    year={meterYear}
                    month={meterMonth}
                    canEdit={canEdit}
                    onSave={data => saveMeterMutation.mutate(data)}
                  />
                )
              })}
              {contracts.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400">ไม่มีสัญญาที่ใช้งานอยู่</div>
              )}
            </div>
          </div>
        )}

        {/* ===== EXPENSES TAB ===== */}
        {tab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">ค่าใช้จ่ายเดือนนี้: <span className="font-bold text-red-600">{formatPrice(totalExpenses)}</span></p>
              </div>
              {canEdit && (
                <Button variant="primary" onClick={() => setExpenseModal('create')}>
                  <Plus size={14} /> เพิ่มรายจ่าย
                </Button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {expenses.length === 0 ? (
                <p className="text-center py-12 text-gray-400">ยังไม่มีรายการค่าใช้จ่าย</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {expenses.map(e => {
                    const cat = EXPENSE_CATEGORIES[e.category] || EXPENSE_CATEGORIES.other
                    return (
                      <div key={e.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium text-gray-800">{e.title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.cls}`}>{cat.label}</span>
                          </div>
                          <p className="text-xs text-gray-400">{formatDateTH(e.paid_at)}{e.note ? ` — ${e.note}` : ''}</p>
                        </div>
                        <p className="font-bold text-gray-800 shrink-0">{formatPrice(e.amount)}</p>
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setExpenseModal(e)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil size={13} /></button>
                            <button onClick={() => setExpenseDeleteId(e.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment modal */}
      {payModal && (
        <PayModal
          invoice={payModal}
          guest={guests.find(g => g.id === payModal.guest_id)}
          room={rooms.find(r => r.id === payModal.room_id)}
          onSubmit={d => payMutation.mutate(d)}
          loading={payMutation.isPending}
          onClose={() => setPayModal(null)}
        />
      )}

      {/* Expense modal */}
      {expenseModal && (
        <ExpenseModal
          initial={expenseModal !== 'create' ? expenseModal : null}
          onSubmit={d => saveExpenseMutation.mutate(d)}
          loading={saveExpenseMutation.isPending}
          onClose={() => setExpenseModal(null)}
        />
      )}

      {/* Delete confirm */}
      {expenseDeleteId && (
        <Modal isOpen title="ยืนยันการลบ" onClose={() => setExpenseDeleteId(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">ต้องการลบรายการนี้หรือไม่?</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setExpenseDeleteId(null)}>ยกเลิก</Button>
            <Button variant="danger" onClick={() => deleteExpenseMutation.mutate(expenseDeleteId)}>ลบ</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MeterCard({ contract, guest, room, existing, year, month, canEdit, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    water_prev: existing?.water_prev ?? '',
    water_curr: existing?.water_curr ?? '',
    electric_prev: existing?.electric_prev ?? '',
    electric_curr: existing?.electric_curr ?? '',
    water_image_url: existing?.water_image_url ?? '',
    electric_image_url: existing?.electric_image_url ?? '',
  })

  useEffect(() => {
    if (existing) {
      setForm({
        water_prev: existing.water_prev ?? '',
        water_curr: existing.water_curr ?? '',
        electric_prev: existing.electric_prev ?? '',
        electric_curr: existing.electric_curr ?? '',
        water_image_url: existing.water_image_url ?? '',
        electric_image_url: existing.electric_image_url ?? '',
      })
    }
  }, [existing])

  const wUnits = Math.max(0, (+form.water_curr || 0) - (+form.water_prev || 0))
  const eUnits = Math.max(0, (+form.electric_curr || 0) - (+form.electric_prev || 0))
  const wAmt = wUnits * (contract.water_rate || 18)
  const eAmt = eUnits * (contract.electric_rate || 5)

  function handleSave() {
    onSave({
      property_id: contract.property_id,
      contract_id: contract.id,
      room_id: contract.room_id,
      year, month,
      water_prev: +form.water_prev || 0,
      water_curr: +form.water_curr || 0,
      electric_prev: +form.electric_prev || 0,
      electric_curr: +form.electric_curr || 0,
      water_image_url: form.water_image_url || null,
      electric_image_url: form.electric_image_url || null,
    })
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">ห้อง {room?.room_number}</p>
          <p className="text-xs text-gray-500">{guest?.full_name}</p>
        </div>
        {existing && !editing && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">บันทึกแล้ว</span>}
      </div>

      {!editing ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">💧 น้ำ</span>
            <span className="font-medium">{existing ? `${existing.water_curr - existing.water_prev} หน่วย = ${((existing.water_curr - existing.water_prev) * contract.water_rate).toLocaleString()} บาท` : <span className="text-gray-300">ยังไม่บันทึก</span>}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">⚡ ไฟ</span>
            <span className="font-medium">{existing ? `${existing.electric_curr - existing.electric_prev} หน่วย = ${((existing.electric_curr - existing.electric_prev) * contract.electric_rate).toLocaleString()} บาท` : <span className="text-gray-300">ยังไม่บันทึก</span>}</span>
          </div>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="w-full mt-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              {existing ? 'แก้ไขมิเตอร์' : 'บันทึกมิเตอร์'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-blue-600 mb-1">💧 มิเตอร์น้ำ</p>
            <div className="grid grid-cols-2 gap-2">
              <Input label="ค่าเดิม" type="number" value={form.water_prev} onChange={e => setForm(f => ({ ...f, water_prev: e.target.value }))} />
              <Input label="ค่าใหม่" type="number" value={form.water_curr} onChange={e => setForm(f => ({ ...f, water_curr: e.target.value }))} />
            </div>
            <p className="text-xs text-blue-600 mt-1">{wUnits} หน่วย × {contract.water_rate} = {wAmt.toLocaleString()} บาท</p>
            <Input label="URL รูปมิเตอร์น้ำ" value={form.water_image_url} onChange={e => setForm(f => ({ ...f, water_image_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <p className="text-xs font-medium text-yellow-600 mb-1">⚡ มิเตอร์ไฟ</p>
            <div className="grid grid-cols-2 gap-2">
              <Input label="ค่าเดิม" type="number" value={form.electric_prev} onChange={e => setForm(f => ({ ...f, electric_prev: e.target.value }))} />
              <Input label="ค่าใหม่" type="number" value={form.electric_curr} onChange={e => setForm(f => ({ ...f, electric_curr: e.target.value }))} />
            </div>
            <p className="text-xs text-yellow-600 mt-1">{eUnits} หน่วย × {contract.electric_rate} = {eAmt.toLocaleString()} บาท</p>
            <Input label="URL รูปมิเตอร์ไฟ" value={form.electric_image_url} onChange={e => setForm(f => ({ ...f, electric_image_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>ยกเลิก</Button>
            <Button variant="primary" className="flex-1" onClick={handleSave}>บันทึก</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PayModal({ invoice, guest, room, onSubmit, loading, onClose }) {
  const [form, setForm] = useState({
    paid_amount: invoice.total_amount || '',
    payment_method: 'transfer',
    slip_url: '',
    note: '',
    paid_at: new Date().toISOString(),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal isOpen title="บันทึกการชำระเงิน" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-indigo-50 rounded-lg text-sm">
          <p className="font-semibold text-indigo-800">ห้อง {room?.room_number} — {guest?.full_name}</p>
          <p className="text-indigo-600">ยอดที่ต้องชำระ: <span className="font-bold">{formatPrice(invoice.total_amount)}</span></p>
        </div>
        <Input label="จำนวนเงินที่รับ (บาท) *" type="number" value={form.paid_amount} onChange={e => set('paid_amount', +e.target.value)} />
        <Select label="วิธีชำระ" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
          <option value="cash">เงินสด</option>
          <option value="transfer">โอนเงิน</option>
          <option value="promptpay">พร้อมเพย์</option>
          <option value="other">อื่นๆ</option>
        </Select>
        <Input label="URL รูปสลิป" value={form.slip_url} onChange={e => set('slip_url', e.target.value)} placeholder="https://..." />
        <Input label="หมายเหตุ" value={form.note} onChange={e => set('note', e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => onSubmit(form)} disabled={!form.paid_amount || loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ExpenseModal({ initial, onSubmit, loading, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    amount: initial?.amount || '',
    category: initial?.category || 'other',
    paid_at: initial?.paid_at ? initial.paid_at.split('T')[0] : new Date().toISOString().split('T')[0],
    image_url: initial?.image_url || '',
    note: initial?.note || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal isOpen title={initial ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'} onClose={onClose} size="sm">
      <div className="space-y-4">
        <Input label="รายการ *" value={form.title} onChange={e => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="จำนวนเงิน (บาท) *" type="number" value={form.amount} onChange={e => set('amount', +e.target.value)} />
          <Select label="หมวดหมู่" value={form.category} onChange={e => set('category', e.target.value)}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
        <Input label="วันที่จ่าย" type="date" value={form.paid_at} onChange={e => set('paid_at', e.target.value)} />
        <Input label="URL รูปใบเสร็จ" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
        <Input label="หมายเหตุ" value={form.note} onChange={e => set('note', e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => onSubmit({ ...form, paid_at: new Date(form.paid_at).toISOString() })} disabled={!form.title || !form.amount || loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
