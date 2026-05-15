import { useProperty } from '../context/PropertyContext'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import { ROLE_LABELS } from '../utils/statusUtils'
import { User, Building2, Info } from 'lucide-react'

export default function Settings() {
  const { activeProperty } = useProperty()
  const { user } = useAuth()

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="ตั้งค่า" />
      <div className="p-6 space-y-6 max-w-2xl">

        {/* Current User */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={18} /> ข้อมูลผู้ใช้งาน
          </h3>
          <div className="space-y-2 text-sm">
            <Row label="ชื่อ"     value={user?.full_name} />
            <Row label="อีเมล"    value={user?.email} />
            <Row label="บทบาท"   value={ROLE_LABELS[user?.role] || user?.role} />
          </div>
        </div>

        {/* Active Property */}
        {activeProperty && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={18} /> ที่พักปัจจุบัน
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="ชื่อ"    value={activeProperty.name} />
              <Row label="ที่อยู่"  value={activeProperty.address || '—'} />
              <Row label="เบอร์โทร" value={activeProperty.phone   || '—'} />
            </div>
          </div>
        )}

        {/* App version */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
            <Info size={16} /> เกี่ยวกับระบบ
          </h3>
          <div className="space-y-1.5 text-sm">
            <Row label="เวอร์ชัน"    value="1.0.0" />
            <Row label="Backend"     value="Supabase (PostgreSQL)" />
            <Row label="Frontend"    value="React 19 + Vite + TailwindCSS" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right max-w-xs truncate">{value}</span>
    </div>
  )
}
