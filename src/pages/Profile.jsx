// Profile page — displays public information for a user identified by :id,
// along with that user's published blogs.
//
// API calls:
//   GET /users/:id          → user info card
//   GET /users/:id/blogs    → that user's blog list
//                             (fallback: GET /blogs?author_id=:id)
//
// Both endpoints can return different field-name conventions depending on the
// backend framework.  normalizeUser() and normalizeBlogs() absorb those
// differences so the rest of the component always works with a fixed shape.
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'

// ── Data normalisers ──────────────────────────────────────────────────────────

// Converts a raw API user object into the shape the UI expects.
// Handles both camelCase and snake_case field names.
function normalizeUser(raw) {
  const joinRaw = raw.created_at ?? raw.createdAt ?? raw.joined_at ?? null
  let joinDate = ''
  if (joinRaw) {
    joinDate = new Date(joinRaw).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    })
  }
  return {
    id:           raw.id,
    username:     raw.username ?? raw.name ?? raw.full_name ?? `Kullanıcı #${raw.id}`,
    bio:          raw.bio ?? raw.description ?? '',
    joinDate,
    blogCount:    raw.post_count  ?? raw.postCount  ?? raw.blog_count ?? raw.blogCount ?? 0,
    commentCount: raw.comment_count ?? raw.commentCount ?? 0,
  }
}

