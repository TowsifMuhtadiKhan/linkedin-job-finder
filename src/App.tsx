import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Results from './pages/Results'
import Saved from './pages/Saved'
import Auth from './pages/Auth'
import UploadCV from './pages/UploadCV'
import CVReview from './pages/CVReview'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-6">
        <Routes>
          <Route path="/" element={<Results />} />
          <Route path="/jobs" element={<Navigate to="/" replace />} />
          <Route path="/setup" element={<Navigate to="/" replace />} />
          <Route path="/results" element={<Navigate to="/" replace />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<UploadCV />} />
          <Route path="/upload-cv" element={<Navigate to="/profile" replace />} />
          <Route path="/cv-review" element={<CVReview />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
