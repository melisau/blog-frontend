// PrivateRoute — guards routes that require authentication.
// Unauthenticated users are redirected to /login; the `replace` flag
// prevents the login page from being pushed onto the history stack,
// so the back button does not loop the user back to a protected page.
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}
