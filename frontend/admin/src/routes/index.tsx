import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Dashboard from '@/pages/Dashboard'
import CompanyList from '@/pages/Companies'
import OrderList from '@/pages/Orders'
import ShipmentList from '@/pages/Shipments'
import FinanceList from '@/pages/Finance'
import Settings from '@/pages/Settings'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/companies" element={<PrivateRoute><CompanyList /></PrivateRoute>} />
      <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
      <Route path="/shipments" element={<PrivateRoute><ShipmentList /></PrivateRoute>} />
      <Route path="/finance" element={<PrivateRoute><FinanceList /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  )
}
