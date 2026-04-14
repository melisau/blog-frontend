// AuthContext — provides authentication state and actions to the entire
// component tree.  Keeping token logic here prevents individual pages
// from reaching into localStorage directly.
import { createContext, useContext, useState } from 'react';
import { saveToken, getToken, removeToken } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialise from localStorage so the session survives a page refresh.
  const [token, setToken] = useState(() => getToken());

  // Persist the token and update React state in one call.
  function login(newToken) {
    saveToken(newToken);
    setToken(newToken);
  }

  // Wipe the token from both storage and React state.
  function logout() {
    removeToken();
    setToken(null);
  }

  // isAuthenticated is derived — no need to store it separately.
  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook that throws early when used outside the provider,
// making misconfigured component trees easier to debug.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
