import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import BlogContent from '../components/BlogContent'
import CommentItem from '../components/CommentItem'
import CommentForm from '../components/CommentForm'
import SEO from '../components/SEO'
import HeartIcon from '../components/icons/HeartIcon'
import BookmarkIcon from '../components/icons/BookmarkIcon'
import { getMyLibrary, getMyLikes, invalidateLibraryCache, invalidateLikesCache } from '../services/favoritesService'
import { getBlogById, getCommentsByBlogId, getUserSummaryById } from '../services/blogDetailService'

// ── Normalisers ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

function extractTags(raw) {
  const source = raw.tags ?? raw.tag_list ?? raw.labels ?? raw.keywords ?? []
  const arr = Array.isArray(source) ? source : (source ? [source] : [])
  return arr
    .map((t) => (typeof t === 'string' ? t.trim() : (t?.name ?? t?.title ?? t?.label ?? null)))
    .filter(Boolean)
}

function normalizeBlog(raw) {
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  const authorId = raw.author?.id ?? raw.author_id ?? raw.owner?.id ?? raw.owner_id ?? raw.user?.id ?? raw.user_id ?? raw.created_by?.id ?? raw.created_by ?? null
  const username = raw.author?.username ?? raw.author?.name ?? raw.author?.full_name ?? raw.author_name ?? raw.owner_name ?? raw.writer ?? null
  const authorIconId = raw.author?.icon_id ?? raw.owner?.icon_id ?? raw.user?.icon_id ?? raw.created_by?.icon_id ?? null

  return {
    id:       raw.id,
    title:    raw.title ?? raw.name ?? raw.headline ?? '(Başlıksız)',
    content:  raw.content ?? raw.body ?? '',
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags:     extractTags(raw),
    date:     dateRaw ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
    author:   { id: authorId, username, iconId: authorIconId },
    imageUrl: resolveImageUrl(raw.cover_image_url ?? raw.image_url ?? raw.imageUrl ?? null),
    saveCount: raw.save_count ?? raw.saves_count ?? 0,
    likeCount: raw.like_count ?? raw.likes_count ?? raw.favorite_count ?? raw.favorites_count ?? 0,
  }
}

function normalizeComment(raw) {
  if (!raw) return null
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  const authorData = raw.author || raw.user || raw.owner || {}
  const isString = typeof authorData === 'string'
  const isNumber = typeof authorData === 'number'

  let username = isString ? authorData : (!isNumber ? (authorData.username ?? authorData.name ?? authorData.full_name ?? authorData.displayName) : null)
  username = username ?? raw.author_name ?? raw.owner_name ?? raw.username ?? raw.name ?? null

  const authorId = isNumber ? authorData : (authorData.id ?? raw.author_id ?? raw.user_id ?? null)
  const iconId = (!isString && !isNumber) ? (authorData.icon_id ?? authorData.iconId ?? null) : null

  return {
    id:      raw.id,
    content: raw.content ?? raw.text ?? '',
    date:    dateRaw ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
    author:  { id: authorId, username, iconId },
  }
}

