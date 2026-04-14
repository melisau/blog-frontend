// PostDetail page — displays a single blog post identified by :id.
// The Edit button is shown only to authenticated users; it links directly
// to the edit form so no separate "can edit?" check is needed here.
// The server will enforce ownership when the PUT request is made.
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PostDetail() {
  // id comes from the URL segment defined in App.jsx as /posts/:id
  const { id } = useParams()
  const { isAuthenticated } = useAuth()

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">← Tüm Yazılar</Link>

      <article className="post-article">
        <div className="post-article__meta">
          <span className="post-card__tag">Genel</span>
          <span className="post-article__date">14 Nisan 2026</span>
        </div>

        <h1 className="post-article__title">Yazı Başlığı #{id}</h1>

        <div className="post-article__author">
          <div className="avatar" />
          {/* Author link navigates to the author's profile page */}
          <Link to={`/profile/${id}`} className="auth-link">Yazar Adı</Link>
        </div>

        {/* Placeholder content — will be fetched from GET /posts/:id */}
        <div className="post-article__content">
          <p>
            Bu alan yazı içeriğini gösterir. Backend entegrasyonu tamamlandığında{' '}
            <code>/posts/{id}</code> endpoint'inden gerçek içerik çekilecek.
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>

        {/* Edit action is conditionally rendered — guests never see it */}
        {isAuthenticated && (
          <div className="post-article__actions">
            <Link to={`/edit-post/${id}`} className="btn btn--ghost">
              Düzenle
            </Link>
          </div>
        )}
      </article>
    </div>
  )
}
