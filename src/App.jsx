// App — root routing configuration.
// Routes are split into three groups:
//   • Public     — anyone can visit
//   • Guest-only — redirect authenticated users away (login / register)
//   • Private    — redirect unauthenticated users to /login
// ToastContainer is mounted here so it persists across all route transitions.
import { Routes, Route, Navigate } from 'react-router-dom'

import { SidebarProvider } from './context/SidebarContext'
import PrivateRoute from './components/PrivateRoute'
import GuestRoute from './components/GuestRoute'
import ToastContainer from './components/ToastContainer'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

import Home from './pages/Home'
import BlogDetail from './pages/BlogDetail'
import NewBlog from './pages/NewBlog'
import EditBlog from './pages/EditBlog'
import Profile from './pages/Profile'
import ProfileConnections from './pages/ProfileConnections'
import Library from './pages/Library'
import Following from './pages/Following'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <SidebarProvider>
      <Navbar />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/blogs/:id" element={<BlogDetail />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/profile/:id/following" element={<ProfileConnections />} />
            <Route path="/profile/:id/followers" element={<ProfileConnections />} />

            {/* Guest-only routes: redirect to / when already logged in */}
            <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

            {/* Private routes: redirect to /login when not authenticated */}
            <Route path="/library"         element={<PrivateRoute><Library /></PrivateRoute>} />
            <Route path="/following"       element={<PrivateRoute><Following /></PrivateRoute>} />
            <Route path="/new-blog"       element={<PrivateRoute><NewBlog /></PrivateRoute>} />
            <Route path="/edit-blog/:id"  element={<PrivateRoute><EditBlog /></PrivateRoute>} />

            {/* Catch-all: unknown paths fall back to the home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Toast stack — outside <Routes> so it survives page transitions */}
      <ToastContainer />
    </SidebarProvider>
  )
}
