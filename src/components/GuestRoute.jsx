// GuestRoute — guards routes that should only be visible to unauthenticated
// users (login, register).  Sending a logged-in user back to / avoids the
// confusing situation where someone with a valid session sees the login form.
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : children
}
