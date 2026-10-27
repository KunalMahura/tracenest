import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage   from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import Layout         from './components/Layout'
import OverviewPage   from './pages/OverviewPage'
import LogExplorerPage from './pages/LogExplorerPage'
import LiveFeedPage   from './pages/LiveFeedPage'
import AlertsPage     from './pages/AlertsPage'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-500">Loading…</div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-500">Loading…</div>
  if (!user)   return <LandingPage />
  return <Navigate to="/overview" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page & Auth */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated App Routes */}
          <Route element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/logs"     element={<LogExplorerPage />} />
            <Route path="/live"     element={<LiveFeedPage />} />
            <Route path="/alerts"   element={<AlertsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

