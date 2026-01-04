import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import FinanceAssistant from './components/FinanceAssistant'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Transactions from './pages/Transactions'
import Income from './pages/Income'
import Budget from './pages/Budget'
import Notifications from './pages/Notifications'
import Analytics from './pages/Analytics'

function App() {
  const location = useLocation();
  
  // Hide navbar on dashboard and profile pages (they have sidebar)
  const hideNavbar = ['/dashboard', '/profile', '/transactions', '/income', '/budget', '/goals', '/analytics', '/bills', '/notifications', '/settings'].some(
    path => location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } />
        <Route path="/reset-password/:token" element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        } />
        <Route path="/income" element={
          <ProtectedRoute>
            <Income />
          </ProtectedRoute>
        } />
        <Route path="/budget" element={
          <ProtectedRoute>
            <Budget />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/goals" element={
          <ProtectedRoute>
            <ComingSoon title="Goals" />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/bills" element={
          <ProtectedRoute>
            <ComingSoon title="Bills" />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <ComingSoon title="Settings" />
          </ProtectedRoute>
        } />
      </Routes>
      {/* ElevenLabs Finance Assistant - Voice AI Widget */}
      <FinanceAssistant />
    </div>
  )
}

// Temporary Coming Soon component for placeholder pages
import DashboardLayout from './components/DashboardLayout'

function ComingSoon({ title }) {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">This feature is coming soon!</p>
      </div>
    </DashboardLayout>
  )
}

export default App
