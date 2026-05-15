import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PropertyProvider } from './context/PropertyContext'
import { FontSizeProvider } from './context/FontSizeContext'
import { ThemeProvider } from './context/ThemeContext'
import { queryClient } from './lib/queryClient'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import PropertyDetail from './pages/PropertyDetail'
import Contracts from './pages/Contracts'
import Bookings from './pages/Bookings'
import Guests from './pages/Guests'
import Finance from './pages/Finance'
import Housekeeping from './pages/Housekeeping'
import Maintenance from './pages/Maintenance'
import Settings from './pages/Settings'

function AuthGuard() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return (
    <PropertyProvider>
      <Outlet />
    </PropertyProvider>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/properties', element: <Properties /> },
          { path: '/rooms', element: <PropertyDetail /> },
          { path: '/contracts', element: <Contracts /> },
          { path: '/bookings', element: <Bookings /> },
          { path: '/guests', element: <Guests /> },
          { path: '/finance', element: <Finance /> },
          { path: '/housekeeping', element: <Housekeeping /> },
          { path: '/maintenance', element: <Maintenance /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <FontSizeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { fontSize: '0.875rem', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            }}
          />
        </AuthProvider>
      </FontSizeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
