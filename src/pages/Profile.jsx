// Profile page — displays public information for a user identified by :id.
// This route is intentionally public so posts can be shared and authors
// can be discovered without requiring a login.
import { useParams, Link } from 'react-router-dom'

export default function Profile() {
  // id comes from the URL segment defined in App.jsx as /profile/:id
  const { id } = useParams()

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">← Ana Sayfa</Link>

      {/* User info card — populated from GET /users/:id once API is connected */}
      <div className="profile-card">
        <div className="profile-avatar" />
        <div className="profile-info">
          <h1 className="post-article__title" style={{ margin: '0 0 4px' }}>
            Kullanıcı #{id}
          </h1>
          <p className="auth-subtitle">Üye · Nisan 2026</p>
        </div>
      </div>

      {/* Post list — will be fetched from GET /posts?author=:id */}
      <div className="profile-posts">
        <h2 className="profile-section-title">Yazılar</h2>
        <div className="post-grid">
          {[1, 2].map((n) => (
            <Link key={n} to={`/posts/${n}`} className="post-card">
              <div className="post-card__thumb" />
              <div className="post-card__body">
                <span className="post-card__tag">Genel</span>
                <h2 className="post-card__title">Örnek Yazı Başlığı {n}</h2>
                <p className="post-card__excerpt">
                  Backend bağlandığında bu kullanıcıya ait yazılar listelenecek.
                </p>
                <span className="post-card__read">Devamını Oku →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
