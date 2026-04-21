import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import BlogCard from '../components/BlogCard'
import Pagination from '../components/Pagination'
import SEO from '../components/SEO'
import { extractTags, toPlainExcerpt } from '../utils/blogText'

const POSTS_PER_PAGE = 6

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

function matchesQuery(blog, q) {
  if (!q) return true
  const query = q.toLocaleLowerCase('tr-TR')
  const text = [
    blog.title ?? '',
    blog.excerpt ?? '',
    typeof blog.category === 'string' ? blog.category : (blog.category?.name ?? ''),
    ...extractTags(blog),
  ].join(' ').toLocaleLowerCase('tr-TR')
  return text.includes(query)
}

function extractPage(data, page, limit, category, tag, query, headers = {}) {
  // 1. Try to get total from headers first (common in many APIs)
  const headerTotal = headers['x-total-count'] ?? headers['X-Total-Count'] ?? headers['total-count']
  
  if (Array.isArray(data)) {
    let filtered = data
    if (category) {
      filtered = filtered.filter((b) => {
        const cat = typeof b.category === 'string' ? b.category : (b.category?.name ?? null)
        return cat === category
      })
    }
    if (tag) {
      filtered = filtered.filter((b) => {
        const tags = extractTags(b)
        return tags.includes(tag)
      })
    }
    if (query) {
      filtered = filtered.filter((b) => matchesQuery(normalizeBlog(b), query))
    }

    const totalCount = headerTotal ? parseInt(headerTotal, 10) : filtered.length
    
    // If we have a header total, we assume the data is already paginated by the backend
    if (headerTotal) {
      return {
        blogs:      filtered.map(normalizeBlog),
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      }
    }

    const start = (page - 1) * limit
    return {
      blogs:      filtered.slice(start, start + limit).map(normalizeBlog),
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    }
  }

  const list = data.items ?? data.results ?? data.blogs ?? data.posts ?? data.data ?? data.content ?? []
  const total = data.total ?? data.count ?? data.total_count ?? data.totalCount ?? data.total_items ?? data.totalItems ?? headerTotal ?? list.length
  const pages = data.total_pages ?? data.totalPages ?? data.pages ?? data.total_page ?? data.totalPage ?? Math.max(1, Math.ceil(Number(total) / limit))

  let blogs = list.map(normalizeBlog)
  if (query && list.length > 0 && !data.query_applied && !data.search_applied) {
    const filtered = blogs.filter(b => matchesQuery(b, query))
    if (filtered.length < blogs.length) blogs = filtered
  }

  return {
    blogs,
    totalPages: pages,
  }
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const activeCategory = searchParams.get('category')
  const activeTag      = searchParams.get('tag')
  const query          = searchParams.get('q')?.trim() ?? ''

  const [blogs,      setBlogs]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [recentTags, setRecentTags] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)

  // Fetch blogs on mount and when filters or page change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const params = { page, limit: POSTS_PER_PAGE }
    if (activeCategory) params.category = activeCategory
    if (activeTag)      params.tag = activeTag
    if (query)          params.q = query

    axiosInstance
      .get('/blogs', { params })
      .then(async (response) => {
        if (cancelled) return
        const { data, headers } = response
        const { blogs: list, totalPages: pages } = extractPage(data, page, POSTS_PER_PAGE, activeCategory, activeTag, query, headers)
        
        // Resolve author names for blogs that don't have them
        const missingUids = [...new Set(list.filter((b) => !b.author && b.authorId).map((b) => b.authorId))]
        const authorMap = {}
        
        if (missingUids.length > 0) {
          try {
            const results = await Promise.all(missingUids.map((id) => axiosInstance.get(`/users/${id}`)))
            results.forEach(({ data: u }) => {
              authorMap[u.id] = {
                username: u.username ?? u.name ?? u.full_name ?? null,
                iconId: u.icon_id ?? u.iconId ?? null,
              }
            })
          } catch { /* fail silently */ }
        }

        setBlogs(list.map((b) => ({
          ...b,
          author: b.author ?? (b.authorId && authorMap[b.authorId]
            ? {
                username: authorMap[b.authorId].username,
                iconId: authorMap[b.authorId].iconId,
              }
            : null),
        })))
        setTotalPages(pages)
      })
      .catch(() => { if (!cancelled) setError('Yazılar yüklenemedi. Lütfen sayfayı yenileyin.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, activeCategory, activeTag, query])

  // Reset to first page when filters change
  useEffect(() => { setPage(1) }, [activeCategory, activeTag, query])

  useEffect(() => {
    let cancelled = false
    axiosInstance
      .get('/blogs', { params: { page: 1, limit: 100 } })
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
              {Array.from({ length: POSTS_PER_PAGE }).map((_, i) => (
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
              <Pagination page={page} totalPages={totalPages} setPage={setPage} />
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
