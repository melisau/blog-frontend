// Home page — fetches and paginates blog posts from GET /blogs.
import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'

const POSTS_PER_PAGE = 6

// Updates or creates the <meta name="description"> tag in <head>.
function setMetaDescription(content) {
  let el = document.querySelector('meta[name="description"]')
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', 'description')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// normalizeBlog — maps any backend field-name convention to the shape the UI
// expects.  Handles both camelCase and snake_case, plain arrays and paginated
// response envelopes ({ items, results, blogs, data }).
// extractTags — converts any tag format the backend might return into a clean
// string array. Handles: plain string array, object array ({id,name}), comma
// separated string, or a single string.
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
    ? new Date(dateRaw).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  const rawExcerpt =
    raw.excerpt ?? raw.summary ?? raw.description ?? raw.content ?? raw.body ?? ''
  const excerpt =
    rawExcerpt.length > 150 ? rawExcerpt.slice(0, 150).trimEnd() + '…' : rawExcerpt

  // Prefer an embedded author object; otherwise fall back to author_name string.
  // authorId is kept so the useEffect can later resolve the username via GET /users/{id}.
  const embeddedName =
    raw.author?.username ?? raw.author?.name ??
    raw.author_name ?? raw.owner_name ?? null

  return {
    id:       raw.id,
    title:    raw.title ?? raw.name ?? raw.headline ?? '(Başlıksız)',
    excerpt,
    date,
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags:     extractTags(raw),
    authorId: raw.author?.id ?? raw.author_id ?? null,
    author:   embeddedName ? { username: embeddedName } : null,
  }
}

// extractPage — handles different paginated response envelopes.
// Returns { blogs, totalPages }.
function extractPage(data, page, limit) {
  // Plain array — no pagination metadata from server, paginate client-side.
  if (Array.isArray(data)) {
    const start = (page - 1) * limit
    return {
      blogs:      data.slice(start, start + limit).map(normalizeBlog),
      totalPages: Math.max(1, Math.ceil(data.length / limit)),
    }
  }

  // Common paginated envelopes
  const list =
    data.items   ??
    data.results ??
    data.blogs   ??
    data.posts   ??
    data.data    ??
    []

  const total =
    data.total     ??
    data.count     ??
    data.total_count ??
    list.length

  const pages =
    data.total_pages ??
    data.totalPages  ??
    data.pages       ??
    Math.max(1, Math.ceil(total / limit))

  return {
    blogs:      list.map(normalizeBlog),
    totalPages: pages,
  }
}

