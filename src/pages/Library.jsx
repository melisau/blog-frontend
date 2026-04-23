import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'
import HeartIcon from '../components/icons/HeartIcon'
import BlogCardStats from '../components/BlogCardStats'
import LoadingSpinner from '../components/LoadingSpinner'
import AsyncState from '../components/AsyncState'
import { extractBlogList, normalizeBlogs } from '../services/blogMapper'
import { getMyFavorites, invalidateMyFavoritesCache } from '../services/favoritesService'

// ── Component ─────────────────────────────────────────────────────────────────

export default function Library() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [blogs,   setBlogs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [removing, setRemoving] = useState(null)

  const fetchFavorites = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const data = await getMyFavorites()
      if (signal?.aborted) return
      setBlogs(normalizeBlogs(extractBlogList(data)))
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      setError('Kütüphane yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchFavorites(controller.signal)
    return () => controller.abort()
  }, [fetchFavorites])

  async function handleRemove(blogId) {
    setRemoving(blogId)
    try {
      await axiosInstance.delete(`/users/me/favorites/${blogId}`)
      invalidateMyFavoritesCache()
      setBlogs((prev) => prev.filter((b) => b.id !== blogId))
    } catch { /* toast shown by interceptor */ }
    finally { setRemoving(null) }
  }

  return (
    <div className="page-container">
      <SEO title="Kütüphanem" description="Kaydettiğin blog yazıları." />

      <h1 className="library-title">Kütüphanem</h1>

      <AsyncState
        loading={loading}
        error={error}
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
            Henüz hiç yazı kaydetmediniz.{' '}
            <Link to="/" className="auth-link">Yazılara göz atın →</Link>
          </div>
        }
      >
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
                  {blog.tags.map((t, i) => (
                    <span key={`${t}-${i}`} className="blog-card__tag blog-card__tag--outline">#{t}</span>
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
      </AsyncState>
    </div>
  )
}
