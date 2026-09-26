import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <span>Fitbook · Fikirler paylaşıldıkça çoğalır.</span>
      <nav aria-label="Alt menü">
        <Link to="/hakkinda">Hakkında ve yayın ilkeleri</Link>
      </nav>
    </footer>
  )
}
