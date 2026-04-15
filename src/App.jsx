// App — root routing configuration.
// Routes are split into three groups:
//   • Public     — anyone can visit
//   • Guest-only — redirect authenticated users away (login / register)
//   • Private    — redirect unauthenticated users to /login
// ToastContainer is mounted here so it persists across all route transitions.
import { Routes, Route, Navigate } from 'react-router-dom'

import PrivateRoute from './components/PrivateRoute'
import GuestRoute from './components/GuestRoute'
import ToastContainer from './components/ToastContainer'

import Home from './pages/Home'
import BlogDetail from './pages/BlogDetail'
import NewBlog from './pages/NewBlog'
import EditBlog from './pages/EditBlog'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  // Fragment wraps two sibling roots: the route tree and the toast stack.
  // JSX requires a single root element, but <ToastContainer> must live outside
  // <Routes> so it is never unmounted during page transitions.
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/blogs/:id" element={<BlogDetail />} />
        <Route path="/profile/:id" element={<Profile />} />

        {/* Guest-only routes: redirect to / when already logged in */}
        <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Private routes: redirect to /login when not authenticated */}
        <Route path="/new-blog"       element={<PrivateRoute><NewBlog /></PrivateRoute>} />
        <Route path="/edit-blog/:id"  element={<PrivateRoute><EditBlog /></PrivateRoute>} />

        {/* Catch-all: unknown paths fall back to the home page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast stack — outside <Routes> so it survives page transitions */}
      <ToastContainer />
    </>
  )
}
