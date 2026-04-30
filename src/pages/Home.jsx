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
import { getMyLibrary, getMyLikes, invalidateLibraryCache, invalidateLikesCache } from '../services/favoritesService'

function normalizeTagValue(value) {
  return String(value ?? '').trim().toLocaleLowerCase('tr')
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function Home() {
  const BATCH_SIZE = 6

  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const activeCategory = searchParams.get('category')
  const activeTag      = searchParams.get('tag')
  const query          = searchParams.get('q')?.trim() ?? ''

  const [recentTags, setRecentTags] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [saveLoadingId, setSaveLoadingId] = useState(null)
  const [likedIds, setLikedIds] = useState(new Set())
  const [likeLoadingId, setLikeLoadingId] = useState(null)

  const { blogs, loading, loadingMore, error, hasMore, loadMoreRef, updateBlogById } = useInfiniteBlogs({
    batchSize: BATCH_SIZE,
    category: activeCategory,
    tag: activeTag,
    query,
  })

  useEffect(() => {
    const controller = new AbortController()

    async function fetchRecentTags() {
      try {
        const { data } = await axiosInstance.get('/blogs', {
          params: { limit: 100 },
          signal: controller.signal,
        })
        const list = extractBlogList(data)
        const counts = new Map()
        list.forEach((b) => {
          extractTags(b).forEach((tag) => {
            counts.set(tag, (counts.get(tag) ?? 0) + 1)
          })
        })
        const stableTags = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'tr'))
          .slice(0, 10)
          .map(([tag]) => tag)
        setRecentTags(stableTags)
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
        setRecentTags([])
      }
    }

    fetchRecentTags()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedIds(new Set())
      setLikedIds(new Set())
      return
    }
    let cancelled = false
    
    // Fetch Library
    getMyLibrary()
      .then((list) => {
        if (!cancelled) setSavedIds(new Set(list.map((b) => String(b.id))))
      })
      .catch(() => {})

    // Fetch Likes
    getMyLikes()
      .then((list) => {
        if (!cancelled) setLikedIds(new Set(list.map((b) => String(b.id))))
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [isAuthenticated])

  async function handleToggleSave(blogId) {
    if (!isAuthenticated || saveLoadingId) return
    const key = String(blogId)
    const currentlySaved = savedIds.has(key)
    setSaveLoadingId(blogId)
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (currentlySaved) next.delete(key)
      else next.add(key)
      return next
    })
    updateBlogById(blogId, (blog) => ({
      ...blog,
      saveCount: Math.max(0, (blog.saveCount ?? 0) + (currentlySaved ? -1 : 1)),
    }))
    try {
      if (currentlySaved) {
        await axiosInstance.delete(`/users/me/library/${blogId}`)
      } else {
        await axiosInstance.post(`/users/me/library/${blogId}`)
      }
      invalidateLibraryCache()
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (currentlySaved) next.add(key)
        else next.delete(key)
        return next
      })
      updateBlogById(blogId, (blog) => ({
        ...blog,
        saveCount: Math.max(0, (blog.saveCount ?? 0) + (currentlySaved ? 1 : -1)),
      }))
    }
    finally { setSaveLoadingId(null) }
  }

  async function handleToggleLike(blogId) {
    if (!isAuthenticated || likeLoadingId) return
    const key = String(blogId)
    const currentlyLiked = likedIds.has(key)
    setLikeLoadingId(blogId)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (currentlyLiked) next.delete(key)
      else next.add(key)
      return next
    })
    updateBlogById(blogId, (blog) => ({
      ...blog,
      likeCount: Math.max(0, (blog.likeCount ?? 0) + (currentlyLiked ? -1 : 1)),
    }))
    try {
      await axiosInstance.post(`/users/me/likes/${blogId}`)
      invalidateLikesCache()
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (currentlyLiked) next.add(key)
        else next.delete(key)
        return next
      })
      updateBlogById(blogId, (blog) => ({
        ...blog,
        likeCount: Math.max(0, (blog.likeCount ?? 0) + (currentlyLiked ? 1 : -1)),
      }))
    }
    finally { setLikeLoadingId(null) }
  }

  const uniqueRecentTags = [...new Set(recentTags.map((tag) => String(tag).trim()).filter(Boolean))]
  const getTagHref = (tagName) => {
    const normalizedActive = normalizeTagValue(activeTag)
    const normalizedClicked = normalizeTagValue(tagName)
    if (normalizedActive && normalizedClicked === normalizedActive) return '/'
    return `/?tag=${encodeURIComponent(tagName)}`
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
                    isSaved={savedIds.has(String(blog.id))}
                    saveLoading={saveLoadingId === blog.id}
                    onToggleSave={handleToggleSave}
                    isLiked={likedIds.has(String(blog.id))}
                    likeLoading={likeLoadingId === blog.id}
                    onToggleLike={handleToggleLike}
                    getTagHref={getTagHref}
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
            {uniqueRecentTags.length > 0 ? (
              <div className="tags-sidebar__list">
                {uniqueRecentTags.map((tag, i) => (
                  <Link
                    key={`${tag}-${i}`}
                    to={getTagHref(tag)}
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
