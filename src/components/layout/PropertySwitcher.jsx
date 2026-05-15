import { useState } from 'react'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { useProperty } from '../../context/PropertyContext'

export default function PropertySwitcher() {
  const { activeProperty, properties, switchProperty } = useProperty()
  const [open, setOpen] = useState(false)

  if (!activeProperty) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition-colors w-full"
      >
        <Building2 size={16} className="text-indigo-200 shrink-0" />
        <span className="flex-1 text-left text-sm font-medium text-white truncate">{activeProperty.name}</span>
        <ChevronDown size={14} className={`text-indigo-200 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20 overflow-hidden">
            {properties.map(p => (
              <button
                key={p.id}
                onClick={() => { switchProperty(p.id); setOpen(false) }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
              >
                <Building2 size={14} className="text-gray-400 shrink-0" />
                <span className="flex-1 truncate text-gray-700">{p.name}</span>
                {p.id === activeProperty.id && <Check size={14} className="text-indigo-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
