// Navbar — global sticky top navigation bar shown on every page.
// Authenticated:  [Hamburger(mobile)]  [Logo]  ···  [+]  [Avatar ▾]
// Guest:          [Hamburger(mobile)]  [Logo]  ···  [Giriş Yap]  [Kayıt Ol]
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { useTheme } from '../context/ThemeContext'
import Avatar from './Avatar'

function ThemeToggleBtn({ theme, toggleTheme }) {
  return (
    <button
      className="navbar__theme-btn"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1"  x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1"  y1="12" x2="3"  y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

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
  const { toggle: toggleSidebar } = useSidebar()
  const { theme, toggle: toggleTheme } = useTheme()
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
      {/* ── Hamburger (mobile only) ────────────────────────────── */}
      <button
        className="navbar__hamburger"
        onClick={toggleSidebar}
        aria-label="Menüyü aç / kapat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

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
        Fitbook
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

          {/* Theme toggle — inside navbar__right for auth users */}
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      ) : (
        <div className="navbar__auth">
          <Link to="/login"    className="btn btn--ghost btn--sm">Giriş Yap</Link>
          <Link to="/register" className="btn btn--primary btn--sm">Kayıt Ol</Link>
          {/* Theme toggle — inside navbar__auth for guests */}
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      )}
    </header>
  )
}
