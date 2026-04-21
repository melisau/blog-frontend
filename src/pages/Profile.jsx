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
import Avatar, { AVATARS, getCachedIconId, saveAvatarCache } from '../components/Avatar'
import BlogCardStats from '../components/BlogCardStats'
import LoadingSpinner from '../components/LoadingSpinner'
import { extractTags, toPlainExcerpt } from '../utils/blogText'

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
    email:        raw.email ?? null,
    bio:          raw.bio ?? raw.description ?? '',
    joinDate,
    // icon_id from backend (1-based, matches AVATARS[].id)
    iconId:       raw.icon_id ?? raw.iconId ?? null,
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
      id:       b.id,
      title:    b.title ?? b.name ?? b.headline ?? '(Başlıksız)',
      excerpt:  toPlainExcerpt(b.excerpt ?? b.summary ?? b.content ?? b.body ?? '', 120),
      date,
      authorId: b.author?.id ?? b.author_id ?? b.user?.id ?? b.user_id ?? b.created_by?.id ?? b.created_by ?? null,
      category: typeof b.category === 'string' ? b.category : (b.category?.name ?? null),
      tags:     extractTags(b),
      imageUrl: b.image_url ?? b.imageUrl ?? null,
      favoriteCount: b.favorite_count ?? b.favorites_count ?? b.like_count ?? b.likes_count ?? 0,
      commentCount: b.comment_count ?? b.comments_count ?? 0,
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Profile() {
  const { id } = useParams()
  const { user: currentUser, isAuthenticated, updateUser } = useAuth()

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

  // ── Avatar state (iconId: 1-based, matches backend icon_id) ─────────────
  // Initialized from localStorage cache; overwritten once profileUser loads.
  const [avatarChoice, setAvatarChoice]   = useState(() => getCachedIconId(id))

  // ── Follow state ──────────────────────────────────────────────────────────
  const [isFollowing,     setIsFollowing]     = useState(false)
  const [followLoading,   setFollowLoading]   = useState(false)

  // ── Edit mode state ───────────────────────────────────────────────────────
  const [editMode,      setEditMode]      = useState(false)
  const [editFields,    setEditFields]    = useState({ username: '', bio: '' })
  const [editAvatar,    setEditAvatar]    = useState(null)   // draft avatar while editing
  const [editErrors,    setEditErrors]    = useState({})
  const [editSaving,    setEditSaving]    = useState(false)
  const [editSuccess,   setEditSuccess]   = useState(false)
  const [editServerErr, setEditServerErr] = useState('')

  // Check follow status when viewing another user's profile
  useEffect(() => {
    if (isOwnProfile || !isAuthenticated || !id) return
    let cancelled = false
    axiosInstance
      .get('/users/me/following')
      .then(({ data }) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
        setIsFollowing(list.some((u) => String(u.id) === String(id)))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id, isAuthenticated, isOwnProfile])

  async function handleToggleFollow() {
    if (followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await axiosInstance.delete(`/users/me/following/${id}`)
        setIsFollowing(false)
      } else {
        await axiosInstance.post(`/users/me/following/${id}`)
        setIsFollowing(true)
      }
    } catch { /* toast shown by interceptor */ }
    finally { setFollowLoading(false) }
  }

  function openEdit() {
    setEditFields({ username: profileUser.username, bio: profileUser.bio ?? '' })
    setEditAvatar(avatarChoice)   // draft starts from the currently displayed iconId
    setEditErrors({})
    setEditSuccess(false)
    setEditServerErr('')
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setEditAvatar(null)
  }

  function validateEdit(f) {
    const errs = {}
    if (!f.username.trim()) errs.username = 'Kullanıcı adı boş olamaz.'
    else if (f.username.trim().length < 3) errs.username = 'En az 3 karakter olmalıdır.'
    return errs
  }

  async function handleEditSave(e) {
    e.preventDefault()
    const errs = validateEdit(editFields)
    if (Object.keys(errs).length) { setEditErrors(errs); return }

    setEditSaving(true)
    setEditServerErr('')
    setEditSuccess(false)

    const trimmedUsername = editFields.username.trim()
    const trimmedBio      = editFields.bio.trim()

    try {
      // PUT /users/:id — send icon_id so backend stores the choice.
      const payload = { username: trimmedUsername, bio: trimmedBio }
      if (editAvatar !== null) payload.icon_id = editAvatar
      await axiosInstance.put(`/users/${id}`, payload)
    } catch {
      // Non-blocking: localStorage and local state still update even if API rejects.
    }

    // Write-through to localStorage cache so the icon renders instantly on next load.
    if (editAvatar !== null) {
      saveAvatarCache(id, editAvatar)
      setAvatarChoice(editAvatar)
    } else {
      saveAvatarCache(id, null)
      setAvatarChoice(null)
    }

    // If this is the current user's own profile, sync the auth store so the
    // Navbar reflects the new avatar and username immediately.
    if (isOwnProfile) {
      updateUser({ icon_id: editAvatar, username: trimmedUsername })
    }

    // Update local profile state so UI reflects changes immediately.
    setProfileUser((prev) => ({
      ...prev,
      username: trimmedUsername,
      bio:      trimmedBio,
      iconId:   editAvatar,
    }))

    setEditSaving(false)
    setEditSuccess(true)
    setTimeout(() => { setEditMode(false); setEditSuccess(false) }, 900)
  }

  // Fetch user info whenever the id segment changes.
  useEffect(() => {
    let cancelled = false
    setUserLoading(true)
    setUserError('')

    axiosInstance
      .get(`/users/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        const normalized = normalizeUser(data)
        setProfileUser(normalized)
        // Sync avatarChoice with the icon_id returned by the backend.
        // Also write to localStorage cache so next render is instant.
        if (normalized.iconId != null) {
          setAvatarChoice(normalized.iconId)
          saveAvatarCache(normalized.id, normalized.iconId)
        }
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
        if (cancelled) return
        const list = normalizeBlogs(data).filter((b) => {
          if (b.authorId == null) return true
          return String(b.authorId) === String(id)
        })
        setBlogs(list)
        // Derive the real count from the fetched list — the user endpoint
        // often omits post_count or returns 0, so the list length is the
        // authoritative value.
        setProfileUser((prev) => prev ? { ...prev, blogCount: list.length } : prev)
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
        <Link to="/" className="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></Link>
        <div className="auth-server-error" role="alert" style={{ marginTop: 16 }}>
          {userError}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></Link>

      {/* ── User info card ─────────────────────────────────────────────── */}
      {userLoading ? (
        <div className="profile-card">
          <div className="skeleton-block" style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0 }} />
          <div className="profile-info">
            <div className="skeleton-line skeleton-line--short" style={{ height: 20 }} />
            <div className="skeleton-line skeleton-line--long" />
            <div className="skeleton-line" style={{ width: '60%' }} />
            <LoadingSpinner size="sm" centered={false} />
          </div>
        </div>

      ) : editMode ? (
        /* ── Edit form ──────────────────────────────────────────────────── */
        <form className="profile-edit-card" onSubmit={handleEditSave} noValidate>

          {/* Avatar picker */}
          <div className="profile-edit__avatar-section">
            <p className="profile-edit__label">Avatar Seç</p>
            <div className="avatar-picker" role="group" aria-label="Avatar seç">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  className={`avatar-picker__item${editAvatar === av.id ? ' avatar-picker__item--active' : ''}`}
                  onClick={() => setEditAvatar(av.id)}
                  title={av.label}
                  aria-label={`${av.label} avatarını seç`}
                  aria-pressed={editAvatar === av.id}
                >
                  <Avatar
                    userId={profileUser.id}
                    username={editFields.username || profileUser.username}
                    size="md"
                    iconId={av.id}
                  />
                </button>
              ))}
            </div>
            {editAvatar !== null && (
              <button
                type="button"
                className="avatar-picker__clear"
                onClick={() => setEditAvatar(null)}
              >
                × Avatarı kaldır — baş harflere dön
              </button>
            )}
            {/* Live preview */}
            <div className="profile-edit__preview">
              <Avatar
                userId={profileUser.id}
                username={editFields.username || profileUser.username}
                size="lg"
                iconId={editAvatar}
              />
              <span className="profile-edit__preview-label">Önizleme</span>
            </div>
          </div>

          {/* Fields */}
          <div className="profile-edit__fields">
            {editServerErr && (
              <div className="auth-server-error" role="alert">{editServerErr}</div>
            )}
            {editSuccess && (
              <div className="comment-form__success" role="status">Profil güncellendi ✓</div>
            )}

            <div className="field-group">
              <label htmlFor="edit-username" className="field-label">Kullanıcı Adı</label>
              <input
                id="edit-username"
                type="text"
                value={editFields.username}
                onChange={(e) => {
                  setEditFields((p) => ({ ...p, username: e.target.value }))
                  if (editErrors.username) setEditErrors((p) => ({ ...p, username: '' }))
                }}
                className={`field-input${editErrors.username ? ' field-input--error' : ''}`}
                placeholder="Kullanıcı adı"
                maxLength={50}
              />
              {editErrors.username && <p className="field-error">{editErrors.username}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="edit-bio" className="field-label">
                Biyografi
                <span className="field-label__optional"> (isteğe bağlı)</span>
              </label>
              <textarea
                id="edit-bio"
                rows={3}
                value={editFields.bio}
                onChange={(e) => setEditFields((p) => ({ ...p, bio: e.target.value }))}
                className="field-input field-textarea"
                placeholder="Kendinizden kısaca bahsedin…"
                maxLength={300}
              />
              <div className="field-hint">{editFields.bio.length}/300</div>
            </div>

            <div className="profile-edit__actions">
              <button type="submit" className="btn btn--primary" disabled={editSaving}>
                {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={cancelEdit} disabled={editSaving}>
                İptal
              </button>
            </div>
          </div>
        </form>

      ) : (
        /* ── View mode ──────────────────────────────────────────────────── */
        <div className="profile-card">
          <Avatar
            userId={profileUser.id}
            username={profileUser.username}
            size="lg"
            iconId={avatarChoice}
          />

          <div className="profile-info">
            <div className="profile-info__top">
              <h1 className="profile-username">{profileUser.username}</h1>
              {isOwnProfile ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--ghost btn--sm" onClick={openEdit}>
                    Profili Düzenle
                  </button>
                  <Link to="/new-blog" className="btn btn--primary btn--sm">
                    Yeni Yazı
                  </Link>
                </div>
              ) : isAuthenticated && (
                <button
                  className={`follow-btn${isFollowing ? ' follow-btn--following' : ''}`}
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading
                    ? '…'
                    : isFollowing
                    ? 'Takip Ediliyor'
                    : 'Takip Et'}
                </button>
              )}
            </div>

            {profileUser.bio && (
              <p className="profile-bio">{profileUser.bio}</p>
            )}

            <div className="profile-meta">
              {profileUser.email && (
                <span className="profile-meta__item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <polyline points="2,4 12,13 22,4"/>
                  </svg>
                  {profileUser.email}
                </span>
              )}
              {profileUser.joinDate && (
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
              )}
            </div>

            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat__value">
                  {blogsLoading ? '…' : profileUser.blogCount}
                </span>
                <span className="profile-stat__label">Yazı</span>
              </div>
              {profileUser.commentCount > 0 && (
                <>
                  <div className="profile-stat__divider" />
                  <div className="profile-stat">
                    <span className="profile-stat__value">{profileUser.commentCount}</span>
                    <span className="profile-stat__label">Yorum</span>
                  </div>
                </>
              )}
            </div>
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
          <>
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
            <LoadingSpinner size="sm" />
          </>
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
                {blog.imageUrl && (
                  <img src={blog.imageUrl} alt={blog.title} className="blog-card__thumb" />
                )}
                <div className="blog-card__body">
                  <h2 className="blog-card__title">{blog.title}</h2>
                  <p className="blog-card__excerpt">{blog.excerpt}</p>
                  <div className="blog-card__tags">
                    {blog.category && (
                      <span className="blog-card__tag">{blog.category}</span>
                    )}
                    {blog.tags.map((t) => (
                      <span key={t} className="blog-card__tag blog-card__tag--outline">{t}</span>
                    ))}
                    {!blog.category && blog.tags.length === 0 && (
                      <span className="blog-card__tag">Genel</span>
                    )}
                  </div>
                  <div className="blog-card__footer">
                    <BlogCardStats favoriteCount={blog.favoriteCount ?? 0} commentCount={blog.commentCount ?? 0} />
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
