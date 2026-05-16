import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, BedDouble, FileText, Calendar, Users,
  DollarSign, Wrench, Sparkles, Settings, LogOut, Hotel, X
} from 'lucide-react'
import PropertySwitcher from './PropertySwitcher'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'
import { ROLE_LABELS } from '../../utils/statusUtils'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',       roles: ['admin', 'manager', 'staff'] },
  { to: '/contracts',    icon: FileText,        label: 'สัญญาเช่า',        roles: ['admin', 'manager', 'staff'] },
  { to: '/guests',       icon: Users,           label: 'ผู้เช่า',           roles: ['admin', 'manager', 'staff'] },
  { to: '/finance',      icon: DollarSign,      label: 'การเงิน',           roles: ['admin', 'manager'] },
  { to: '/rooms',        icon: BedDouble,       label: 'ผังห้อง',           roles: ['admin', 'manager', 'staff'] },
  { to: '/bookings',     icon: Calendar,        label: 'จองรายวัน',         roles: ['admin', 'manager', 'staff'] },
  { to: '/housekeeping', icon: Sparkles,        label: 'แม่บ้าน',            roles: ['admin', 'manager', 'staff', 'housekeeper'] },
  { to: '/maintenance',  icon: Wrench,          label: 'แจ้งซ่อม',           roles: ['admin', 'manager', 'staff'] },
  { to: '/settings',     icon: Settings,        label: 'ตั้งค่า',            roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { isOpen, close } = useSidebar()
  const allowed = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-indigo-800 text-white min-h-screen sticky top-0 h-screen overflow-y-auto">
      <div className="px-4 py-5 border-b border-indigo-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Hotel size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white leading-tight">ApartmentOS</p>
            <p className="text-xs text-indigo-300">ระบบจัดการที่พัก</p>
          </div>
        </div>
        <PropertySwitcher />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-indigo-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {user?.full_name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-indigo-300">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
