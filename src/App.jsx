import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider }    from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider }     from './context/AuthContext'
import { LibraryProvider, useLibrary } from './context/LibraryContext'
import ProtectedRoute  from './components/ProtectedRoute'
import Header          from './components/Header'
import AddVideoModal   from './components/AddVideoModal'
import LoginPage       from './pages/LoginPage'
import HomePage        from './pages/HomePage'

/**
 * Inner shell rendered inside LibraryProvider so it can read useLibrary().
 * Renders Header + page content + AddVideoModal (when open).
 */
function AppShell() {
  const { showAddModal, closeAddModal } = useLibrary()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <HomePage />
      {showAddModal && <AddVideoModal onClose={closeAddModal} />}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <LibraryProvider>
                      <AppShell />
                    </LibraryProvider>
                  </ProtectedRoute>
                }
              />
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
