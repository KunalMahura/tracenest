import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage   from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import ProjectsPage   from './pages/ProjectsPage'
import DocsPage, { PublicDocsShell } from './pages/DocsPage'
import Layout         from './components/Layout'
import OverviewPage   from './pages/OverviewPage'
import LogExplorerPage from './pages/LogExplorerPage'
import LiveFeedPage   from './pages/LiveFeedPage'
import AlertsPage     from './pages/AlertsPage'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-cream-200 text-ink-500">Loading…</div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

// Signed-in visitors see an authenticated page instead of login/register
function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-cream-200 text-ink-500">Loading…</div>
  if (user)    return <Navigate to="/overview" replace />
  return children
}

// /docs is public; signed-in users get it inside the app shell with their keys pre-filled
function DocsRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-cream-200 text-ink-500">Loading…</div>
  return user
    ? <Layout><DocsPage /></Layout>
    : <PublicDocsShell><DocsPage /></PublicDocsShell>
}

function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-cream-200 text-ink-500">Loading…</div>
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
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/docs" element={<DocsRoute />} />

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
            <Route path="/projects" element={<ProjectsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

