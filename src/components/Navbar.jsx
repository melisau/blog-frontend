// Navbar — global sticky top navigation bar shown on every page.
// Authenticated:  [Logo]  ···  [+]  [Avatar ▾]  (dropdown: profile / email / sign out)
// Guest:          [Logo]  ···  [Giriş Yap]  [Kayıt Ol]
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'

// Masks an e-mail: first 2 chars + bullets + @domain
function maskEmail(email) {
  if (!email) return null
  const at = email.indexOf('@')
  if (at < 0) return email
  const local  = email.slice(0, at)
  const domain = email.slice(at)
  const visible = local.slice(0, 2)
  const dots    = '•'.repeat(Math.max(6, local.length - 2))
  return `${visible}${dots}${domain}`
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const displayName = user?.username ?? user?.name ?? user?.full_name ?? null
  const maskedEmail = maskEmail(user?.email ?? null)

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

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
          {/* Create new post button (+ icon) */}
          <Link
            to="/new-blog"
            className="navbar__create-btn"
            aria-label="Yeni yazı oluştur"
            title="Yeni Yazı"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </Link>

          {/* Avatar → dropdown trigger */}
          {user?.id ? (
            <div className="navbar__dropdown-wrap" ref={wrapRef}>
              <button
                className="navbar__profile-btn"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={`${displayName ?? 'Kullanıcı'} menüsü`}
              >
                <Avatar
                  userId={user.id}
                  username={displayName ?? '?'}
                  size="sm"
                  iconId={user.icon_id ?? null}
                />
                <svg
                  className={`navbar__chevron${open ? ' navbar__chevron--up' : ''}`}
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {open && (
                <div className="navbar__dropdown" role="menu">
                  {/* User row */}
                  <div className="navbar__dd-user">
                    <Avatar
                      userId={user.id}
                      username={displayName ?? '?'}
                      size="sm"
                      iconId={user.icon_id ?? null}
                    />
                    <div className="navbar__dd-info">
                      <span className="navbar__dd-name">{displayName ?? 'Kullanıcı'}</span>
                      <Link
                        to={`/profile/${user.id}`}
                        className="navbar__dd-profile"
                        onClick={() => setOpen(false)}
                      >
                        View profile
                      </Link>
                    </div>
                  </div>

                  {/* Email */}
                  {maskedEmail && (
                    <div className="navbar__dd-email">{maskedEmail}</div>
                  )}

                  <div className="navbar__dd-divider" />

                  {/* Sign out */}
                  <button className="navbar__dd-signout" onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* id unknown — static avatar */
            <span className="navbar__profile-link navbar__profile-link--static">
              <Avatar
                userId={null}
                username={displayName ?? '?'}
                size="sm"
                iconId={user?.icon_id ?? null}
              />
            </span>
          )}
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
