import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext({ isOpen: false, toggle: () => {}, close: () => {} })

export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <SidebarContext.Provider value={{ isOpen, toggle: () => setIsOpen(v => !v), close: () => setIsOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  )
}
