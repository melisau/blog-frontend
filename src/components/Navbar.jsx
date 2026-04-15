// Navbar — global sticky top navigation bar shown on every page.
// Authenticated:  [Logo]  ···  [Avatar  Kullanıcı adı → /profile/:id]  [Çıkış]
// Guest:          [Logo]  ···  [Giriş Yap]  [Kayıt Ol]
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  // Resolve display name from whichever field the backend returned.
  const displayName =
    user?.username ?? user?.name ?? user?.full_name ?? null

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      {/* ── Logo ──────────────────────────────────────────────── */}
      <Link to="/" className="navbar__logo">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Blog
      </Link>

      {/* ── Right side ────────────────────────────────────────── */}
      {isAuthenticated ? (
        <div className="navbar__right">
          {/* Avatar + name → profile */}
          {user?.id ? (
            <Link
              to={`/profile/${user.id}`}
              className="navbar__profile-link"
              aria-label={`${displayName ?? 'Kullanıcı'} profili`}
            >
              <Avatar
                userId={user.id}
                username={displayName ?? '?'}
                size="sm"
                iconId={user.icon_id ?? null}
              />
              <span className="navbar__username">
                {displayName ?? 'Kullanıcı'}
              </span>
            </Link>
          ) : (
            /* id unknown (token-only login) — show avatar without link */
            <span className="navbar__profile-link navbar__profile-link--static">
              <Avatar
                userId={null}
                username={displayName ?? '?'}
                size="sm"
                iconId={user?.icon_id ?? null}
              />
              <span className="navbar__username">
                {displayName ?? 'Kullanıcı'}
              </span>
            </span>
          )}

          {/* Logout */}
          <button
            className="navbar__logout-btn"
            onClick={handleLogout}
            aria-label="Çıkış yap"
            title="Çıkış Yap"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="navbar__logout-label">Çıkış</span>
          </button>
        </div>
      ) : (
        <div className="navbar__auth">
          <Link to="/login"    className="btn btn--ghost btn--sm">Giriş Yap</Link>
          <Link to="/register" className="btn btn--primary btn--sm">Kayıt Ol</Link>
        </div>
      )}
    </header>
  )
}
