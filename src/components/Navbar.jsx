// Navbar — global sticky top navigation bar shown on every page.
// Authenticated:  [Hamburger(mobile)]  [Logo]  ···  [+]  [Avatar ▾]
// Guest:          [Hamburger(mobile)]  [Logo]  ···  [Giriş Yap]  [Kayıt Ol]
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
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
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryLinks, setCategoryLinks] = useState([{ label: 'Tümü', value: null }])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const wrapRef = useRef(null)
  const notificationWrapRef = useRef(null)

  const displayName = user?.username ?? user?.name ?? user?.full_name ?? null
  const maskedEmail = maskEmail(user?.email ?? null)
  const activeCategory = new URLSearchParams(location.search).get('category')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('q') ?? '')
  }, [location.search])

  useEffect(() => {
    const controller = new AbortController()
    axiosInstance
      .get('/categories', { signal: controller.signal })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.categories ?? [])
        const mapped = [...new Set(list
          .map((c) => (typeof c === 'string' ? c : (c.name ?? c.title ?? null)))
          .filter(Boolean)
        )].map((name) => ({ label: name, value: name }))
        setCategoryLinks([{ label: 'Tümü', value: null }, ...mapped])
      }).catch((err) => {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
        setCategoryLinks([{ label: 'Tümü', value: null }])
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }
    const controller = new AbortController()
    axiosInstance
      .get('/notifications/unread-count', { signal: controller.signal })
      .then(({ data }) => {
        setUnreadCount(Number(data?.unread_count ?? 0))
      }).catch((err) => {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
        setUnreadCount(0)
      })
    return () => controller.abort()
  }, [isAuthenticated])

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/')
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  }

  function formatNotificationDate(value) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function notificationTypeLabel(type) {
    return type === 'follow' ? 'Takip' : 'Yorum'
  }

  function getNotificationTarget(item) {
    if (!item) return null
    const type = String(item.type ?? '').toLowerCase()
    const isCommentType = type.includes('comment')
    const isFollowType = type.includes('follow')
    const isNavigableType = isCommentType || isFollowType

    function parseTargetPath(value) {
      if (typeof value !== 'string' || !value.trim()) return null
      let path = value.trim()
      if (path.startsWith('http://') || path.startsWith('https://')) {
        try {
          path = new URL(path).pathname
        } catch {
          return null
        }
      }
      const blogMatch = path.match(/\/blogs\/([^/?#]+)/)
      if (blogMatch) return `/blogs/${blogMatch[1]}`
      const profileMatch = path.match(/\/profile\/([^/?#]+)/)
      if (profileMatch) return `/profile/${profileMatch[1]}`
      const usersMatch = path.match(/\/users\/([^/?#]+)/)
      if (usersMatch) return `/profile/${usersMatch[1]}`
      return null
    }

    function pickId(...values) {
      for (const value of values) {
        if (value == null) continue
        const str = String(value).trim()
        if (str) return str
      }
      return null
    }

    function extractIdFromText(value) {
      if (typeof value !== 'string') return null
      // ObjectId, uuid-like or numeric tail support
      const objectId = value.match(/\b[a-f0-9]{24}\b/i)
      if (objectId) return objectId[0]
      const uuid = value.match(/\b[a-f0-9]{8}-[a-f0-9-]{27}\b/i)
      if (uuid) return uuid[0]
      const numeric = value.match(/(?:^|\/)(\d+)(?:$|[^\d])/)
      if (numeric) return numeric[1]
      return null
    }

    const routeTarget =
      parseTargetPath(item.target_url) ??
      parseTargetPath(item.url) ??
      parseTargetPath(item.link) ??
      parseTargetPath(item.href) ??
      parseTargetPath(item.path) ??
      parseTargetPath(item.redirect_to) ??
      parseTargetPath(item?.data?.target_url) ??
      parseTargetPath(item?.data?.url)
    if (routeTarget) return routeTarget

    if (isCommentType) {
      const blogId = pickId(
        item.blog_id,
        item.post_id,
        item.blogId,
        item.postId,
        item.entity_id,
        item.target_id,
        item.reference_id,
        item.related_id,
        item.blog?.id,
        item.post?.id,
        item?.data?.blog_id,
        item?.data?.post_id,
        item?.data?.blogId,
        item?.data?.postId,
        item?.data?.entity_id,
        extractIdFromText(item.message),
      )
      if (blogId != null) return `/blogs/${blogId}`
    }

    if (isFollowType) {
      const profileId = pickId(
        item.actor?.id,
        item.actor?._id,
        item?.data?.actor?.id,
        item?.data?.actor?._id,
        item.actor_id,
        item.user_id,
        item.from_user_id,
        item.source_user_id,
        item.sender_id,
        item.follower_id,
        item.entity_id,
        item.fromUserId,
        item.related_user_id,
        item.target_id,
        item.reference_id,
        item.follower?.id,
        item.from_user?.id,
        item?.data?.actor_id,
        item?.data?.user_id,
        item?.data?.follower_id,
        item?.data?.from_user_id,
        item?.data?.related_user_id,
        item.userId,
        extractIdFromText(item.message),
      )
      if (profileId != null) return `/profile/${profileId}`
    }

    return isNavigableType ? '#' : null
  }

  function getNotificationActorName(item) {
    return item?.actor?.username ?? item?.username ?? item?.from_username ?? item?.sender_username ?? null
  }

  function formatNotificationMessage(item) {
    const actorName = getNotificationActorName(item)
    const type = String(item?.type ?? '').toLowerCase()
    if (actorName && type.includes('comment')) return `${actorName} yazınıza yorum ekledi`
    if (actorName && type.includes('follow')) return `${actorName} sizi takip etmeye başladı`
    return item?.message ?? ''
  }

  function NotificationTypeIcon({ type }) {
    if (type === 'follow') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <path d="M20 8v6M23 11h-6"/>
        </svg>
      )
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )
  }

  async function handleNotificationClick() {
    if (!isAuthenticated) return
    const nextOpen = !notificationOpen
    setNotificationOpen(nextOpen)
    if (!nextOpen) return
    setOpen(false)
    setNotificationsLoading(true)
    try {
      const { data } = await axiosInstance.get('/notifications')
      const items = Array.isArray(data?.items) ? data.items : []
      setNotifications(items)
      await axiosInstance.post('/notifications/mark-read')
      setUnreadCount(0)
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    } catch {
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }

  function handleNotificationNavigate(item) {
    const target = getNotificationTarget(item)
    if (!target || target === '#') return
    setNotificationOpen(false)
    navigate(target)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open && !notificationOpen) return
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
      if (notificationWrapRef.current && !notificationWrapRef.current.contains(e.target)) {
        setNotificationOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, notificationOpen])

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

      <div className="navbar__center">
        <form className="navbar__search" onSubmit={handleSearchSubmit} role="search" aria-label="Yazılarda ara">
          <input
            type="search"
            className="navbar__search-input"
            placeholder="Yazılarda ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <nav className="navbar__categories" aria-label="Kategoriler">
          {categoryLinks.map((item) => {
            const isActive = (item.value === null && !activeCategory) || item.value === activeCategory
            const href = item.value ? `/?category=${encodeURIComponent(item.value)}` : '/'
            return (
              <Link
                key={item.label}
                to={href}
                className={`navbar__category-link${isActive ? ' navbar__category-link--active' : ''}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ── Right side ────────────────────────────────────────── */}
      {isAuthenticated ? (
        <div className="navbar__right">
          <div className="navbar__notification-wrap" ref={notificationWrapRef}>
            <button
              type="button"
              className="navbar__notification-btn"
              aria-label="Bildirimler"
              title="Bildirimler"
              onClick={handleNotificationClick}
              aria-expanded={notificationOpen}
              aria-haspopup="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="navbar__notification-dot" aria-hidden="true" />
              )}
            </button>
            {notificationOpen && (
              <div className="navbar__notification-panel" role="dialog" aria-label="Bildirimler">
                <div className="navbar__notification-title">Bildirimler</div>
                {notificationsLoading ? (
                  <p className="navbar__notification-empty">Yükleniyor…</p>
                ) : notifications.length === 0 ? (
                  <p className="navbar__notification-empty">Yeni bildiriminiz yok.</p>
                ) : (
                  <div className="navbar__notification-list">
                    {notifications.map((item, i) => {
                      const target = getNotificationTarget(item)
                      const itemType = String(item?.type ?? '').toLowerCase()
                      const isInteractive = itemType.includes('comment') || itemType.includes('follow')
                      return (
                      <div
                        key={item.id ?? `${item.type}-${i}`}
                        className={`navbar__notification-item${item.read ? ' navbar__notification-item--read' : ''}${isInteractive ? ' navbar__notification-item--clickable' : ''}`}
                        role={isInteractive ? 'button' : undefined}
                        tabIndex={isInteractive ? 0 : undefined}
                        onClick={() => handleNotificationNavigate(item)}
                        onKeyDown={(e) => {
                          if (!isInteractive) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleNotificationNavigate(item)
                          }
                        }}
                      >
                        <div className={`navbar__notification-icon navbar__notification-icon--${item.type}`}>
                          <NotificationTypeIcon type={item.type} />
                        </div>
                        <div className="navbar__notification-content">
                          <div className="navbar__notification-head">
                            <span className="navbar__notification-kind">{notificationTypeLabel(item.type)}</span>
                          </div>
                          <p className="navbar__notification-message">{formatNotificationMessage(item)}</p>
                          <span className="navbar__notification-time">{formatNotificationDate(item.created_at)}</span>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}
          </div>
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
                    </div>
                  </div>

                  <div className="navbar__dd-body">
                    <Link
                      to={`/profile/${user.id}`}
                      className="navbar__dd-profile"
                      onClick={() => setOpen(false)}
                    >
                      Profili Görüntüle
                    </Link>

                  {/* Email */}
                    {maskedEmail && (
                      <div className="navbar__dd-email">{maskedEmail}</div>
                    )}

                    <div className="navbar__dd-theme">
                      <span className="navbar__dd-theme-label">Tema</span>
                      <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
                    </div>
                  </div>

                  <div className="navbar__dd-divider" />

                  {/* Sign out */}
                  <button className="navbar__dd-signout" onClick={handleLogout}>
                    Çıkış Yap
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
          {/* Theme toggle — inside navbar__auth for guests */}
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      )}
    </header>
  )
}
