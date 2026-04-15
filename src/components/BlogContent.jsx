import { Link } from 'react-router-dom'
import Avatar from './Avatar'

export default function BlogContent({ 
  blog, 
  isBlogAuthor, 
  onDeleteBlog, 
  deletingBlog 
}) {
  return (
    <article className="blog-article">
      {blog.imageUrl && (
        <div className="blog-article__cover">
          <img src={blog.imageUrl} alt={blog.title} />
        </div>
      )}

      <div className="blog-article__meta">
        <div className="blog-card__tags">
          {blog.category && (
            <Link
              to={`/?category=${encodeURIComponent(blog.category)}`}
              className="blog-card__tag blog-card__tag--link"
            >
              {blog.category}
            </Link>
          )}
          {blog.tags.map((t) => (
            <Link
              key={t}
              to={`/?tag=${encodeURIComponent(t)}`}
              className="blog-card__tag blog-card__tag--outline blog-card__tag--link"
            >
              #{t}
            </Link>
          ))}
          {!blog.category && blog.tags.length === 0 && (
            <span className="blog-card__tag">Genel</span>
          )}
        </div>
        <span className="blog-article__date">{blog.date}</span>
      </div>

      <h1 className="blog-article__title">{blog.title}</h1>

      <div className="blog-article__author">
        <Avatar userId={blog.author.id} username={blog.author.username} size="md" iconId={blog.author.iconId ?? null} />
        <div className="blog-article__author-info">
          {blog.author.username && blog.author.id ? (
            <Link to={`/profile/${blog.author.id}`} className="blog-article__author-name">
              {blog.author.username}
            </Link>
          ) : blog.author.username ? (
            <span className="blog-article__author-name">{blog.author.username}</span>
          ) : null}
          <span className="blog-article__author-date">{blog.date} tarihinde yayınlandı</span>
        </div>
      </div>

      <div className="blog-article__content">
        {blog.content.split('\n\n').map((para, i) => (
          <p key={i}>{para.trim()}</p>
        ))}
      </div>

      {isBlogAuthor && (
        <div className="blog-article__actions">
          <Link to={`/edit-blog/${blog.id}`} className="btn btn--ghost">Düzenle</Link>
          <button
            className="btn btn--danger"
            onClick={onDeleteBlog}
            disabled={deletingBlog}
          >
            {deletingBlog ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      )}
    </article>
  )
}
