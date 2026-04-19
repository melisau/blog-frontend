import { Link, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'

export default function BlogCard({ blog, isAuthenticated = false, isFavorited = false, favoriteLoading = false, onToggleFavorite }) {
  const navigate = useNavigate()

  return (
    <article
      className="blog-card"
      onClick={() => navigate(`/blogs/${blog.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/blogs/${blog.id}`)}
    >
      {isAuthenticated && (
        <button
          type="button"
          className={`blog-card__favorite${isFavorited ? ' blog-card__favorite--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite?.(blog.id)
          }}
          disabled={favoriteLoading}
          title={isFavorited ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          aria-label={isFavorited ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill={isFavorited ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      )}

      {blog.imageUrl && (
        <img src={blog.imageUrl} alt={blog.title} className="blog-card__thumb" />
      )}
      <div className="blog-card__body">
        {blog.author && (
          <div className="blog-card__author-row">
            <Avatar
              userId={blog.authorId}
              username={blog.author.username}
              size="sm"
              iconId={blog.author.iconId ?? null}
            />
            <Link
              to={`/profile/${blog.authorId}`}
              className="blog-card__author blog-card__author--link"
              onClick={(e) => e.stopPropagation()}
            >
              {blog.author.username}
            </Link>
          </div>
        )}

        <h2 className="blog-card__title">{blog.title}</h2>
        <p className="blog-card__excerpt">{blog.excerpt}</p>
        <div className="blog-card__tags">
          {blog.category && (
            <Link
              to={`/?category=${encodeURIComponent(blog.category)}`}
              className="blog-card__tag blog-card__tag--link"
              onClick={(e) => e.stopPropagation()}
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
            >
              #{t}
            </Link>
          ))}
          {!blog.category && blog.tags.length === 0 && (
            <span className="blog-card__tag">Genel</span>
          )}
        </div>

        <div className="blog-card__footer">
          <span className="blog-card__date">{blog.date}</span>
        </div>
        <span className="blog-card__read">Devamını Oku →</span>
      </div>
    </article>
  )
}
