// Profile page — displays public information for a user identified by :id,
// along with that user's published blogs.
//
// API calls:
//   GET /users/:id          → user info card
//   GET /users/:id/stats    → counters (posts/comments/followers/following)
//   GET /users/:id/blogs    → that user's blog list
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import Avatar, { AVATARS, getCachedIconId, saveAvatarCache } from '../components/Avatar'
import BlogCardStats from '../components/BlogCardStats'
import LoadingSpinner from '../components/LoadingSpinner'
import AsyncState from '../components/AsyncState'
import { normalizeBlogs } from '../services/blogMapper'

function toSafeCount(...values) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return 0
}

function extractItems(data) {
  return Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
}

// ── Data normalisers ──────────────────────────────────────────────────────────

// Converts a raw API user object into the shape the UI expects.
// Handles both camelCase and snake_case field names.
function normalizeUser(raw) {
  const joinRaw = raw.created_at ?? null
  let joinDate = ''
  if (joinRaw) {
    joinDate = new Date(joinRaw).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    })
  }
  return {
    id:           raw.id,
    username:     raw.username ?? `Kullanıcı #${raw.id}`,
    email:        raw.email ?? null,
    bio:          raw.bio ?? '',
    joinDate,
    // icon_id from backend (1-based, matches AVATARS[].id)
    iconId:       raw.icon_id ?? null,
    blogCount:    toSafeCount(raw.post_count, raw.blog_count, raw.posts_count),
    commentCount: toSafeCount(raw.comment_count, raw.comments_count),
    followingCount: toSafeCount(raw.following_count, raw.followingCount),
    followerCount: toSafeCount(raw.followers_count, raw.follower_count, raw.followerCount),
  }
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
  const [statsLoading, setStatsLoading] = useState(true)
  // ── Edit mode state ───────────────────────────────────────────────────────
  const [editMode,      setEditMode]      = useState(false)
  const [editFields,    setEditFields]    = useState({ username: '', bio: '' })
  const [editAvatar,    setEditAvatar]    = useState(null)   // draft avatar while editing
  const [editErrors,    setEditErrors]    = useState({})
  const [editSaving,    setEditSaving]    = useState(false)
  const [editSuccess,   setEditSuccess]   = useState(false)
  const [editServerErr, setEditServerErr] = useState('')

  // Check follow status when viewing another user's profile
  const fetchStats = useCallback(async () => {
    if (!id) return
    setStatsLoading(true)
    try {
      const { data } = await axiosInstance.get(`/users/${id}/stats`)
      setProfileUser((prev) => prev ? {
        ...prev,
        blogCount: toSafeCount(data?.post_count, data?.blog_count),
        commentCount: toSafeCount(data?.comment_count, data?.comments_count),
        followingCount: toSafeCount(data?.following_count, data?.followingCount),
        followerCount: toSafeCount(data?.followers_count, data?.follower_count, data?.followerCount),
      } : prev)
    } catch {
      // /stats başarısızsa bağlantı listelerinden net sayı türet.
      async function fetchConnectionCount(type) {
        const pageSize = 100
        let skip = 0
        let total = 0

        for (let i = 0; i < 100; i += 1) {
          const { data } = await axiosInstance.get(`/users/${id}/${type}`, {
            params: { skip, limit: pageSize },
          })
          const countFromMeta = toSafeCount(
            data?.total,
            data?.count,
            data?.total_count,
            data?.pagination?.total,
            data?.meta?.total,
          )
          if (countFromMeta > 0 || Number(data?.total) === 0 || Number(data?.count) === 0) return countFromMeta

          const list = extractItems(data)
          total += list.length
          if (list.length < pageSize) break
          skip += list.length
        }

        return total
      }

      async function fetchPostCount() {
        const pageSize = 100
        async function countFromEndpoint(getPage) {
          let skip = 0
          let total = 0

          for (let i = 0; i < 100; i += 1) {
            const { data } = await getPage(skip, pageSize)
            const list = normalizeBlogs(data, 20).filter((blog) => {
              if (blog.authorId == null) return false
              return String(blog.authorId) === String(id)
            })
            total += list.length
            if (list.length < pageSize) break
            skip += pageSize
          }

          return total
        }

        return countFromEndpoint((skip, limit) =>
          axiosInstance.get('/blogs', { params: { author_id: id, skip, limit } })
        )
      }

      try {
        const [followingCount, followerCount, blogCount] = await Promise.all([
          fetchConnectionCount('following'),
          fetchConnectionCount('followers'),
          fetchPostCount(),
        ])
        setProfileUser((prev) => prev ? { ...prev, followingCount, followerCount, blogCount } : prev)
      } catch {
        // fallback da başarısızsa mevcut değerleri koru
      }
    } finally {
      setStatsLoading(false)
    }
  }, [id])

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

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
      fetchStats()
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
      const { data } = await axiosInstance.put(`/users/${id}`, payload)
      const normalized = normalizeUser(data)

      if (normalized.iconId !== null) {
        saveAvatarCache(id, normalized.iconId)
      } else {
        saveAvatarCache(id, null)
      }
      setAvatarChoice(normalized.iconId)

      if (isOwnProfile) {
        updateUser({ icon_id: normalized.iconId, username: normalized.username })
      }

      setProfileUser((prev) => ({
        ...prev,
        ...normalized,
        blogCount: prev?.blogCount ?? 0,
        commentCount: prev?.commentCount ?? 0,
        followingCount: prev?.followingCount ?? 0,
        followerCount: prev?.followerCount ?? 0,
      }))
    } catch (err) {
      if (err.response?.status === 409) {
        setEditErrors({ username: 'Bu kullanıcı adı zaten kullanılıyor.' })
      } else {
        setEditServerErr(err.response?.data?.detail ?? 'Profil güncellenemedi.')
      }
      setEditSaving(false)
      return
    }

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
        fetchStats()
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
  // Uses /blogs?author_id=:id for backend compatibility.
  useEffect(() => {
    let cancelled = false
    setBlogsLoading(true)
    setBlogsError('')

    axiosInstance
      .get(`/blogs?author_id=${id}`)
      .then(({ data }) => {
        if (cancelled) return
        const list = normalizeBlogs(data, 120).filter((b) => {
          if (b.authorId == null) return true
          return String(b.authorId) === String(id)
        })
        setBlogs(list)
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
                  {statsLoading ? '…' : profileUser.blogCount}
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
              <div className="profile-stat__divider" />
              <Link to={`/profile/${id}/following`} className="profile-stat profile-stat--link">
                <span className="profile-stat__value">{statsLoading ? '…' : profileUser.followingCount}</span>
                <span className="profile-stat__label">Takip</span>
              </Link>
              <div className="profile-stat__divider" />
              <Link to={`/profile/${id}/followers`} className="profile-stat profile-stat--link">
                <span className="profile-stat__value">{statsLoading ? '…' : profileUser.followerCount}</span>
                <span className="profile-stat__label">Takipçi</span>
              </Link>
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

        <AsyncState
          loading={blogsLoading}
          error={blogsError}
          isEmpty={blogs.length === 0}
          loadingView={
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
          }
          emptyView={
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
          }
        >
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
                    {blog.tags.map((t, i) => (
                      <span key={`${t}-${i}`} className="blog-card__tag blog-card__tag--outline">{t}</span>
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
        </AsyncState>
      </div>
    </div>
  )
}
