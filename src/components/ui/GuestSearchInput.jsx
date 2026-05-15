import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

function Highlight({ text, query }) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-800 rounded-sm not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function Avatar({ name }) {
  const COLORS = [
    'bg-indigo-100 text-indigo-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-purple-100 text-purple-600',
    'bg-orange-100 text-orange-600',
    'bg-pink-100 text-pink-600',
    'bg-teal-100 text-teal-600',
  ]
  const color = COLORS[(name || '').charCodeAt(0) % COLORS.length]
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${color}`}>
      {(name || '?').charAt(0)}
    </div>
  )
}

export default function GuestSearchInput({ label, guests = [], value, onChange, required }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = guests.find(g => g.id === value)

  const filtered = (() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? guests.filter(g =>
          g.full_name.toLowerCase().includes(q) ||
          (g.phone || '').replace(/-/g, '').includes(q.replace(/-/g, ''))
        )
      : guests
    return list.slice(0, 10)
  })()

  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function openDropdown() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function select(guest) {
    onChange(guest.id)
    setQuery('')
    setOpen(false)
  }

  function clear(e) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}

      {/* Trigger / selected display */}
      {!open ? (
        <button
          type="button"
          onClick={openDropdown}
          className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-left transition-colors ${
            selected
              ? 'border-indigo-300 bg-indigo-50/60 hover:bg-indigo-50'
              : 'border-gray-200 bg-white hover:border-indigo-300'
          }`}
        >
          {selected ? (
            <>
              <Avatar name={selected.full_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{selected.full_name}</p>
                {selected.phone && <p className="text-xs text-gray-500">{selected.phone}</p>}
              </div>
              <button
                type="button"
                onClick={clear}
                className="p-0.5 rounded-full hover:bg-indigo-200 text-indigo-400 hover:text-indigo-700 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <Search size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1 text-sm text-gray-400">ค้นหาผู้เช่า...</span>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </>
          )}
        </button>
      ) : (
        /* Search input */
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="พิมพ์ชื่อหรือเบอร์โทร..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-indigo-400 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-sm text-gray-400">ไม่พบผู้เช่า</p>
              {query && <p className="text-xs text-gray-300 mt-0.5">"{query}"</p>}
            </div>
          ) : (
            <>
              {query && (
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                    พบ {filtered.length} รายการ
                  </p>
                </div>
              )}
              <ul className="max-h-56 overflow-y-auto py-1 scrollbar-none">
                {filtered.map(g => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => select(g)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left ${
                        g.id === value ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <Avatar name={g.full_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          <Highlight text={g.full_name} query={query} />
                        </p>
                        {g.phone && (
                          <p className="text-xs text-gray-400">
                            <Highlight text={g.phone} query={query} />
                            {g.occupation ? ` · ${g.occupation}` : ''}
                          </p>
                        )}
                      </div>
                      {g.id === value && (
                        <span className="text-indigo-500 text-xs font-medium shrink-0">เลือกอยู่</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {!query && guests.length > 10 && (
                <p className="text-center text-xs text-gray-400 py-2 border-t border-gray-50">
                  พิมพ์เพื่อค้นหาจากทั้งหมด {guests.length} คน
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
