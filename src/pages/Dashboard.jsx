import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BedDouble, Users, TrendingUp, DollarSign, LogIn, LogOut, BarChart2, Activity, Layers, FileText, AlertCircle } from 'lucide-react'
import { useProperty } from '../context/PropertyContext'
import { roomsService, contractsService, invoicesService, paymentsService } from '../lib/database'
import { formatPrice, formatPriceShort } from '../utils/priceUtils'
import { formatDateTH } from '../utils/dateUtils'
import { ROOM_STATUS } from '../utils/statusUtils'
import TopBar from '../components/layout/TopBar'
import { useNavigate } from 'react-router-dom'

const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const pad = n => String(n).padStart(2, '0')

export default function Dashboard() {
  const { activePropertyId } = useProperty()
  const navigate = useNavigate()
  const now = new Date()

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsService.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts-active', activePropertyId],
    queryFn: () => contractsService.getActive(activePropertyId),
    enabled: !!activePropertyId,
  })
  const { data: monthInvoices = [] } = useQuery({
    queryKey: ['invoices-month', activePropertyId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => invoicesService.getByMonth(activePropertyId, now.getFullYear(), now.getMonth() + 1),
    enabled: !!activePropertyId,
  })
  const { data: monthRevenue = 0 } = useQuery({
    queryKey: ['month-revenue', activePropertyId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => paymentsService.getMonthlyRevenue(activePropertyId, now.getFullYear(), now.getMonth() + 1),
    enabled: !!activePropertyId,
  })

  const occupied = rooms.filter(r => r.status === 'occupied').length
  const available = rooms.filter(r => r.status === 'available').length
  const occupancyRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0

  const unpaidInvoices = monthInvoices.filter(i => i.status !== 'paid')
  const totalExpected = monthInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)

  const roomStatusCounts = {
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    dirty:       rooms.filter(r => r.status === 'dirty').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    reserved:    rooms.filter(r => r.status === 'reserved').length,
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Dashboard" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={FileText}   label="สัญญาเช่าใช้งาน"  value={contracts.length}               sub={`ห้องว่าง ${available} ห้อง`}  color="blue" />
          <KpiCard icon={TrendingUp} label="Occupancy Rate"   value={`${occupancyRate}%`}            sub={`${occupied}/${rooms.length} ห้อง`} color="purple" />
          <KpiCard icon={DollarSign} label="รับแล้วเดือนนี้"  value={formatPriceShort(monthRevenue)} sub={`คาด ${formatPriceShort(totalExpected)}`} color="green" />
          <KpiCard icon={AlertCircle} label="ค้างชำระเดือนนี้" value={unpaidInvoices.length}          sub="ห้อง"                            color="orange" onClick={() => navigate('/finance')} />
        </div>

        {/* Room Status Summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">สถานะห้องทั้งหมด</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ROOM_STATUS).map(([key, val]) => (
              <div key={key} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${val.bg}`}>
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                <span className={`text-sm font-medium ${val.text}`}>{val.label}</span>
                <span className={`text-base font-bold ${val.text}`}>{roomStatusCounts[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid invoices this month */}
        {unpaidInvoices.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><AlertCircle size={16} className="text-orange-500" /> ค้างชำระเดือนนี้ ({unpaidInvoices.length} ห้อง)</h3>
              <button onClick={() => navigate('/finance')} className="text-xs text-indigo-600 hover:underline">ดูทั้งหมด</button>
            </div>
            <div className="space-y-2">
              {unpaidInvoices.slice(0, 4).map(inv => {
                const room = rooms.find(r => r.id === inv.room_id)
                const overdue = inv.due_date && new Date(inv.due_date) < now
                return (
                  <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">ห้อง {room?.room_number || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${overdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-700'}`}>
                        {overdue ? 'เกินกำหนด' : 'ค้างชำระ'}
                      </span>
                      <span className="font-semibold text-gray-800">{formatPriceShort(inv.total_amount)}</span>
                    </div>
                  </div>
                )
              })}
              {unpaidInvoices.length > 4 && (
                <button onClick={() => navigate('/finance')} className="text-xs text-indigo-600 hover:underline w-full text-center pt-1">
                  และอีก {unpaidInvoices.length - 4} รายการ
                </button>
              )}
            </div>
          </div>
        )}

        {/* Revenue Chart */}
        <RevenueChart propertyId={activePropertyId} />
      </div>
    </div>
  )
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

