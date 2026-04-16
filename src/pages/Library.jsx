import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'

// ── Normaliser ────────────────────────────────────────────────────────────────

function extractTags(raw) {
  const source = raw.tags ?? raw.tag_list ?? raw.labels ?? raw.keywords ?? []
  const arr = Array.isArray(source) ? source : (source ? [source] : [])
  return arr
    .map((t) => (typeof t === 'string' ? t.trim() : (t?.name ?? t?.title ?? t?.label ?? null)))
    .filter(Boolean)
}

function normalizeBlog(raw) {
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  const date = dateRaw
    ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const rawExcerpt = raw.excerpt ?? raw.summary ?? raw.content ?? raw.body ?? ''
  const excerpt = rawExcerpt.length > 150 ? rawExcerpt.slice(0, 150).trimEnd() + '…' : rawExcerpt
  return {
    id:       raw.id,
    title:    raw.title ?? '(Başlıksız)',
    excerpt,
    date,
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags:     extractTags(raw),
    authorId: raw.author_id ?? raw.author?.id ?? null,
    imageUrl: raw.image_url ?? raw.imageUrl ?? null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Library() {
  const { user } = useAuth()

  const [blogs,   setBlogs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [removing, setRemoving] = useState(null)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axiosInstance.get('/users/me/favorites')
      const list = Array.isArray(data)
        ? data
        : (data?.items ?? data?.results ?? data?.data ?? [])
      setBlogs(list.map(normalizeBlog))
    } catch {
      setError('Kütüphane yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  async function handleRemove(blogId) {
    setRemoving(blogId)
    try {
      await axiosInstance.delete(`/users/me/favorites/${blogId}`)
      setBlogs((prev) => prev.filter((b) => b.id !== blogId))
    } catch { /* toast shown by interceptor */ }
    finally { setRemoving(null) }
  }

  return (
    <div className="page-container">
      <SEO title="Kütüphanem" description="Kaydettiğin blog yazıları." />

      <h1 className="library-title">Kütüphanem</h1>

      {loading ? (
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
      ) : error ? (
        <div className="auth-server-error" role="alert">{error}</div>
      ) : blogs.length === 0 ? (
        <div className="comments-empty">
          Henüz hiç yazı kaydetmediniz.{' '}
          <Link to="/" className="auth-link">Yazılara göz atın →</Link>
        </div>
      ) : (
        <div className="blog-grid">
          {blogs.map((blog) => (
            <article key={blog.id} className="blog-card library-card">
              {blog.imageUrl ? (
                <img src={blog.imageUrl} alt={blog.title} className="blog-card__thumb" />
              ) : (
                <div className="blog-card__thumb" />
              )}
              <div className="blog-card__body">
                <div className="blog-card__tags">
                  {blog.category && (
                    <span className="blog-card__tag">{blog.category}</span>
                  )}
                  {blog.tags.map((t) => (
                    <span key={t} className="blog-card__tag blog-card__tag--outline">#{t}</span>
                  ))}
                  {!blog.category && blog.tags.length === 0 && (
                    <span className="blog-card__tag">Genel</span>
                  )}
                </div>

                <h2 className="blog-card__title">
                  <Link to={`/blogs/${blog.id}`} className="library-card__title-link">
                    {blog.title}
                  </Link>
                </h2>
                <p className="blog-card__excerpt">{blog.excerpt}</p>

                <div className="blog-card__footer">
                  <span className="blog-card__date">{blog.date}</span>
                  <button
                    className="library-card__remove"
                    onClick={() => handleRemove(blog.id)}
                    disabled={removing === blog.id}
                    title="Kütüphaneden kaldır"
                    aria-label="Kütüphaneden kaldır"
                  >
                    {removing === blog.id ? (
                      '…'
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                        stroke="none" aria-hidden="true">
                        <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/>
                      </svg>
                    )}
                  </button>
                </div>

                <Link to={`/blogs/${blog.id}`} className="blog-card__read">
                  Devamını Oku →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
