import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { SidebarProvider } from '../../context/SidebarContext'

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto min-w-0 pb-20 lg:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </SidebarProvider>
  )
}
