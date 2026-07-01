import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth-store'
import Layout from './components/layout'
import LoginPage from './pages/login-page'
import RegisterPage from './pages/register-page'
import MoviesPage from './pages/movies-page'
import ReservationsPage from './pages/reservations-page'
import ReservationDetailPage from './pages/reservation-detail-page'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<MoviesPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route
            path="/reservations/:id"
            element={<ReservationDetailPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
