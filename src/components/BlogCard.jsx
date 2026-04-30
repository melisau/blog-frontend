import { Link, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import HeartIcon from './icons/HeartIcon'
import BookmarkIcon from './icons/BookmarkIcon'
import BlogCardStats from './BlogCardStats'

export default function BlogCard({
  blog,
  isAuthenticated = false,
  isSaved = false,
  saveLoading = false,
  onToggleSave,
  isLiked = false,
  likeLoading = false,
  onToggleLike,
  getTagHref,
}) {
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
        <>
          <button
            type="button"
            className={`blog-card__save${isSaved ? ' blog-card__save--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave?.(blog.id)
            }}
            disabled={saveLoading}
            title={isSaved ? 'Kitaplıktan çıkar' : 'Kitaplığa ekle'}
            aria-label={isSaved ? 'Kitaplıktan çıkar' : 'Kitaplığa ekle'}
          >
            <BookmarkIcon size={16} filled={isSaved} />
          </button>
          <button
            type="button"
            className={`blog-card__like${isLiked ? ' blog-card__like--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleLike?.(blog.id)
            }}
            disabled={likeLoading}
            title={isLiked ? 'Beğenmekten vazgeç' : 'Beğen'}
            aria-label={isLiked ? 'Beğenmekten vazgeç' : 'Beğen'}
          >
            <HeartIcon size={16} filled={isLiked} />
          </button>
        </>
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
            {blog.authorId ? (
              <Link
                to={`/profile/${blog.authorId}`}
                className="blog-card__author blog-card__author--link"
                onClick={(e) => e.stopPropagation()}
              >
                {blog.author.username}
              </Link>
            ) : (
              <span className="blog-card__author">{blog.author.username}</span>
            )}
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
          {blog.tags.map((t, i) => (
            <Link
              key={`${t}-${i}`}
              to={getTagHref ? getTagHref(t) : `/?tag=${encodeURIComponent(t)}`}
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
          <BlogCardStats likeCount={blog.likeCount ?? 0} commentCount={blog.commentCount ?? 0} />
          <span className="blog-card__date">{blog.date}</span>
        </div>
        <span className="blog-card__read">Devamını Oku →</span>
      </div>
    </article>
  )
}
