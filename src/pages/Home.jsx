import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import BlogCard from '../components/BlogCard'
import SEO from '../components/SEO'
import LoadingSpinner from '../components/LoadingSpinner'
import { extractTags } from '../utils/blogText'
import { extractBlogList } from '../services/blogMapper'
import { useInfiniteBlogs } from '../hooks/useInfiniteBlogs'

// ── Page Component ───────────────────────────────────────────────────────────

export default function Home() {
  const BATCH_SIZE = 6

  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const activeCategory = searchParams.get('category')
  const activeTag      = searchParams.get('tag')
  const query          = searchParams.get('q')?.trim() ?? ''

  const [recentTags, setRecentTags] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)
  const { blogs, loading, loadingMore, error, hasMore, loadMoreRef } = useInfiniteBlogs({
    batchSize: BATCH_SIZE,
    category: activeCategory,
    tag: activeTag,
    query,
  })

  useEffect(() => {
    let cancelled = false
    axiosInstance
      .get('/blogs', { params: { limit: 100 } })
      .then(({ data }) => {
        if (cancelled) return
        const list = extractBlogList(data)
        const counts = new Map()
        list.forEach((b) => {
          extractTags(b).forEach((tag) => {
            counts.set(tag, (counts.get(tag) ?? 0) + 1)
          })
        })
        const stableTags = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag]) => tag)
        setRecentTags(stableTags)
      })
      .catch(() => { /* silent fail */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set())
      return
    }
    let cancelled = false
    axiosInstance
      .get('/users/me/favorites')
      .then(({ data }) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
        setFavoriteIds(new Set(list.map((b) => String(b.id))))
      })
      .catch(() => { /* silent fail */ })
    return () => { cancelled = true }
  }, [isAuthenticated])

  async function handleToggleFavorite(blogId) {
    if (!isAuthenticated || favoriteLoadingId) return
    const key = String(blogId)
    const currentlyFavorited = favoriteIds.has(key)
    setFavoriteLoadingId(blogId)
    try {
      if (currentlyFavorited) {
        await axiosInstance.delete(`/users/me/favorites/${blogId}`)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } else {
        await axiosInstance.post(`/users/me/favorites/${blogId}`)
        setFavoriteIds((prev) => new Set(prev).add(key))
      }
    } catch { /* toast interceptor handles */ }
    finally { setFavoriteLoadingId(null) }
  }

  return (
    <div className="page-container">
      <SEO 
        title={activeCategory ? `${activeCategory} Kategorisi` : activeTag ? `#${activeTag} Etiketi` : 'Ana Sayfa'}
        description="En son yazıları keşfedin ve topluluğumuza katılın."
      />
      {/* ── Filter Status ── */}
      {(activeCategory || activeTag || query) && (
        <div className="filter-bar">
          <span className="filter-bar__label">
            {activeCategory
              ? `Kategori: ${activeCategory}`
              : activeTag
                ? `Etiket: #${activeTag}`
                : `Arama: "${query}"`}
          </span>
          <Link to="/" className="filter-bar__clear">Filtreyi Temizle</Link>
        </div>
      )}

      <div className="home-layout">
        <div className="home-content">
          {/* ── Content ── */}
          {loading ? (
            <div className="blog-grid">
              {Array.from({ length: 6 }).map((_, i) => (
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
              Henüz hiç yazı yok.{' '}
              {isAuthenticated && (
                <Link to="/new-blog" className="auth-link">İlk yazıyı siz oluşturun →</Link>
              )}
            </div>
          ) : (
            <>
              <div className="blog-grid">
                {blogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    isAuthenticated={isAuthenticated}
                    isFavorited={favoriteIds.has(String(blog.id))}
                    favoriteLoading={favoriteLoadingId === blog.id}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
              {loadingMore && (
                <div className="home-load-more">
                  <LoadingSpinner size="sm" centered={false} />
                </div>
              )}
              {hasMore && !error && <div ref={loadMoreRef} className="home-load-sentinel" aria-hidden="true" />}
            </>
          )}
        </div>

        <aside className="tags-sidebar" aria-label="Güncel etiketler">
          <div className="tags-sidebar__inner">
            <h2 className="tags-sidebar__title">Güncel Etiketler</h2>
            {recentTags.length > 0 ? (
              <div className="tags-sidebar__list">
                {recentTags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/?tag=${encodeURIComponent(tag)}`}
                    className="tags-sidebar__tag tags-sidebar__tag--link"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="tags-sidebar__empty">Etiketler burada görünecek.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
