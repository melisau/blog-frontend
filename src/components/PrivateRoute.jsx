// PrivateRoute — guards routes that require authentication.
//
// Unauthenticated users are redirected to /login.  The current pathname is
// forwarded as `state.from` so that Login can navigate the user back to the
// page they originally tried to visit after a successful sign-in.
//
// The `replace` flag prevents /login from being pushed onto the history stack,
// so pressing the back button after login does not loop back to /login.
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // state.from lets Login.jsx redirect back here after a successful login.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
