// Zustand auth store — single source of truth for authentication state.
//
// Why Zustand instead of Context?
//   • No Provider wrapper required; any component can subscribe directly.
//   • Only components that read a changing slice re-render, avoiding the
//     unnecessary re-renders that a top-level Context value update causes.
//   • The built-in `persist` middleware handles localStorage sync so
//     the session survives page refreshes without manual effect hooks.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  // `persist` serialises the selected slices to localStorage automatically.
  // Only `user` and `token` are persisted; actions are re-created on every
  // page load so they are excluded via the `partialize` option.
  persist(
    (set) => ({
      // ── State ────────────────────────────────────────────────────────────
      user: null,   // full user object returned by the API after login
      token: null,  // raw JWT string

      // ── Derived helper ───────────────────────────────────────────────────
      // Computed as a function so it always reflects the current token value
      // without storing a redundant boolean in the store.
      isAuthenticated: () => !!useAuthStore.getState().token,

      // ── Actions ──────────────────────────────────────────────────────────

      // login — called after a successful /auth/login or /auth/register response.
      // Guards against undefined/null tokens so a bad API response never
      // silently sets an empty session.
      login: ({ user, token }) => {
        if (!token) {
          console.warn('[authStore] login() called without a token — ignored.');
          return;
        }
        set({ user: user ?? null, token });
      },

      // updateUser — merges partial user fields into the stored user object.
      // Used after profile edits (e.g. icon_id change) so the navbar reflects
      // the change without requiring a full re-login.
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : partial,
        })),

      // logout — clears all auth state.  The persist middleware automatically
      // removes the persisted keys from localStorage when the values become null.
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth',                            // localStorage key
      partialize: (state) => ({                // only persist data, not functions
        user: state.user,
        token: state.token,
      }),
    }
  )
);

export default useAuthStore;
