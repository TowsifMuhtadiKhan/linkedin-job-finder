import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { user, error: authError } =
        mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password)

      if (authError) {
        setError(authError.message)
      } else if (mode === 'register') {
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      } else if (user) {
        navigate('/setup')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-sm mx-auto py-20 text-center">
        <p className="text-gray-500 text-sm">
          Supabase is not configured. Please add your{' '}
          <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your{' '}
          <code className="bg-gray-100 px-1 rounded">.env</code> file.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto py-12">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-[#0077B5] rounded-xl flex items-center justify-center mx-auto mb-4">
          <Briefcase size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">LinkedIn Job Finder</h1>
        <p className="text-gray-500 text-sm mt-1">
          Sign in to save favourites &amp; keep results permanently
        </p>
      </div>

      <div className="card p-6">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {[
            { key: 'login', label: 'Sign In' },
            { key: 'register', label: 'Register' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setError(''); setSuccess('') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === key
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className="input-field pl-9"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field pl-9 pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle size={15} />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading
              ? 'Please wait…'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <button
            onClick={() => navigate('/setup')}
            className="text-sm text-gray-500 hover:text-[#0077B5] transition-colors"
          >
            Continue without account →
            <span className="block text-xs text-gray-400 mt-0.5">
              Results expire after 10 minutes
            </span>
          </button>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-gray-600">
        {[
          ['⭐', 'Favourites synced across devices'],
          ['♾️', 'Search results never expire'],
          ['📋', 'Save search criteria presets'],
          ['🔒', 'Secure with Row Level Security'],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-start gap-2 bg-white rounded-lg border border-gray-100 p-3">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