function RevenueChart({ propertyId }) {
  const [period, setPeriod] = useState('1m')
  const [chartType, setChartType] = useState('bar')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { data: payments = [] } = useQuery({
    queryKey: ['all-payments', propertyId],
    queryFn: () => paymentsService.getByProperty(propertyId),
    enabled: !!propertyId,
  })

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const chartData = useMemo(() => {
    const filterRange = (start, end) =>
      payments.filter(p => { const d = p.paid_at.split('T')[0]; return d >= start && d <= end })

    function byDay(start, end) {
      const rows = []
      const cur = new Date(start + 'T00:00:00')
      const endD = new Date(end + 'T00:00:00')
      while (cur <= endD) {
        const ds = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`
        rows.push({ name: `${cur.getDate()}/${cur.getMonth() + 1}`, ds, รายได้: 0 })
        cur.setDate(cur.getDate() + 1)
      }
      filterRange(start, end).forEach(p => {
        const e = rows.find(r => r.ds === p.paid_at.split('T')[0])
        if (e) e.รายได้ += p.amount
      })
      return rows
    }

    function byMonth(start, end) {
      const rows = []
      let [sy, sm] = start.substring(0, 7).split('-').map(Number)
      const [ey, em] = end.substring(0, 7).split('-').map(Number)
      while (sy < ey || (sy === ey && sm <= em)) {
        rows.push({ name: `${TH_MONTHS[sm - 1]} ${sy + 543}`, key: `${sy}-${pad(sm)}`, รายได้: 0 })
        if (++sm > 12) { sm = 1; sy++ }
      }
      payments.filter(p => {
        const k = p.paid_at.substring(0, 7)
        return k >= start.substring(0, 7) && k <= end.substring(0, 7)
      }).forEach(p => {
        const e = rows.find(r => r.key === p.paid_at.substring(0, 7))
        if (e) e.รายได้ += p.amount
      })
      return rows
    }

    if (period === '1d') {
      const hourly = Array.from({ length: 24 }, (_, h) => ({ name: `${pad(h)}:00`, รายได้: 0 }))
      payments.filter(p => p.paid_at.startsWith(todayStr)).forEach(p => {
        hourly[parseInt(p.paid_at.split('T')[1].split(':')[0])].รายได้ += p.amount
      })
      return hourly
    }
    if (period === '7d') {
      const s = new Date(today); s.setDate(s.getDate() - 6)
      return byDay(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`, todayStr)
    }
    if (period === '1m') {
      return byDay(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`, todayStr)
    }
    if (period === '6m') {
      const s = new Date(today.getFullYear(), today.getMonth() - 5, 1)
      return byMonth(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-01`, todayStr)
    }
    if (period === '1y') {
      return byMonth(`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`)
    }
    if (period === 'custom' && customStart && customEnd && customStart <= customEnd) {
      const diff = (new Date(customEnd) - new Date(customStart)) / 86400000
      return diff <= 60 ? byDay(customStart, customEnd) : byMonth(customStart, customEnd)
    }
    return []
  }, [payments, period, customStart, customEnd, todayStr])

  const total = chartData.reduce((s, d) => s + d.รายได้, 0)

  const PERIODS = [
    { key: '1d',     label: '1 วัน' },
    { key: '7d',     label: '1 สัปดาห์' },
    { key: '1m',     label: 'เดือนนี้' },
    { key: '6m',     label: '6 เดือน' },
    { key: '1y',     label: '1 ปี' },
    { key: 'custom', label: 'กำหนดเอง' },
  ]
  const CHART_TYPES = [
    { key: 'bar',  icon: BarChart2, label: 'แท่ง' },
    { key: 'line', icon: Activity,  label: 'เส้น' },
    { key: 'area', icon: Layers,    label: 'พื้นที่' },
  ]

  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }
  const axisProps = { dataKey: 'name', tick: { fontSize: 10 }, interval: 'preserveStartEnd' }
  const yProps = { tick: { fontSize: 10 }, tickFormatter: v => formatPriceShort(v), width: 58 }
  const gridProps = { strokeDasharray: '3 3', stroke: '#f3f4f6' }
  const tooltipFmt = (v) => [formatPrice(v), 'รายได้']
  const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 }

  const hasData = chartData.some(d => d.รายได้ > 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">รายได้</h3>
          <p className="text-2xl font-bold text-indigo-600 mt-0.5 leading-none">{formatPriceShort(total)}</p>
          <p className="text-xs text-gray-400 mt-1">รวมในช่วงที่เลือก</p>
        </div>
        {/* Chart type toggle */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 shrink-0">
          {CHART_TYPES.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setChartType(key)} title={label}
              className={`p-2 rounded-md transition-all ${chartType === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none pb-0.5">
        {PERIODS.map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700" />
          <span className="text-sm text-gray-400">ถึง</span>
          <input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700" />
        </div>
      )}

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-400">
          {period === 'custom' && (!customStart || !customEnd) ? 'เลือกช่วงวันที่ที่ต้องการ' : 'ไม่มีข้อมูลในช่วงนี้'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={chartMargin}>
              <CartesianGrid {...gridProps} />
              <XAxis {...axisProps} />
              <YAxis {...yProps} />
              <Tooltip formatter={tooltipFmt} contentStyle={tooltipStyle} />
              <Bar dataKey="รายได้" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartData} margin={chartMargin}>
              <CartesianGrid {...gridProps} />
              <XAxis {...axisProps} />
              <YAxis {...yProps} />
              <Tooltip formatter={tooltipFmt} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="รายได้" stroke="#6366f1" strokeWidth={2}
                dot={{ r: 2.5, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={chartMargin}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis {...axisProps} />
              <YAxis {...yProps} />
              <Tooltip formatter={tooltipFmt} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="รายได้" stroke="#6366f1" fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      )}

      {/* No revenue hint */}
      {chartData.length > 0 && !hasData && (
        <p className="text-center text-xs text-gray-400 mt-2">ไม่มีรายได้ในช่วงนี้</p>
      )}
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', border: 'border-orange-100' },
  }
  const c = colors[color] || colors.indigo
  return (
    <div className={`bg-white rounded-xl border ${c.border} p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`} onClick={onClick}>
      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={22} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-400 truncate">{sub}</p>
      </div>
    </div>
  )
}

// ─── Activity Card ───────────────────────────────────────────────────────────

function ActivityCard({ icon: Icon, title, items, emptyText, color, onClick }) {
  const colors = { blue: 'text-blue-600 bg-blue-50', orange: 'text-orange-600 bg-orange-50' }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon size={14} />
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        </div>
        <span className="text-xs text-gray-400">{items.length} รายการ</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 3).map(b => (
            <div key={b.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate">ห้อง {b.room_id}</span>
              <span className="text-gray-500 text-xs shrink-0 ml-2">{formatDateTH(b.check_in_date)}</span>
            </div>
          ))}
          {items.length > 3 && (
            <button onClick={onClick} className="text-xs text-indigo-600 hover:underline">ดูทั้งหมด {items.length} รายการ</button>
          )}
        </div>
      )}
    </div>
  )
}
