import { useState } from 'react'
import { Eye, EyeOff, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { fetchLinkedInProfile } from '../hooks/useJobSearch'

export default function TokenInput() {
  const { linkedinToken, setLinkedinToken, clearLinkedinToken, setProfile, clearProfile, profile } =
    useAppStore()

  const [inputValue, setInputValue] = useState(linkedinToken)
  const [showToken, setShowToken] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const handleSave = async () => {
    const token = inputValue.trim()
    if (!token) return

    setVerifying(true)
    setVerifyError('')
    setLinkedinToken(token)

    // Try to fetch profile to verify the token
    const fetchedProfile = await fetchLinkedInProfile(token)
    setVerifying(false)

    if (fetchedProfile) {
      setProfile(fetchedProfile)
    } else {
      // Token is saved but profile couldn't be verified (may still work for job search)
      clearProfile()
      setVerifyError(
        'Could not verify token via LinkedIn API (CORS restriction in browser). Token is saved — the Supabase Edge Function will verify it server-side.'
      )
    }
  }

  const handleClear = () => {
    setInputValue('')
    clearLinkedinToken()
    clearProfile()
    setVerifyError('')
  }

  const masked = linkedinToken
    ? linkedinToken.slice(0, 6) + '••••••••••••' + linkedinToken.slice(-4)
    : ''

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Key size={18} className="text-linkedin-blue" />
        <h2 className="font-semibold text-gray-900">LinkedIn Access Token</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Get your token from the{' '}
        <a
          href="https://developer.linkedin.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-linkedin-blue hover:underline"
        >
          LinkedIn Developer Portal
        </a>
        . Required scopes:{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">openid profile email</code>
      </p>

      <div className="relative">
        <input
          type={showToken ? 'text' : 'password'}
          className="input-field pr-10"
          placeholder="Paste your LinkedIn access token here..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          type="button"
          onClick={() => setShowToken((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={!inputValue.trim() || verifying}
          className="btn-primary flex items-center gap-2"
        >
          {verifying ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Verifying…
            </>
          ) : (
            'Save Token'
          )}
        </button>

        {linkedinToken && (
          <button onClick={handleClear} className="btn-secondary text-sm">
            Clear
          </button>
        )}
      </div>

      {/* Status */}
      {linkedinToken && !verifying && (
        <div className="mt-3">
          {profile ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle size={15} />
              Verified as <strong>{profile.name}</strong>
              {profile.email && ` (${profile.email})`}
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <CheckCircle size={15} className="mt-0.5 shrink-0" />
              <span>
                Token saved: <code className="text-xs">{masked}</code>
                {verifyError && (
                  <span className="block mt-0.5 text-xs text-amber-600">{verifyError}</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
