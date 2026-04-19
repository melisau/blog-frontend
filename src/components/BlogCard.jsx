import { Link, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import HeartIcon from './icons/HeartIcon'
import BlogCardStats from './BlogCardStats'

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
          <HeartIcon size={16} filled={isFavorited} />
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
          <BlogCardStats favoriteCount={blog.favoriteCount ?? 0} commentCount={blog.commentCount ?? 0} />
          <span className="blog-card__date">{blog.date}</span>
        </div>
        <span className="blog-card__read">Devamını Oku →</span>
      </div>
    </article>
  )
}