function normalizeComments(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.items ?? raw?.results ?? raw?.comments ?? raw?.data ?? [])
  return list.map(normalizeComment).filter(Boolean)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BlogDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [blog,        setBlog]        = useState(null)
  const [blogLoading, setBlogLoading] = useState(true)
  const [blogError,   setBlogError]   = useState('')

  const [comments,        setComments]        = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)

  const [commentText,       setCommentText]       = useState('')
  const [submitting,        setSubmitting]        = useState(false)
  const [commentError,      setCommentError]      = useState('')
  const [submitSuccess,     setSubmitSuccess]     = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [deletingBlog,      setDeletingBlog]      = useState(false)

  const [isSaved,      setIsSaved]      = useState(false)
  const [saveLoading,  setSaveLoading]  = useState(false)
  const [isLiked,      setIsLiked]      = useState(false)
  const [likeLoading,  setLikeLoading]  = useState(false)

  useEffect(() => {
    let cancelled = false
    setBlogLoading(true)
    getBlogById(id)
      .then(async (data) => {
        if (cancelled) return
        const normalized = normalizeBlog(data)
        if (!normalized.author.username && normalized.author.id) {
          try {
            const u = await getUserSummaryById(normalized.author.id)
            normalized.author.username = u.username
            normalized.author.iconId = normalized.author.iconId ?? u.iconId
          } catch { /* silent fail */ }
        }
        setBlog(normalized)
        document.title = `${normalized.title} | Blog`
      })
      .catch((err) => {
        if (cancelled) return
        setBlogError(err.response?.status === 404 ? 'Blog yazısı bulunamadı.' : 'Yazı yüklenemedi.')
      })
      .finally(() => { if (!cancelled) setBlogLoading(false) })

    return () => { cancelled = true; document.title = 'Blog | En Son Yazılar' }
  }, [id])

  // Check engagement states
  useEffect(() => {
    if (!isAuthenticated || !id) return
    let cancelled = false

    getMyLibrary().then((list) => {
      if (cancelled) return
      setIsSaved(list.some((b) => String(b.id) === String(id)))
    }).catch(() => {})

    getMyLikes().then((list) => {
      if (cancelled) return
      setIsLiked(list.some((b) => String(b.id) === String(id)))
    }).catch(() => {})

    return () => { cancelled = true }
  }, [id, isAuthenticated])

  async function handleToggleSave() {
    if (saveLoading) return
    const wasSaved = isSaved
    setSaveLoading(true)
    setIsSaved(!wasSaved)
    setBlog((prev) => prev ? { ...prev, saveCount: Math.max(0, (prev.saveCount ?? 0) + (wasSaved ? -1 : 1)) } : prev)
    try {
      if (wasSaved) {
        await axiosInstance.delete(`/users/me/library/${id}`)
      } else {
        await axiosInstance.post(`/users/me/library/${id}`)
      }
      invalidateLibraryCache()
    } catch {
      setIsSaved(wasSaved)
      setBlog((prev) => prev ? { ...prev, saveCount: Math.max(0, (prev.saveCount ?? 0) + (wasSaved ? 1 : -1)) } : prev)
    }
    finally { setSaveLoading(false) }
  }

  async function handleToggleLike() {
    if (likeLoading) return
    const wasLiked = isLiked
    setLikeLoading(true)
    setIsLiked(!wasLiked)
    setBlog((prev) => prev ? { ...prev, likeCount: Math.max(0, (prev.likeCount ?? 0) + (wasLiked ? -1 : 1)) } : prev)
    try {
      await axiosInstance.post(`/users/me/likes/${id}`)
      invalidateLikesCache()
    } catch {
      setIsLiked(wasLiked)
      setBlog((prev) => prev ? { ...prev, likeCount: Math.max(0, (prev.likeCount ?? 0) + (wasLiked ? 1 : -1)) } : prev)
    }
    finally { setLikeLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    setCommentsLoading(true)

    getCommentsByBlogId(id)
      .then(async (data) => {
        if (cancelled) return
        const normalized = normalizeComments(data)

        // Collect unique author IDs whose username is still missing
        const missingIds = [
          ...new Set(
            normalized
              .filter((c) => !c.author.username && c.author.id != null)
              .map((c) => c.author.id)
          ),
        ]

        if (missingIds.length > 0) {
          const userMap = {}
          await Promise.allSettled(
            missingIds.map((uid) =>
              getUserSummaryById(uid).then((u) => {
                userMap[uid] = {
                  username: u.username,
                  iconId: u.iconId,
                }
              })
            )
          )
          // Patch missing usernames into the normalized list
          for (const c of normalized) {
            if (!c.author.username && c.author.id != null && userMap[c.author.id]) {
              c.author.username = userMap[c.author.id].username
              if (!c.author.iconId) c.author.iconId = userMap[c.author.id].iconId
            }
          }
        }

        if (!cancelled) setComments(normalized)
      })
      .catch(() => { /* silent fail */ })
      .finally(() => { if (!cancelled) setCommentsLoading(false) })

    return () => { cancelled = true }
  }, [id])

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!commentText.trim()) { setCommentError('Yorum boş olamaz.'); return }
    if (commentText.trim().length < 3) { setCommentError('Yorum en az 3 karakter olmalıdır.'); return }

    setSubmitting(true)
    setCommentError('')
    setSubmitSuccess(false)
    try {
      const { data } = await axiosInstance.post(`/blogs/${id}/comments`, { content: commentText.trim() })
      const newComment = normalizeComment(data)

      if (!newComment.author.username && user) {
        newComment.author.username = user.username ?? user.name ?? user.full_name ?? user.displayName ?? 'Kullanıcı'
      }
      if (!newComment.author.id && (user?.id || user?.sub)) {
        newComment.author.id = user.id ?? user.sub
      }
      if (!newComment.author.iconId && (user?.icon_id || user?.iconId)) {
        newComment.author.iconId = user.icon_id ?? user.iconId
      }

      setComments((prev) => [...prev, newComment])
      setCommentText('')
      setSubmitSuccess(true)
    } catch {
      setCommentError('Yorum gönderilemedi. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    setDeletingCommentId(commentId)
    try {
      await axiosInstance.delete(`/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch { /* toast shown by global interceptor */ }
    finally { setDeletingCommentId(null) }
  }

  async function handleDeleteBlog() {
    if (!window.confirm('Bu blog yazısını silmek istediğinize emin misiniz?')) return
    setDeletingBlog(true)
    try {
      await axiosInstance.delete(`/blogs/${id}`)
      navigate('/', { replace: true })
    } catch { setDeletingBlog(false) }
  }

  if (blogLoading) {
    return (
      <div className="page-container page-container--narrow">
        <div className="skeleton-line skeleton-line--short" style={{ marginBottom: 24 }} />
        <div className="skeleton-line" style={{ height: 36, marginBottom: 16 }} />
        <div className="skeleton-line skeleton-line--long" />
      </div>
    )
  }

  if (blogError) {
    return (
      <div className="page-container page-container--narrow">
        <Link to="/" className="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></Link>
        <div className="auth-server-error" role="alert" style={{ marginTop: 16 }}>{blogError}</div>
      </div>
    )
  }

  const isBlogAuthor = isAuthenticated && user?.id != null && String(user.id) === String(blog.author.id)

  return (
    <div className="page-container page-container--narrow">
      {blog && (
        <SEO 
          title={blog.title}
          description={blog.content.slice(0, 160).trim() + '…'}
          image={blog.imageUrl}
        />
      )}
      <div className="detail-topbar">
        <Link to="/" className="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></Link>
        {isAuthenticated && (
          <div className="detail-topbar__actions">
            <button
              className={`save-btn${isSaved ? ' save-btn--active' : ''}`}
              onClick={handleToggleSave}
              disabled={saveLoading}
              title={isSaved ? 'Kitaplıktan çıkar' : 'Kitaplığa ekle'}
              aria-label={isSaved ? 'Kitaplıktan çıkar' : 'Kitaplığa ekle'}
            >
              <BookmarkIcon size={20} filled={isSaved} />
            </button>
            <button
              className={`like-btn${isLiked ? ' like-btn--active' : ''}`}
              onClick={handleToggleLike}
              disabled={likeLoading}
              title={isLiked ? 'Beğenmekten vazgeç' : 'Beğen'}
              aria-label={isLiked ? 'Beğenmekten vazgeç' : 'Beğen'}
            >
              <HeartIcon size={20} filled={isLiked} />
            </button>
          </div>
        )}
      </div>

      <BlogContent 
        blog={blog} 
        isBlogAuthor={isBlogAuthor} 
        onDeleteBlog={handleDeleteBlog} 
        deletingBlog={deletingBlog} 
      />

      <section className="comments-section">
        <h2 className="comments-title">
          Yorumlar
          {!commentsLoading && <span className="comments-count">{comments.length}</span>}
        </h2>

        {commentsLoading ? (
          <div className="comments-list">
            {[1, 2].map((n) => (
              <div key={n} className="comment comment--skeleton">
                <div className="skeleton-block" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line skeleton-line--long" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="comments-empty">Henüz yorum yok. İlk yorumu siz yapın!</p>
        ) : (
          <div className="comments-list">
            {comments.map((c) => (
              <CommentItem 
                key={c.id} 
                comment={c} 
                isAuthenticated={isAuthenticated} 
                currentUser={user} 
                onDelete={handleDeleteComment} 
                isDeleting={deletingCommentId === c.id} 
              />
            ))}
          </div>
        )}

        {isAuthenticated && (
          <CommentForm 
            onSubmit={handleCommentSubmit}
            text={commentText}
            setText={setCommentText}
            error={commentError}
            setError={setCommentError}
            submitting={submitting}
            success={submitSuccess}
          />
        )}
      </section>
    </div>
  )
}
