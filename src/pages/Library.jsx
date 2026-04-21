import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'
import HeartIcon from '../components/icons/HeartIcon'
import BlogCardStats from '../components/BlogCardStats'
import LoadingSpinner from '../components/LoadingSpinner'
import { extractTags, toPlainExcerpt } from '../utils/blogText'

// ── Normaliser ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

function normalizeBlog(raw) {
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  const date = dateRaw
    ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const rawExcerpt = raw.excerpt ?? raw.summary ?? raw.content ?? raw.body ?? ''
  const excerpt = toPlainExcerpt(rawExcerpt, 150)
  return {
    id:       raw.id,
    title:    raw.title ?? '(Başlıksız)',
    excerpt,
    date,
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags:     extractTags(raw),
    authorId: raw.author_id ?? raw.author?.id ?? null,
    imageUrl: resolveImageUrl(raw.cover_image_url ?? raw.image_url ?? raw.imageUrl ?? null),
    favoriteCount: raw.favorite_count ?? raw.favorites_count ?? raw.like_count ?? raw.likes_count ?? 0,
    commentCount: raw.comment_count ?? raw.comments_count ?? 0,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Library() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
        <LoadingSpinner />
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
            <article
              key={blog.id}
              className="blog-card library-card"
              onClick={() => navigate(`/blogs/${blog.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/blogs/${blog.id}`)}
            >
              <button
                className="blog-card__favorite blog-card__favorite--active"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(blog.id)
                }}
                disabled={removing === blog.id}
                title="Favorilerden çıkar"
                aria-label="Favorilerden çıkar"
              >
                {removing === blog.id ? (
                  '…'
                ) : (
                  <HeartIcon size={16} filled />
                )}
              </button>
              {blog.imageUrl && (
                <img src={blog.imageUrl} alt={blog.title} className="blog-card__thumb" />
              )}
              <div className="blog-card__body">
                <h2 className="blog-card__title">
                  <Link to={`/blogs/${blog.id}`} className="library-card__title-link">
                    {blog.title}
                  </Link>
                </h2>
                <p className="blog-card__excerpt">{blog.excerpt}</p>
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

                <div className="blog-card__footer">
                  <BlogCardStats favoriteCount={blog.favoriteCount ?? 0} commentCount={blog.commentCount ?? 0} />
                  <span className="blog-card__date">{blog.date}</span>
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
