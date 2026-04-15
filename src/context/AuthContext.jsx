// AuthContext — backward-compatibility shim.
//
// The real auth state now lives in src/store/authStore.js (Zustand).
// This file re-exports a `useAuth` hook with the same API that all pages
// already use, so no page-level code had to change during the migration.
//
// AuthProvider is kept as a no-op passthrough component so that main.jsx
// continues to render without errors while the wrapper is removed lazily.
import useAuthStore from '../store/authStore';

// useAuth — drop-in replacement for the old Context-based hook.
// Returns { user, token, isAuthenticated, login, logout } exactly as before,
// except `isAuthenticated` is now a boolean derived from the Zustand store.
export function useAuth() {
  const user            = useAuthStore((s) => s.user);
  const token           = useAuthStore((s) => s.token);
  const login           = useAuthStore((s) => s.login);
  const logout          = useAuthStore((s) => s.logout);
  const isAuthenticated = !!token;

  return { user, token, isAuthenticated, login, logout };
}

// AuthProvider — no longer needed because Zustand requires no React Provider.
// Kept here so main.jsx does not break; it can be safely removed at any time.
export function AuthProvider({ children }) {
  return children;
}
