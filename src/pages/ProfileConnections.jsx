import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import Avatar from '../components/Avatar'
import SEO from '../components/SEO'
import LoadingSpinner from '../components/LoadingSpinner'

const PAGE_SIZE = 20

function normalizeUsers(data) {
  const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
  return list.filter((user) => user?.id != null)
}

export default function ProfileConnections() {
  const { id } = useParams()
  const location = useLocation()
  const isFollowersPage = location.pathname.endsWith('/followers')
  const endpoint = isFollowersPage ? 'followers' : 'following'

  const [profileName, setProfileName] = useState('')
  const [users, setUsers] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(true)

  const title = useMemo(
    () => (isFollowersPage ? 'Takipçiler' : 'Takip Edilenler'),
    [isFollowersPage],
  )

  useEffect(() => {
    let cancelled = false
    axiosInstance
      .get(`/users/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        const username = data?.username ?? data?.name ?? data?.full_name ?? ''
        setProfileName(username)
      })
      .catch(() => {
        if (!cancelled) setProfileName('')
      })
    return () => { cancelled = true }
  }, [id])

  async function fetchPage(skip, append = false) {
    if (!id) return
    if (append) setLoadingMore(true)
    else {
      setInitialLoading(true)
      setError('')
    }

    try {
      const { data } = await axiosInstance.get(`/users/${id}/${endpoint}`, {
        params: { skip, limit: PAGE_SIZE },
      })
      const nextUsers = normalizeUsers(data)
      setUsers((prev) => (append ? [...prev, ...nextUsers] : nextUsers))
      setHasMore(nextUsers.length === PAGE_SIZE)
    } catch {
      if (!append) setError(`${title} listesi yüklenemedi.`)
    } finally {
      if (append) setLoadingMore(false)
      else setInitialLoading(false)
    }
  }

  useEffect(() => {
    setUsers([])
    setHasMore(true)
    fetchPage(0, false)
  }, [id, endpoint])

  return (
    <div className="page-container page-container--narrow">
      <SEO
        title={`${title}${profileName ? ` - ${profileName}` : ''}`}
        description={`${title} listesini görüntüleyin.`}
      />

      <Link to={`/profile/${id}`} className="back-link" aria-label="Profile geri dön">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Link>

      <h1 className="library-title">{title}</h1>

      {initialLoading ? (
        <div className="following-list">
          {Array.from({ length: 5 }).map((_, i) => (
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
          Bu listede henüz kullanıcı yok.
        </div>
      ) : (
        <>
          <div className="following-list">
            {users.map((u) => (
              <Link key={u.id} to={`/profile/${u.id}`} className="following-card following-card--link">
                <Avatar
                  userId={u.id}
                  username={u.username ?? `Kullanıcı #${u.id}`}
                  size="md"
                  iconId={u.icon_id ?? u.iconId ?? null}
                />
                <div className="following-card__info">
                  <span className="following-card__name">
                    {u.username ?? `Kullanıcı #${u.id}`}
                  </span>
                  {u.created_at && (
                    <span className="following-card__meta">
                      {new Date(u.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} tarihinde katıldı
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="home-load-more" style={{ marginTop: 14 }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => fetchPage(users.length, true)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Yükleniyor…' : 'Daha Fazla Göster'}
              </button>
            </div>
          )}
          {loadingMore && (
            <div className="home-load-more">
              <LoadingSpinner size="sm" centered={false} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
