import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Setup from './pages/Setup'
import Results from './pages/Results'
import Saved from './pages/Saved'
import Auth from './pages/Auth'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/results" element={<Results />} />
          <Route path="/saved" element={<Saved />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