// Converts a raw API blog (or list) into a uniform array.
// Handles both a plain array and paginated { items, results, blogs, data } shapes.
function normalizeBlogs(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw?.items ?? raw?.results ?? raw?.blogs ?? raw?.posts ?? raw?.data ?? [])

  return list.map((b) => {
    const dateRaw = b.created_at ?? b.createdAt ?? b.date ?? null
    const date = dateRaw
      ? new Date(dateRaw).toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : ''
    return {
      id:      b.id,
      title:   b.title ?? '(Başlıksız)',
      excerpt: b.excerpt ?? b.summary ?? (b.content?.slice(0, 120) + '…') ?? '',
      date,
      tag:     b.category ?? b.tag ?? (b.tags?.[0]) ?? 'Genel',
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Profile() {
  const { id } = useParams()
  const { user: currentUser, isAuthenticated } = useAuth()

  // A user is viewing their own profile if their stored id matches the URL id.
  // currentUser may be null when the backend only returns a token on login —
  // in that case we conservatively treat the profile as someone else's.
  const isOwnProfile =
    isAuthenticated && currentUser?.id != null && String(currentUser.id) === String(id)

  // ── User state ────────────────────────────────────────────────────────────
  const [profileUser, setProfileUser]     = useState(null)
  const [userLoading, setUserLoading]     = useState(true)
  const [userError,   setUserError]       = useState('')

  // ── Blogs state ───────────────────────────────────────────────────────────
  const [blogs,        setBlogs]          = useState([])
  const [blogsLoading, setBlogsLoading]   = useState(true)
  const [blogsError,   setBlogsError]     = useState('')

  // Fetch user info whenever the id segment changes.
  useEffect(() => {
    let cancelled = false
    setUserLoading(true)
    setUserError('')

    axiosInstance
      .get(`/users/${id}`)
      .then(({ data }) => {
        if (!cancelled) setProfileUser(normalizeUser(data))
      })
      .catch((err) => {
        if (!cancelled) {
          // 404 gets a friendlier message; other errors fall through to the
          // generic text so the toast from axiosInstance is not duplicated.
          if (err.response?.status === 404) {
            setUserError('Kullanıcı bulunamadı.')
          } else {
            setUserError('Profil yüklenemedi.')
          }
        }
      })
      .finally(() => { if (!cancelled) setUserLoading(false) })

    return () => { cancelled = true }
  }, [id])

  // Fetch this user's blogs after the id is known.
  // Tries /users/:id/blogs first; falls back to /blogs?author_id=:id.
  useEffect(() => {
    let cancelled = false
    setBlogsLoading(true)
    setBlogsError('')

    axiosInstance
      .get(`/users/${id}/blogs`)
      .catch(() => axiosInstance.get(`/blogs?author_id=${id}`))  // fallback
      .then(({ data }) => {
        if (!cancelled) setBlogs(normalizeBlogs(data))
      })
      .catch(() => {
        if (!cancelled) setBlogsError('Yazılar yüklenemedi.')
      })
      .finally(() => { if (!cancelled) setBlogsLoading(false) })

    return () => { cancelled = true }
  }, [id])

  // ── Error: user not found ─────────────────────────────────────────────────
  if (!userLoading && userError) {
    return (
      <div className="page-container page-container--narrow">
        <Link to="/" className="back-link">← Ana Sayfa</Link>
        <div className="auth-server-error" role="alert" style={{ marginTop: 16 }}>
          {userError}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">← Ana Sayfa</Link>

      {/* ── User info card ─────────────────────────────────────────────── */}
      {userLoading ? (
        <div className="profile-card">
          <div className="skeleton-block profile-avatar" />
          <div className="profile-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton-line skeleton-line--short" style={{ height: 20 }} />
            <div className="skeleton-line skeleton-line--long" />
            <div className="skeleton-line" style={{ width: '60%' }} />
          </div>
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-avatar" />
          <div className="profile-info">
            <div className="profile-info__top">
              <h1 className="profile-username">{profileUser.username}</h1>
              {isOwnProfile && (
                <Link to="/edit-profile" className="btn btn--ghost btn--sm">
                  Profili Düzenle
                </Link>
              )}
            </div>

            {profileUser.bio && (
              <p className="profile-bio">{profileUser.bio}</p>
            )}

            {profileUser.joinDate && (
              <div className="profile-meta">
                <span className="profile-meta__item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                  {profileUser.joinDate} tarihinde katıldı
                </span>
              </div>
            )}

            {/* Stats: only render when at least one count is non-zero */}
            {(profileUser.blogCount > 0 || profileUser.commentCount > 0) && (
              <div className="profile-stats">
                <div className="profile-stat">
                  <span className="profile-stat__value">{profileUser.blogCount}</span>
                  <span className="profile-stat__label">Yazı</span>
                </div>
                <div className="profile-stat__divider" />
                <div className="profile-stat">
                  <span className="profile-stat__value">{profileUser.commentCount}</span>
                  <span className="profile-stat__label">Yorum</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Blog list ──────────────────────────────────────────────────── */}
      <div className="profile-blogs">
        <h2 className="profile-section-title">
          {userLoading
            ? 'Yazılar'
            : `${profileUser.username} Adlı Kullanıcının Yazıları`}
        </h2>

        {blogsError && (
          <div className="auth-server-error" role="alert" style={{ marginBottom: 16 }}>
            {blogsError}
          </div>
        )}

        {blogsLoading ? (
          <div className="blog-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="blog-card blog-card--skeleton">
                <div className="blog-card__thumb skeleton-block" />
                <div className="blog-card__body">
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line--long" />
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 && !blogsError ? (
          <div className="comments-empty">
            {isOwnProfile
              ? 'Henüz yazı oluşturmadınız.'
              : 'Bu kullanıcının henüz yazısı bulunmuyor.'}
            {isOwnProfile && (
              <> {' '}
                <Link to="/new-blog" className="auth-link">İlk yazınızı oluşturun →</Link>
              </>
            )}
          </div>
        ) : (
          <div className="blog-grid">
            {blogs.map((blog) => (
              <Link key={blog.id} to={`/blogs/${blog.id}`} className="blog-card">
                <div className="blog-card__thumb" />
                <div className="blog-card__body">
                  <span className="blog-card__tag">{blog.tag}</span>
                  <h2 className="blog-card__title">{blog.title}</h2>
                  <p className="blog-card__excerpt">{blog.excerpt}</p>
                  <div className="blog-card__footer">
                    <span className="blog-card__date">{blog.date}</span>
                  </div>
                  <span className="blog-card__read">Devamını Oku →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
