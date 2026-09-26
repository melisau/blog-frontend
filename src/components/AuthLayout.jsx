import { Link } from 'react-router-dom'
import SEO from './SEO'

function BrandMark() {
  return (
    <Link to="/" className="auth-showcase__brand" aria-label="Fitbook ana sayfa">
      <span className="auth-showcase__brand-icon" aria-hidden="true">F</span>
      <span>Fitbook</span>
    </Link>
  )
}

export default function AuthLayout({
  variant,
  seoTitle,
  seoDescription,
  welcomeTitle,
  welcomeDescription,
  children,
}) {
  return (
    <div className={`auth-page auth-page--split auth-page--${variant}`}>
      <SEO title={seoTitle} description={seoDescription} noindex />

      <aside className="auth-showcase" aria-label="Fitbook topluluğu">
        <BrandMark />
        <div className="auth-showcase__copy">
          <span className="auth-showcase__eyebrow">FİKİRLERİN BULUŞMA NOKTASI</span>
          <h2>{welcomeTitle}</h2>
          <p>{welcomeDescription}</p>
        </div>

        <div className="auth-art" aria-hidden="true">
          <span className="auth-art__orb auth-art__orb--large" />
          <span className="auth-art__orb auth-art__orb--small" />
          <span className="auth-art__ring" />
          <span className="auth-art__spark auth-art__spark--one">✳</span>
          <span className="auth-art__spark auth-art__spark--two">✳</span>
          <span className="auth-art__note">Merak et.<br />Yaz. Paylaş.</span>
          <span className="auth-art__topic">Teknoloji · Yaşam · Daha fazlası</span>
        </div>

        <p className="auth-showcase__footer">Fikirler paylaşıldıkça çoğalır.</p>
      </aside>

      <section className="auth-card auth-card--split" aria-label={seoTitle}>
        {children}
      </section>
    </div>
  )
}
