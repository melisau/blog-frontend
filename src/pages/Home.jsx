import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import BlogCard from '../components/BlogCard'
import SEO from '../components/SEO'
import LoadingSpinner from '../components/LoadingSpinner'
import { extractTags, toPlainExcerpt } from '../utils/blogText'
/** @typedef {import('../types/blog').BlogResponse} BlogResponse */

// ── Normalisers ──────────────────────────────────────────────────────────────

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

  const rawExcerpt = raw.excerpt ?? raw.summary ?? raw.description ?? raw.content ?? raw.body ?? ''
  const excerpt = toPlainExcerpt(rawExcerpt, 150)

  const embeddedName = raw.author?.username ?? raw.author?.name ?? raw.author_name ?? raw.owner_name ?? null
  const embeddedIconId = raw.author?.icon_id ?? raw.author?.iconId ?? raw.owner?.icon_id ?? null

  return {
    id:       raw.id,
    title:    raw.title ?? raw.name ?? raw.headline ?? '(Başlıksız)',
    excerpt,
    date,
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags:     extractTags(raw),
    authorId: raw.author?.id ?? raw.author_id ?? null,
    author:   embeddedName ? { username: embeddedName, iconId: embeddedIconId } : null,
    imageUrl: resolveImageUrl(raw.cover_image_url ?? raw.image_url ?? raw.imageUrl ?? null),
    favoriteCount: raw.favorite_count ?? raw.favorites_count ?? raw.like_count ?? raw.likes_count ?? 0,
    commentCount: raw.comment_count ?? raw.comments_count ?? 0,
  }
}

function extractBlogs(data) {
  let list = []
  if (Array.isArray(data)) {
    list = data
  } else {
    list = data.items ?? data.results ?? data.blogs ?? data.posts ?? data.data ?? data.content ?? []
  }
  return list.map(normalizeBlog)
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function Home() {
  const BATCH_SIZE = 6

  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const activeCategory = searchParams.get('category')
  const activeTag      = searchParams.get('tag')
  const query          = searchParams.get('q')?.trim() ?? ''

  const [blogs,      setBlogs]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,      setError]      = useState('')
  const [recentTags, setRecentTags] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)
  const [hasMore, setHasMore] = useState(true)

  const observerRef = useRef(null)
  const loadMoreRef = useRef(null)
  const skipRef = useRef(0)
  const isLoadingRef = useRef(false)
  const hasMoreRef = useRef(true)

  const hydrateAuthors = useCallback(async (list) => {
    const missingUids = [...new Set(list.filter((b) => !b.author && b.authorId).map((b) => b.authorId))]
    if (missingUids.length === 0) return list

    const authorMap = {}
    try {
      const results = await Promise.all(missingUids.map((id) => axiosInstance.get(`/users/${id}`)))
      results.forEach(({ data: u }) => {
        authorMap[u.id] = {
          username: u.username ?? u.name ?? u.full_name ?? null,
          iconId: u.icon_id ?? u.iconId ?? null,
        }
      })
    } catch {
      // Yazar çözümleme başarısızsa kartlar yazarsız gösterilir.
    }

    return list.map((b) => ({
      ...b,
      author: b.author ?? (b.authorId && authorMap[b.authorId]
        ? {
            username: authorMap[b.authorId].username,
            iconId: authorMap[b.authorId].iconId,
          }
        : null),
    }))
  }, [])

  const fetchBlogs = useCallback(async ({ reset = false } = {}) => {
    if (isLoadingRef.current) return
    if (!reset && !hasMoreRef.current) return

    isLoadingRef.current = true
    setError('')

    if (reset) {
      setLoading(true)
      setLoadingMore(false)
      setHasMore(true)
      hasMoreRef.current = true
      skipRef.current = 0
    } else {
      setLoadingMore(true)
    }

    try {
      const params = {
        skip: reset ? 0 : skipRef.current,
        limit: BATCH_SIZE,
      }
      if (activeCategory) params.category = activeCategory
      if (activeTag) params.tag = activeTag
      if (query) params.q = query

      /** @type {{ data: BlogResponse | any[] }} */
      const { data } = await axiosInstance.get('/blogs', { params })
      const rawList = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.blogs ?? data?.posts ?? data?.data ?? data?.content ?? [])
      const normalized = await hydrateAuthors(extractBlogs(data))

      setBlogs((prev) => {
        if (reset) return normalized
        const seen = new Set(prev.map((item) => String(item.id)))
        const next = [...prev]
        normalized.forEach((item) => {
          const id = String(item.id)
          if (!seen.has(id)) {
            seen.add(id)
            next.push(item)
          }
        })
        return next
      })

      const nextHasMore = rawList.length === BATCH_SIZE
      setHasMore(nextHasMore)
      hasMoreRef.current = nextHasMore
      skipRef.current = (reset ? 0 : skipRef.current) + BATCH_SIZE
    } catch {
      setError('Bloglar yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [activeCategory, activeTag, query, hydrateAuthors])

  useEffect(() => {
    fetchBlogs({ reset: true })
  }, [fetchBlogs])

  useEffect(() => {
    if (loading || !hasMore || error) return
    if (!loadMoreRef.current) return

    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingRef.current) {
          fetchBlogs({ reset: false })
        }
      },
      { rootMargin: '140px 0px' }
    )
    observerRef.current.observe(loadMoreRef.current)

    return () => observerRef.current?.disconnect()
  }, [fetchBlogs, hasMore, loading, error])

  useEffect(() => {
    let cancelled = false
    axiosInstance
      .get('/blogs', { params: { limit: 100 } })
      .then(({ data }) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.blogs ?? data?.posts ?? data?.data ?? [])
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
