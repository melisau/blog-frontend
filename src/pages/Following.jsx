import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import Avatar from '../components/Avatar'
import SEO from '../components/SEO'

// ── Component ─────────────────────────────────────────────────────────────────

export default function Following() {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [removing, setRemoving] = useState(null)

  const fetchFollowing = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axiosInstance.get('/users/me/following')
      const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
      setUsers(list)
    } catch {
      setError('Takip listesi yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFollowing() }, [fetchFollowing])

  async function handleUnfollow(userId) {
    setRemoving(userId)
    try {
      await axiosInstance.delete(`/users/me/following/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch { /* toast shown by interceptor */ }
    finally { setRemoving(null) }
  }

  return (
    <div className="page-container page-container--narrow">
      <SEO title="Takip Edilenler" description="Takip ettiğin kullanıcılar." />

      <h1 className="library-title">Takip Edilenler</h1>

      {loading ? (
        <div className="following-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="following-card following-card--skeleton">
              <div className="skeleton-block" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-line" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="auth-server-error" role="alert">{error}</div>
      ) : users.length === 0 ? (
        <div className="comments-empty">
          Henüz kimseyi takip etmiyorsunuz.{' '}
          <Link to="/" className="auth-link">Yazarları keşfedin →</Link>
        </div>
      ) : (
        <div className="following-list">
          {users.map((u) => (
            <div key={u.id} className="following-card">
              <Avatar
                userId={u.id}
                username={u.username}
                size="md"
                iconId={u.icon_id ?? null}
              />
              <div className="following-card__info">
                <Link to={`/profile/${u.id}`} className="following-card__name">
                  {u.username}
                </Link>
                {u.created_at && (
                  <span className="following-card__meta">
                    {new Date(u.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} tarihinde katıldı
                  </span>
                )}
              </div>
              <button
                className="following-card__unfollow"
                onClick={() => handleUnfollow(u.id)}
                disabled={removing === u.id}
                aria-label={`${u.username} takibini bırak`}
              >
                {removing === u.id ? '…' : 'Takibi Bırak'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
