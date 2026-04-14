// Home page — public landing page that lists blog posts.
// The toolbar adapts based on auth state: authenticated users see
// "New Post", guests see Login / Register links.
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Blog</h1>
        <p className="page-desc">En son yazıları keşfedin</p>
        {isAuthenticated ? (
          <div className="page-actions">
            <Link to="/new-post" className="btn btn--primary">
              Yeni Yazı
            </Link>
            <button className="btn btn--ghost" onClick={logout}>
              Çıkış Yap
            </button>
          </div>
        ) : (
          <div className="page-actions">
            <Link to="/login"    className="btn btn--primary">Giriş Yap</Link>
            <Link to="/register" className="btn btn--ghost">Kayıt Ol</Link>
          </div>
        )}
      </div>

      {/* Placeholder cards — replaced with real data once the API is connected */}
      <div className="post-grid">
        {[1, 2, 3].map((n) => (
          <Link key={n} to={`/posts/${n}`} className="post-card">
            <div className="post-card__thumb" />
            <div className="post-card__body">
              <span className="post-card__tag">Genel</span>
              <h2 className="post-card__title">Örnek Yazı Başlığı {n}</h2>
              <p className="post-card__excerpt">
                Bu alan, blog yazısının kısa bir özetini gösterir. Backend bağlandığında
                gerçek verilerle dolacak.
              </p>
              <span className="post-card__read">Devamını Oku →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
