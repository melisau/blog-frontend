import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import BlogCard from '../components/BlogCard'
import Pagination from '../components/Pagination'
import SEO from '../components/SEO'

const POSTS_PER_PAGE = 6

// ── Normalisers ──────────────────────────────────────────────────────────────

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

  const rawExcerpt = raw.excerpt ?? raw.summary ?? raw.description ?? raw.content ?? raw.body ?? ''
  const excerpt = rawExcerpt.length > 150 ? rawExcerpt.slice(0, 150).trimEnd() + '…' : rawExcerpt

  const embeddedName = raw.author?.username ?? raw.author?.name ?? raw.author_name ?? raw.owner_name ?? null

  return {
    id:       raw.id,
    title:    raw.title ?? raw.name ?? raw.headline ?? '(Başlıksız)',
    excerpt,
    date,
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags:     extractTags(raw),
    authorId: raw.author?.id ?? raw.author_id ?? null,
    author:   embeddedName ? { username: embeddedName } : null,
    imageUrl: raw.image_url ?? raw.imageUrl ?? null,
  }
}

function extractPage(data, page, limit, category, tag) {
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

    const start = (page - 1) * limit
    return {
      blogs:      filtered.slice(start, start + limit).map(normalizeBlog),
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    }
  }

  const list = data.items ?? data.results ?? data.blogs ?? data.posts ?? data.data ?? []
  const total = data.total ?? data.count ?? data.total_count ?? list.length
  const pages = data.total_pages ?? data.totalPages ?? data.pages ?? Math.max(1, Math.ceil(total / limit))

  return {
    blogs: list.map(normalizeBlog),
    totalPages: pages,
  }
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const activeCategory = searchParams.get('category')
  const activeTag      = searchParams.get('tag')

  const [blogs,      setBlogs]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch blogs on mount and when filters or page change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const params = { page, limit: POSTS_PER_PAGE }
    if (activeCategory) params.category = activeCategory
    if (activeTag)      params.tag = activeTag

    axiosInstance
      .get('/blogs', { params })
      .then(async ({ data }) => {
        if (cancelled) return
        const { blogs: list, totalPages: pages } = extractPage(data, page, POSTS_PER_PAGE, activeCategory, activeTag)
        
        // Resolve author names for blogs that don't have them
        const missingUids = [...new Set(list.filter((b) => !b.author && b.authorId).map((b) => b.authorId))]
        const authorMap = {}
        
        if (missingUids.length > 0) {
          try {
            const results = await Promise.all(missingUids.map((id) => axiosInstance.get(`/users/${id}`)))
            results.forEach(({ data: u }) => {
              authorMap[u.id] = u.username ?? u.name ?? u.full_name ?? null
            })
          } catch { /* fail silently */ }
        }

        setBlogs(list.map((b) => ({
          ...b,
          author: b.author ?? (b.authorId && authorMap[b.authorId] ? { username: authorMap[b.authorId] } : null)
        })))
        setTotalPages(pages)
      })
      .catch(() => { if (!cancelled) setError('Yazılar yüklenemedi. Lütfen sayfayı yenileyin.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, activeCategory, activeTag])

  // Reset to first page when filters change
  useEffect(() => { setPage(1) }, [activeCategory, activeTag])

  return (
    <div className="page-container">
      <SEO 
        title={activeCategory ? `${activeCategory} Kategorisi` : activeTag ? `#${activeTag} Etiketi` : 'Ana Sayfa'}
        description="En son yazıları keşfedin ve topluluğumuza katılın."
      />
      {/* ── Filter Status ── */}
      {(activeCategory || activeTag) && (
        <div className="filter-bar">
          <span className="filter-bar__label">
            {activeCategory ? `Kategori: ${activeCategory}` : `Etiket: #${activeTag}`}
          </span>
          <Link to="/" className="filter-bar__clear">Filtreyi Temizle</Link>
        </div>
      )}

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
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
      )}
    </div>
  )
}