export default function Home() {
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Active filter values read directly from URL — makes links shareable & crawlable.
  const activeCategory = searchParams.get('category') ?? ''
  const activeTag      = searchParams.get('tag') ?? ''

  const [page,       setPage]       = useState(1)
  const [blogs,      setBlogs]      = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1) }, [activeCategory, activeTag])

  // Update document title and meta description based on active filter.
  // This is the single highest-impact SEO change for a React SPA —
  // Google reads <title> even when JS-rendered.
  useEffect(() => {
    if (activeCategory) {
      document.title = `${activeCategory} Yazıları | Blog`
      setMetaDescription(`${activeCategory} kategorisindeki tüm blog yazıları.`)
    } else if (activeTag) {
      document.title = `#${activeTag} | Blog`
      setMetaDescription(`"${activeTag}" etiketiyle ilgili blog yazıları.`)
    } else {
      document.title = 'Blog | En Son Yazılar'
      setMetaDescription('En güncel blog yazılarını keşfedin.')
    }
  }, [activeCategory, activeTag])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    // GET /blogs — pass category/tag filters so the backend can handle them.
    // If the backend ignores unknown params the full list still loads.
    const skip = (page - 1) * POSTS_PER_PAGE
    const params = new URLSearchParams({
      skip,
      limit: POSTS_PER_PAGE,
      page,
      ...(activeCategory && { category: activeCategory }),
      ...(activeTag      && { tag: activeTag }),
    })
    axiosInstance
      .get(`/blogs?${params}`)
      .then(async ({ data }) => {
        if (cancelled) return
        const { blogs: list, totalPages: tp } = extractPage(data, page, POSTS_PER_PAGE)
        setTotalPages(tp)

        // Resolve author usernames: collect unique author IDs that have no embedded name,
        // then fetch GET /users/{id} for each in parallel.
        const unresolvedIds = [
          ...new Set(list.filter((b) => !b.author && b.authorId).map((b) => b.authorId)),
        ]

        const authorMap = {}
        await Promise.allSettled(
          unresolvedIds.map((uid) =>
            axiosInstance.get(`/users/${uid}`).then(({ data: u }) => {
              authorMap[uid] = u.username ?? u.name ?? u.full_name ?? null
            })
          )
        )

        // Merge resolved names back into the blog list.
        const enriched = list.map((b) => ({
          ...b,
          author:
            b.author ??
            (b.authorId && authorMap[b.authorId]
              ? { username: authorMap[b.authorId] }
              : null),
        }))

        if (!cancelled) setBlogs(enriched)
      })
      .catch(() => {
        if (!cancelled) setError('Bloglar yüklenemedi. Lütfen tekrar deneyin.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, activeCategory, activeTag])

  return (
    <div className="page-container">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Blog</h1>
        <p className="page-desc">En son yazıları keşfedin</p>
        {isAuthenticated ? (
          <div className="page-actions">
            <Link to="/new-blog" className="btn btn--primary">Yeni Yazı</Link>
            {user?.id && (
              <Link to={`/profile/${user.id}`} className="btn btn--ghost">Profilim</Link>
            )}
            <button className="btn btn--ghost" onClick={logout}>Çıkış Yap</button>
          </div>
        ) : (
          <div className="page-actions">
            <Link to="/login"    className="btn btn--primary">Giriş Yap</Link>
            <Link to="/register" className="btn btn--ghost">Kayıt Ol</Link>
          </div>
        )}
      </div>

      {/* ── Active filter indicator ───────────────────────────── */}
      {(activeCategory || activeTag) && (
        <div className="filter-bar">
          <span className="filter-bar__label">Filtre:</span>
          {activeCategory && (
            <span className="blog-card__tag">
              {activeCategory}
            </span>
          )}
          {activeTag && (
            <span className="blog-card__tag blog-card__tag--outline">
              #{activeTag}
            </span>
          )}
          <button
            className="filter-bar__clear"
            onClick={() => { setSearchParams({}); setPage(1) }}
            aria-label="Filtreyi temizle"
          >
            × Filtreyi Kaldır
          </button>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="auth-server-error" role="alert" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* ── Blog grid ─────────────────────────────────────────── */}
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
      ) : !error && blogs.length === 0 ? (
        <div className="comments-empty">
          Henüz hiç yazı yok.{' '}
          {isAuthenticated && (
            <Link to="/new-blog" className="auth-link">İlk yazıyı siz oluşturun →</Link>
          )}
        </div>
      ) : (
        <div className="blog-grid">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="blog-card"
              onClick={() => navigate(`/blogs/${blog.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/blogs/${blog.id}`)}
            >
              <div className="blog-card__thumb" />
              <div className="blog-card__body">
                <div className="blog-card__tags">
                  {blog.category && (
                    <Link
                      to={`/?category=${encodeURIComponent(blog.category)}`}
                      className="blog-card__tag blog-card__tag--link"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${blog.category} kategorisindeki yazılar`}
                    >
                      {blog.category}
                    </Link>
                  )}
                  {blog.tags.map((t) => (
                    <Link
                      key={t}
                      to={`/?tag=${encodeURIComponent(t)}`}
                      className="blog-card__tag blog-card__tag--outline blog-card__tag--link"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${t} etiketindeki yazılar`}
                    >
                      #{t}
                    </Link>
                  ))}
                  {!blog.category && blog.tags.length === 0 && (
                    <span className="blog-card__tag">Genel</span>
                  )}
                </div>
                <h2 className="blog-card__title">{blog.title}</h2>
                <p className="blog-card__excerpt">{blog.excerpt}</p>
                <div className="blog-card__footer">
                  {blog.author && blog.authorId ? (
                    <Link
                      to={`/profile/${blog.authorId}`}
                      className="blog-card__author blog-card__author--link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {blog.author.username}
                    </Link>
                  ) : blog.author ? (
                    <span className="blog-card__author">{blog.author.username}</span>
                  ) : null}
                  <span className="blog-card__date">{blog.date}</span>
                </div>
                <span className="blog-card__read">Devamını Oku →</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <nav className="pagination" aria-label="Sayfa navigasyonu">
          <button
            className="pagination__btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            aria-label="Önceki sayfa"
          >
            ← Önceki
          </button>

          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`pagination__page${p === page ? ' pagination__page--active' : ''}`}
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            className="pagination__btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            aria-label="Sonraki sayfa"
          >
            Sonraki →
          </button>
        </nav>
      )}
    </div>
  )
}
