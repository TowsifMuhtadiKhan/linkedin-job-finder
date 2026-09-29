import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Briefcase, BookmarkCheck, LogIn, LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { pathname } = useLocation()
  const { savedJobs } = useAppStore()
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isJobsActive =
    pathname === '/' || pathname === '/results' || pathname === '/setup' || pathname === '/jobs'

  const navLink = (to: string, label: string, Icon: LucideIcon, active: boolean) => (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-[#F0F7FF] text-[#0A66C2]'
          : 'text-gray-600 hover:text-[#0A66C2] hover:bg-gray-100'
      }`}
    >
      <Icon size={15} />
      <span>{label}</span>
    </Link>
  )

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo.png"
            alt="Job Finder"
            width={44}
            height={44}
            className="w-10 h-10 object-contain shrink-0"
          />
          <div className="hidden sm:block">
            <span className="font-bold text-gray-900 text-sm">
              Job <span className="text-[#0A66C2]">Finder</span>
            </span>
            <span className="block text-[10px] text-gray-400 font-medium leading-none">
              LinkedIn &amp; Bdjobs
            </span>
          </div>
        </Link>

        {/* Center Nav links: Jobs and My Jobs */}
        <div className="flex items-center gap-1 sm:gap-2">
          {navLink('/', 'Jobs', Briefcase, isJobsActive)}

          {/* My Jobs with badge */}
          <Link
            to="/saved"
            aria-label="My Jobs"
            title="My Jobs"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
              pathname === '/saved'
                ? 'bg-[#F0F7FF] text-[#0A66C2]'
                : 'text-gray-600 hover:text-[#0A66C2] hover:bg-gray-100'
            }`}
          >
            <BookmarkCheck size={15} />
            <span>My Jobs</span>
            {savedJobs.length > 0 && (
              <span className="bg-[#0A66C2] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none">
                {savedJobs.length > 9 ? '9+' : savedJobs.length}
              </span>
            )}
          </Link>
        </div>

        {/* User Area: Profile & Account */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#0A66C2] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs text-gray-700 font-medium hidden md:block max-w-[120px] truncate">
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
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-[11px] text-gray-400">Signed in as</p>
                      <p className="text-xs font-semibold text-gray-900 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      <UserRound size={14} className="text-[#0A66C2]" />
                      Profile &amp; Settings
                    </Link>

                    <Link
                      to="/saved"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      <BookmarkCheck size={14} className="text-[#0A66C2]" />
                      My Jobs ({savedJobs.length})
                    </Link>

                    <div className="border-t border-gray-100 my-0.5" />

                    <button
                      onClick={async () => {
                        await signOut()
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium cursor-pointer"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/profile"
                title="Profile & Settings"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  pathname === '/profile'
                    ? 'bg-[#F0F7FF] text-[#0A66C2]'
                    : 'text-gray-600 hover:text-[#0A66C2] hover:bg-gray-100'
                }`}
              >
                <UserRound size={15} />
                <span className="hidden sm:inline">Profile</span>
              </Link>

              <Link
                to="/auth"
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors shadow-xs"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
