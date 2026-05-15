import { createContext, useContext, useState, useEffect } from 'react'

const SIZES = [
  { key: 'sm', label: 'A', px: 13 },
  { key: 'md', label: 'A', px: 15 },
  { key: 'lg', label: 'A', px: 17 },
  { key: 'xl', label: 'A', px: 19 },
]
const DEFAULT = 'md'

const FontSizeContext = createContext(null)

export function FontSizeProvider({ children }) {
  const [sizeKey, setSizeKey] = useState(() => localStorage.getItem('font_size') || DEFAULT)

  useEffect(() => {
    const size = SIZES.find(s => s.key === sizeKey) || SIZES[1]
    document.documentElement.style.fontSize = `${size.px}px`
    localStorage.setItem('font_size', sizeKey)
  }, [sizeKey])

  const currentIndex = SIZES.findIndex(s => s.key === sizeKey)

  function decrease() {
    if (currentIndex > 0) setSizeKey(SIZES[currentIndex - 1].key)
  }
  function increase() {
    if (currentIndex < SIZES.length - 1) setSizeKey(SIZES[currentIndex + 1].key)
  }
  function reset() { setSizeKey(DEFAULT) }

  return (
    <FontSizeContext.Provider value={{ sizeKey, decrease, increase, reset, canDecrease: currentIndex > 0, canIncrease: currentIndex < SIZES.length - 1 }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext)
  if (!ctx) throw new Error('useFontSize must be inside FontSizeProvider')
  return ctx
}
