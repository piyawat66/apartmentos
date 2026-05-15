import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, BedDouble, FileText, Calendar, Users,
  DollarSign, Wrench, Sparkles, Settings, LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'หน้าหลัก',   roles: ['admin', 'manager', 'staff'] },
  { to: '/contracts',    icon: FileText,        label: 'สัญญา',      roles: ['admin', 'manager', 'staff'] },
  { to: '/guests',       icon: Users,           label: 'ผู้เช่า',     roles: ['admin', 'manager', 'staff'] },
  { to: '/finance',      icon: DollarSign,      label: 'การเงิน',     roles: ['admin', 'manager'] },
  { to: '/rooms',        icon: BedDouble,       label: 'ห้อง',        roles: ['admin', 'manager', 'staff'] },
  { to: '/bookings',     icon: Calendar,        label: 'รายวัน',     roles: ['admin', 'manager', 'staff'] },
  { to: '/housekeeping', icon: Sparkles,        label: 'แม่บ้าน',     roles: ['admin', 'manager', 'staff', 'housekeeper'] },
  { to: '/maintenance',  icon: Wrench,          label: 'แจ้งซ่อม',    roles: ['admin', 'manager', 'staff'] },
  { to: '/settings',     icon: Settings,        label: 'ตั้งค่า',      roles: ['admin'] },
]

export default function BottomNav() {
  const { user, logout } = useAuth()
  const allowed = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
      <div className="flex overflow-x-auto scrollbar-none">
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2.5 min-w-[64px] flex-1 transition-colors ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-indigo-50' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium leading-none whitespace-nowrap">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex flex-col items-center gap-0.5 px-3 py-2.5 min-w-[64px] text-gray-400 hover:text-red-500 transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-xl">
            <LogOut size={20} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-medium leading-none whitespace-nowrap">ออกจากระบบ</span>
        </button>
      </div>
    </nav>
  )
}
