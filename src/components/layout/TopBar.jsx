import { Bell, Sun, Moon } from 'lucide-react'
import { formatDateTH } from '../../utils/dateUtils'
import { useFontSize } from '../../context/FontSizeContext'
import { useTheme } from '../../context/ThemeContext'

export default function TopBar({ title }) {
  const today = formatDateTH(new Date().toISOString())
  const { decrease, increase, reset, canDecrease, canIncrease } = useFontSize()
  const { isDark, toggle } = useTheme()

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-10">
      <h1 className="text-base font-semibold text-gray-800 truncate">{title}</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Font size controls */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
          <button onClick={decrease} disabled={!canDecrease} title="ลดขนาดตัวอักษร"
            className="px-2 py-0.5 rounded text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-medium">
            A−
          </button>
          <button onClick={reset} title="รีเซ็ตขนาดตัวอักษร"
            className="px-2 py-0.5 rounded text-gray-500 hover:bg-white hover:text-gray-700 transition-all text-sm font-medium">
            A
          </button>
          <button onClick={increase} disabled={!canIncrease} title="เพิ่มขนาดตัวอักษร"
            className="px-2 py-0.5 rounded text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-base font-medium leading-none">
            A+
          </button>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <span className="hidden sm:block text-sm text-gray-500 whitespace-nowrap">{today}</span>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={18} className="text-gray-500" />
        </button>
      </div>
    </header>
  )
}
