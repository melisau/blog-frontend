export default function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null

  return (
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
  )
}
