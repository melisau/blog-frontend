// BlogDetail page — fetches a single blog post and its comments from the API.
//
// Endpoints used:
//   GET  /blogs/{id}           → blog content, author, date, category
//   GET  /blogs/{id}/comments  → comment list
//   POST /blogs/{id}/comments  → submit a new comment (auth required)
//   DELETE /comments/{id}      → delete a comment  (author only)
//   DELETE /blogs/{id}         → delete this blog  (author only)
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'

// ── Normalisers ───────────────────────────────────────────────────────────────

function normalizeBlog(raw) {
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  return {
    id:       raw.id,
    title:    raw.title ?? '(Başlıksız)',
    content:  raw.content ?? raw.body ?? '',
    tag:      raw.category ?? raw.tag ?? raw.tags?.[0] ?? 'Genel',
    date:     dateRaw
      ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '',
    author: {
      id:       raw.author?.id       ?? raw.author_id       ?? null,
      username: raw.author?.username ?? raw.author?.name    ?? raw.author_name ?? 'Anonim',
    },
  }
}

function normalizeComment(raw) {
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  return {
    id:      raw.id,
    content: raw.content ?? raw.text ?? '',
    date:    dateRaw
      ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '',
    author: {
      id:       raw.author?.id       ?? raw.author_id       ?? null,
      username: raw.author?.username ?? raw.author?.name    ?? raw.author_name ?? 'Anonim',
    },
  }
}

