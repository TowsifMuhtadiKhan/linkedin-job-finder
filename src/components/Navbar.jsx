import { Link, useLocation } from 'react-router-dom'
import { Briefcase, BookmarkCheck, Settings, LogIn, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { pathname } = useLocation()
  const { savedJobs } = useAppStore()
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isActive = (to) => pathname === to

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        isActive(to)
          ? 'bg-[#E8F4FD] text-[#0077B5]'
          : 'text-gray-600 hover:text-[#0077B5] hover:bg-gray-100'
      }`}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/setup" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-[#0077B5] rounded flex items-center justify-center">
            <Briefcase size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block">
            LinkedIn <span className="text-[#0077B5]">Job Finder</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLink('/setup', 'Setup', Settings)}
          {navLink('/results', 'Jobs', Briefcase)}

          {/* Saved with badge */}
          <Link
            to="/saved"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
              isActive('/saved')
                ? 'bg-[#E8F4FD] text-[#0077B5]'
                : 'text-gray-600 hover:text-[#0077B5] hover:bg-gray-100'
            }`}
          >
            <BookmarkCheck size={15} />
            <span className="hidden sm:inline">Saved</span>
            {savedJobs.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#0077B5] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {savedJobs.length > 9 ? '9+' : savedJobs.length}
              </span>
            )}
          </Link>
        </div>

        {/* User area */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#0077B5] text-white text-xs font-bold flex items-center justify-center">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-gray-700 font-medium hidden md:block max-w-[120px] truncate">
                  {user.email}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={async () => { await signOut(); setShowUserMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#0077B5] text-white hover:bg-[#004182] transition-colors"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
