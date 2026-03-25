import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProjectList from './pages/ProjectList.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import FormBuilder from './pages/FormBuilder.jsx'
import DataEntry from './pages/DataEntry.jsx'
import EntryList from './pages/EntryList.jsx'
import EntryDetail from './pages/EntryDetail.jsx'
import { getUsers } from './api/client.js'

const DEFAULT_USER = { user_id: 'admin-001', username: 'admin', role: 'admin' }

// Ensure localStorage is set before any component mounts
function initUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('edc_user'))
    if (stored && stored.user_id) return stored
  } catch {}
  localStorage.setItem('edc_user', JSON.stringify(DEFAULT_USER))
  return DEFAULT_USER
}

function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(initUser)

  // Persist user to localStorage so api/client.js can read it
  useEffect(() => {
    localStorage.setItem('edc_user', JSON.stringify(currentUser))
    // Reload user list after switch
    getUsers().then(setUsers).catch(() => {})
  }, [currentUser])

  // Initial user list load
  useEffect(() => {
    getUsers().then(setUsers).catch(() => {})
  }, [])

  const handleUserSwitch = (userId) => {
    const u = users.find(u => u.user_id === userId)
    if (u) setCurrentUser(u)
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar
          currentUser={currentUser}
          users={users}
          onUserSwitch={handleUserSwitch}
        />
        <div className="content">
          <Routes>
            <Route path="/" element={<ProjectList currentUser={currentUser} />} />
            <Route path="/projects/:projectId" element={<ProjectDetail currentUser={currentUser} />} />
            <Route path="/projects/:projectId/forms/:formId/builder" element={<FormBuilder currentUser={currentUser} />} />
            <Route path="/projects/:projectId/forms/:formId/entry" element={<DataEntry currentUser={currentUser} />} />
            <Route path="/projects/:projectId/forms/:formId/entries" element={<EntryList currentUser={currentUser} />} />
            <Route path="/entries/:entryId" element={<EntryDetail currentUser={currentUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