function normalizeComments(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.items ?? raw?.results ?? raw?.comments ?? raw?.data ?? [])
  return list.map(normalizeComment)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BlogDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { isAuthenticated, user } = useAuth()

  // ── Blog state ────────────────────────────────────────────────────────────
  const [blog,        setBlog]        = useState(null)
  const [blogLoading, setBlogLoading] = useState(true)
  const [blogError,   setBlogError]   = useState('')

  // ── Comments state ────────────────────────────────────────────────────────
  const [comments,        setComments]        = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)

  // ── Comment form state ────────────────────────────────────────────────────
  const [commentText,   setCommentText]   = useState('')
  const [commentError,  setCommentError]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deletingBlog,       setDeletingBlog]       = useState(false)
  const [deletingCommentId,  setDeletingCommentId]  = useState(null)

  // Fetch blog when id changes
  useEffect(() => {
    let cancelled = false
    setBlogLoading(true)
    setBlogError('')

    axiosInstance
      .get(`/blogs/${id}`)
      .then(({ data }) => { if (!cancelled) setBlog(normalizeBlog(data)) })
      .catch((err) => {
        if (cancelled) return
        setBlogError(
          err.response?.status === 404
            ? 'Blog yazısı bulunamadı.'
            : 'Yazı yüklenemedi.'
        )
      })
      .finally(() => { if (!cancelled) setBlogLoading(false) })

    return () => { cancelled = true }
  }, [id])

  // Fetch comments when id changes
  useEffect(() => {
    let cancelled = false
    setCommentsLoading(true)

    axiosInstance
      .get(`/blogs/${id}/comments`)
      .then(({ data }) => { if (!cancelled) setComments(normalizeComments(data)) })
      .catch(() => { /* comments failing silently is acceptable */ })
      .finally(() => { if (!cancelled) setCommentsLoading(false) })

    return () => { cancelled = true }
  }, [id])

  // Submit new comment via POST /blogs/{id}/comments
  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!commentText.trim()) { setCommentError('Yorum boş olamaz.'); return }
    if (commentText.trim().length < 3) { setCommentError('Yorum en az 3 karakter olmalıdır.'); return }

    setSubmitting(true)
    setCommentError('')
    setSubmitSuccess(false)
    try {
      const { data } = await axiosInstance.post(`/blogs/${id}/comments`, {
        content: commentText.trim(),
      })
      setComments((prev) => [...prev, normalizeComment(data)])
      setCommentText('')
      setSubmitSuccess(true)
    } catch {
      setCommentError('Yorum gönderilemedi. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete a comment via DELETE /comments/{commentId}
  async function handleDeleteComment(commentId) {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    setDeletingCommentId(commentId)
    try {
      await axiosInstance.delete(`/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      // toast shown by global interceptor
    } finally {
      setDeletingCommentId(null)
    }
  }

  // Delete this blog via DELETE /blogs/{id}
  async function handleDeleteBlog() {
    if (!window.confirm('Bu blog yazısını silmek istediğinize emin misiniz?')) return
    setDeletingBlog(true)
    try {
      await axiosInstance.delete(`/blogs/${id}`)
      navigate('/', { replace: true })
    } catch {
      setDeletingBlog(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (blogLoading) {
    return (
      <div className="page-container page-container--narrow">
        <div className="skeleton-line skeleton-line--short" style={{ marginBottom: 24 }} />
        <div className="skeleton-line" style={{ height: 36, marginBottom: 16 }} />
        <div className="skeleton-line skeleton-line--long" />
        <div className="skeleton-line skeleton-line--long" style={{ marginTop: 8 }} />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (blogError) {
    return (
      <div className="page-container page-container--narrow">
        <Link to="/" className="back-link">← Ana Sayfa</Link>
        <div className="auth-server-error" role="alert" style={{ marginTop: 16 }}>
          {blogError}
        </div>
      </div>
    )
  }

  // Ownership checks
  const isBlogAuthor = isAuthenticated && user?.id != null && String(user.id) === String(blog.author.id)

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">← Tüm Yazılar</Link>

      {/* ── Blog article ────────────────────────────────────────────────── */}
      <article className="blog-article">
        <div className="blog-article__meta">
          <span className="blog-card__tag">{blog.tag}</span>
          <span className="blog-article__date">{blog.date}</span>
        </div>

        <h1 className="blog-article__title">{blog.title}</h1>

        <div className="blog-article__author">
          <div className="avatar" />
          <div className="blog-article__author-info">
            <Link to={`/profile/${blog.author.id}`} className="blog-article__author-name">
              {blog.author.username}
            </Link>
            <span className="blog-article__author-date">{blog.date} tarihinde yayınlandı</span>
          </div>
        </div>

        <div className="blog-article__content">
          {blog.content.split('\n\n').map((para, i) => (
            <p key={i}>{para.trim()}</p>
          ))}
        </div>

        {/* Author actions: edit + delete */}
        {isBlogAuthor && (
          <div className="blog-article__actions">
            <Link to={`/edit-blog/${id}`} className="btn btn--ghost">Düzenle</Link>
            <button
              className="btn btn--danger"
              onClick={handleDeleteBlog}
              disabled={deletingBlog}
            >
              {deletingBlog ? 'Siliniyor…' : 'Sil'}
            </button>
          </div>
        )}
      </article>

      {/* ── Comments section ─────────────────────────────────────────────── */}
      <section className="comments-section">
        <h2 className="comments-title">
          Yorumlar
          {!commentsLoading && <span className="comments-count">{comments.length}</span>}
        </h2>

        {commentsLoading ? (
          <div className="comments-list">
            {[1, 2].map((n) => (
              <div key={n} className="comment comment--skeleton">
                <div className="skeleton-block" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
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
            {comments.map((c) => {
              const isCommentAuthor = isAuthenticated && user?.id != null && String(user.id) === String(c.author.id)
              return (
                <div key={c.id} className="comment">
                  <div className="avatar avatar--sm" />
                  <div className="comment__body">
                    <div className="comment__header">
                      <Link to={`/profile/${c.author.id}`} className="comment__author">
                        {c.author.username}
                      </Link>
                      <span className="comment__date">{c.date}</span>
                      {isCommentAuthor && (
                        <button
                          className="comment__delete"
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={deletingCommentId === c.id}
                          aria-label="Yorumu sil"
                        >
                          {deletingCommentId === c.id ? '…' : '×'}
                        </button>
                      )}
                    </div>
                    <p className="comment__text">{c.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isAuthenticated ? (
          <form onSubmit={handleCommentSubmit} noValidate className="comment-form">
            <h3 className="comment-form__title">Yorum Yaz</h3>

            {submitSuccess && (
              <div className="comment-form__success" role="status">Yorumunuz eklendi.</div>
            )}

            <div className="field-group">
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value)
                  if (commentError) setCommentError('')
                  if (submitSuccess) setSubmitSuccess(false)
                }}
                className={`field-input field-textarea${commentError ? ' field-input--error' : ''}`}
                placeholder="Düşüncelerinizi paylaşın…"
              />
              {commentError && <p className="field-error">{commentError}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="auth-btn"
              style={{ width: 'auto', alignSelf: 'flex-end' }}
            >
              {submitting ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </form>
        ) : (
          <div className="comment-form__guest">
            <Link to="/login" className="auth-link">Giriş yapın</Link>
            {' '}veya{' '}
            <Link to="/register" className="auth-link">kayıt olun</Link>
            {' '}yorum yapmak için.
          </div>
        )}
      </section>
    </div>
  )
}
