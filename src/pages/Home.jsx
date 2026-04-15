// Home page — fetches and paginates blog posts from GET /blogs.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'

const POSTS_PER_PAGE = 6

// normalizeBlog — maps any backend field-name convention to the shape the UI
// expects.  Handles both camelCase and snake_case, plain arrays and paginated
// response envelopes ({ items, results, blogs, data }).
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
    title:    raw.title ?? '(Başlıksız)',
    excerpt,
    date,
    tag:      raw.category ?? raw.tag ?? raw.tags?.[0] ?? 'Genel',
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
  const { isAuthenticated, logout } = useAuth()

  const [page,       setPage]       = useState(1)
  const [blogs,      setBlogs]      = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    // GET /blogs with both skip/limit (FastAPI default) and page param.
    const skip = (page - 1) * POSTS_PER_PAGE
    axiosInstance
      .get(`/blogs?skip=${skip}&limit=${POSTS_PER_PAGE}&page=${page}`)
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
  }, [page])

  return (
    <div className="page-container">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Blog</h1>
        <p className="page-desc">En son yazıları keşfedin</p>
        {isAuthenticated ? (
          <div className="page-actions">
            <Link to="/new-blog" className="btn btn--primary">Yeni Yazı</Link>
            <button className="btn btn--ghost" onClick={logout}>Çıkış Yap</button>
          </div>
        ) : (
          <div className="page-actions">
            <Link to="/login"    className="btn btn--primary">Giriş Yap</Link>
            <Link to="/register" className="btn btn--ghost">Kayıt Ol</Link>
          </div>
        )}
      </div>

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
            <Link key={blog.id} to={`/blogs/${blog.id}`} className="blog-card">
              <div className="blog-card__thumb" />
              <div className="blog-card__body">
                <span className="blog-card__tag">{blog.tag}</span>
                <h2 className="blog-card__title">{blog.title}</h2>
                <p className="blog-card__excerpt">{blog.excerpt}</p>
                <div className="blog-card__footer">
                  {blog.author && (
                    <span className="blog-card__author">{blog.author.username}</span>
                  )}
                  <span className="blog-card__date">{blog.date}</span>
                </div>
                <span className="blog-card__read">Devamını Oku →</span>
              </div>
            </Link>
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
