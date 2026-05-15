import { createContext, useContext, useState, useEffect } from 'react'
import { propertiesService } from '../lib/database'
import { useAuth } from './AuthContext'

const PropertyContext = createContext(null)

export function PropertyProvider({ children }) {
  const { user } = useAuth()
  const [activePropertyId, setActivePropertyId] = useState(null)
  const [properties, setProperties]             = useState([])

  useEffect(() => {
    if (!user) {
      setProperties([])
      setActivePropertyId(null)
      return
    }
    propertiesService.getUserProperties(user.id).then(userProps => {
      setProperties(userProps)
      const stored = localStorage.getItem('active_property_id')
      const valid  = stored && userProps.find(p => p.id === stored)
      if (valid) {
        setActivePropertyId(stored)
      } else if (userProps.length > 0) {
        setActivePropertyId(userProps[0].id)
        localStorage.setItem('active_property_id', userProps[0].id)
      }
    })
  }, [user])

  function switchProperty(id) {
    setActivePropertyId(id)
    localStorage.setItem('active_property_id', id)
  }

  function refreshProperties() {
    if (!user) return
    propertiesService.getUserProperties(user.id).then(userProps => {
      setProperties(userProps)
      if (userProps.length > 0 && !userProps.find(p => p.id === activePropertyId)) {
        setActivePropertyId(userProps[0].id)
        localStorage.setItem('active_property_id', userProps[0].id)
      }
    })
  }

  const activeProperty = properties.find(p => p.id === activePropertyId) || null

  return (
    <PropertyContext.Provider value={{ activePropertyId, activeProperty, properties, switchProperty, refreshProperties }}>
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperty() {
  const ctx = useContext(PropertyContext)
  if (!ctx) throw new Error('useProperty must be inside PropertyProvider')
  return ctx
}
