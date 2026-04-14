// App — root routing configuration.
// Routes are split into three groups:
//   • Public     — anyone can visit
//   • Guest-only — redirect authenticated users away (login / register)
//   • Private    — redirect unauthenticated users to /login
import { Routes, Route, Navigate } from 'react-router-dom'

import PrivateRoute from './components/PrivateRoute'
import GuestRoute from './components/GuestRoute'

import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import NewPost from './pages/NewPost'
import EditPost from './pages/EditPost'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/posts/:id" element={<PostDetail />} />
      <Route path="/profile/:id" element={<Profile />} />

      {/* Guest-only routes: redirect to / when already logged in */}
      <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Private routes: redirect to /login when not authenticated */}
      <Route path="/new-post"       element={<PrivateRoute><NewPost /></PrivateRoute>} />
      <Route path="/edit-post/:id"  element={<PrivateRoute><EditPost /></PrivateRoute>} />

      {/* Catch-all: unknown paths fall back to the home page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
