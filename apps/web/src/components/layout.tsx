import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import { buttonClasses } from '../lib/class-names'

export default function Layout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              🎬 Movie Reservations
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Movies
              </Link>
              <Link to="/reservations" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                My Reservations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">{user?.name}</span>
            <button
              onClick={handleLogout}
              className={`${buttonClasses.secondary} text-sm`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
