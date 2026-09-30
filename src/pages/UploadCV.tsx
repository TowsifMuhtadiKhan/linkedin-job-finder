import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2, FileText, Loader2, Upload, UserRound, Settings as SettingsIcon,
  BookmarkCheck, Sparkles, LogOut, ShieldCheck, Mail, Calendar, ArrowRight,
  RotateCcw, Trash2, LayoutGrid, List
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import UploadedCVs from '../components/UploadedCVs'
import TokenInput from '../components/TokenInput'
import useAppStore from '../store/useAppStore'
import { JOB_PORTALS } from '../lib/jobPortals'
import type { JobPortal } from '../lib/jobPortals'

type TabType = 'profile' | 'cv' | 'settings'

function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function UploadCV() {
  const { user, loading, signOut } = useAuth()
  const {
    savedJobs, criteria, updateCriteria, resetCriteria,
    clearJobs, viewMode, setViewMode
  } = useAppStore()

  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabType) || 'profile'
  const [activeTab, setActiveTabState] = useState<TabType>(
    ['profile', 'cv', 'settings'].includes(currentTab) ? currentTab : 'profile'
  )

  const handleTabChange = (tab: TabType) => {
    setActiveTabState(tab)
    setSearchParams({ tab })
  }

  // CV Upload State
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState('')
  const [revision, setRevision] = useState(0)
  const [cacheCleared, setCacheCleared] = useState(false)

  async function upload(event: React.FormEvent) {
    event.preventDefault()
    if (!file || !user || !supabase || pending) return
    setError('')
    setUploaded('')
    if (!/\.(pdf|doc|docx)$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError('Choose a PDF, DOC, or DOCX file between 1 byte and 5 MB.')
      return
    }
    setPending(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const { data, error: uploadError } = await supabase.functions.invoke('upload-cv', { body })
      if (uploadError) {
        let message = 'Upload failed. Please try again. If it continues, contact the portal administrator.'
        if (uploadError.context instanceof Response) {
          const response = await uploadError.context.json().catch(() => null)
          if (typeof response?.error === 'string') message = response.error
        }
        throw new Error(message)
      }
      if (!data?.id) throw new Error('Upload could not be confirmed. Please try again.')
      setUploaded(file.name)
      setRevision((value) => value + 1)
      setFile(null)
      if (input.current) input.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="max-w-3xl mx-auto space-y-6">
      {/* Page Title & Navigation Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account &amp; Workspace</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your profile details, CV documents, and search preferences.
            </p>
          </div>
          <Link
            to="/saved"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#F0F7FF] text-[#0A66C2] hover:bg-[#d0e8fa] transition-colors"
          >
            <BookmarkCheck size={14} />
            <span>My Jobs ({savedJobs.length})</span>
          </Link>
        </div>

        {/* 3 Tabs: Profile, CV, Settings */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-[#0A66C2] text-[#0A66C2]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserRound size={16} />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('cv')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'cv'
                ? 'border-[#0A66C2] text-[#0A66C2]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} />
            <span>CV</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-[#0A66C2] text-[#0A66C2]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: PROFILE ──────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {loading ? (
            <div className="card p-8 text-center text-gray-500">Loading your account…</div>
          ) : user ? (
            <>
              {/* User Identity Card */}
              <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#0A66C2] text-white text-2xl font-bold flex items-center justify-center shadow-sm">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
                          {user.email}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={12} />
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        Member since {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </div>

                {/* Account Details Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 text-xs sm:text-sm">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-gray-400 text-xs block mb-1">Email Address</span>
                    <span className="font-medium text-gray-800 flex items-center gap-1.5">
                      <Mail size={14} className="text-gray-400" />
                      {user.email}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-gray-400 text-xs block mb-1">Last Sign In</span>
                    <span className="font-medium text-gray-800">
                      {formatDate(user.last_sign_in_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity & Quick Shortcuts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* My Jobs card */}
                <div className="card p-5 bg-white border border-gray-200 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0A66C2] flex items-center justify-center mb-3">
                      <BookmarkCheck size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">My Jobs</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      You have <strong>{savedJobs.length}</strong> saved or bookmarked job{savedJobs.length !== 1 ? 's' : ''}.
                    </p>
                  </div>
                  <Link
                    to="/saved"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0A66C2] hover:underline"
                  >
                    View and manage My Jobs <ArrowRight size={13} />
                  </Link>
                </div>

                {/* CV Review card */}
                <div className="card p-5 bg-white border border-gray-200 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">CV Job Matcher</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Compare your CV against any job description to score alignment and gaps.
                    </p>
                  </div>
                  <Link
                    to="/cv-review"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline"
                  >
                    Check CV against a job <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            /* Guest State */
            <div className="card p-8 bg-white border border-gray-200 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0A66C2] flex items-center justify-center mx-auto">
                <UserRound size={32} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">You are browsing as a Guest</h2>
                <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mt-1">
                  Guest jobs are saved on this browser only. Sign in to view your account?s saved jobs, store CVs, and sync across devices.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/auth"
                  className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full"
                >
                  Sign In or Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: CV ──────────────── */}
      {activeTab === 'cv' && (
        <div className="space-y-6">
          {/* Quick link banner */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900">
            <span className="font-medium">Want to see how your CV matches a job opening?</span>
            <Link
              to="/cv-review"
              className="font-bold text-[#0A66C2] hover:underline flex items-center gap-1 shrink-0"
            >
              Match CV <ArrowRight size={13} />
            </Link>
          </div>

          {/* Upload Card */}
          <div className="card p-6 bg-white border border-gray-200 rounded-2xl">
            {loading ? (
              <p role="status" className="text-gray-500 text-sm">Loading your account…</p>
            ) : !user ? (
              <div className="text-center py-6">
                <FileText className="mx-auto text-[#0A66C2] mb-3" size={32} />
                <p className="text-gray-600 mb-4 text-sm">Sign in to upload and manage your CVs.</p>
                <Link
                  to="/auth"
                  className="inline-block rounded-full bg-[#0A66C2] text-white px-5 py-2 text-sm font-semibold"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={upload} className="space-y-5" aria-busy={pending}>
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center sm:text-left">
                  <Upload size={28} className="text-[#0A66C2] mb-3 mx-auto sm:mx-0" />
                  <label htmlFor="cv-file" className="block font-semibold text-sm text-gray-900 mb-1">
                    Choose your CV
                  </label>
                  <p id="cv-file-help" className="text-xs text-gray-500 mb-3">
                    PDF, DOC, or DOCX · Maximum 5 MB
                  </p>
                  <input
                    ref={input}
                    id="cv-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    required
                    disabled={pending}
                    aria-describedby="cv-file-help"
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#F0F7FF] file:px-4 file:py-2 file:text-[#0A66C2] file:font-semibold cursor-pointer"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null)
                      setError('')
                      setUploaded('')
                    }}
                  />
                  {file && (
                    <p className="text-xs text-gray-600 mt-3 break-all font-medium">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  Your CV will be stored securely with your account and can be reviewed against job descriptions.
                </p>

                <button
                  type="submit"
                  disabled={!file || pending}
                  className="w-full flex items-center justify-center gap-2 bg-[#0A66C2] text-white font-semibold text-sm rounded-full px-5 py-3 hover:bg-[#004182] disabled:opacity-50 transition-all"
                >
                  {pending ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                  {pending ? 'Uploading…' : 'Upload CV'}
                </button>

                {error && <p role="alert" className="text-xs text-red-600 font-medium">{error}</p>}

                {uploaded && (
                  <div
                    role="status"
                    className="flex gap-2 rounded-xl bg-green-50 border border-green-200 p-3 text-xs sm:text-sm text-green-700"
                  >
                    <CheckCircle2 size={18} className="shrink-0" />
                    <p className="break-all">{uploaded} was uploaded successfully!</p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* List of uploaded CVs */}
          {user && <UploadedCVs key={`${user.id}-${revision}`} revision={revision} />}
        </div>
      )}

      {/* ──────────────── TAB 3: SETTINGS ──────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Search Preferences */}
          <div className="card p-6 bg-white border border-gray-200 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-gray-900">Search &amp; Display Preferences</h2>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Preferred Platform */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <span className="font-semibold text-gray-800 block">Default Job Source</span>
                  <span className="text-gray-400 text-xs">Choose which platform to query first</span>
                </div>
                <select aria-label="Default job source" value={criteria.source || 'linkedin'}
                  onChange={(event) => updateCriteria('source', event.target.value as JobPortal)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  {JOB_PORTALS.map(portal => <option key={portal.value} value={portal.value}>{portal.label}</option>)}
                </select>
              </div>

              {/* Default View Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <span className="font-semibold text-gray-800 block">Results View Layout</span>
                  <span className="text-gray-400 text-xs">Display jobs as grid cards or compact list rows</span>
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      viewMode === 'card'
                        ? 'bg-white text-[#0A66C2] shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <LayoutGrid size={13} /> Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-[#0A66C2] shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <List size={13} /> List
                  </button>
                </div>
              </div>

              {/* Reset Search Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-gray-800 block">Reset Search Filters</span>
                  <span className="text-gray-400 text-xs">Restore search keywords and filters to default</span>
                </div>
                <button
                  type="button"
                  onClick={resetCriteria}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw size={12} /> Reset to Default
                </button>
              </div>
            </div>
          </div>

          {/* LinkedIn Developer Token */}
          <div>
            <TokenInput collapsible defaultOpen={false} />
          </div>

          {/* Data & Cache */}
          <div className="card p-6 bg-white border border-gray-200 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-gray-900">Cache &amp; Storage</h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-gray-800 block">Clear Search Results Cache</span>
                <span className="text-gray-400 text-xs">
                  Clears temporary cached search results from local session
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearJobs()
                  setCacheCleared(true)
                  setTimeout(() => setCacheCleared(false), 2500)
                }}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Trash2 size={12} className="text-gray-400" />
                {cacheCleared ? 'Cleared!' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
