// Avatar — reusable avatar component.
//
// Icon IDs are 1-based to match the backend `icon_id` field on the User model:
//   AVATARS[0].id === 1  …  AVATARS[9].id === 10
//
// Props:
//   userId   — used only as localStorage cache key
//   username — display name for initials fallback
//   iconId   — 1-based icon ID (icon_id from backend); null/undefined → initials
//   size     — 'sm' (36px) | 'md' (48px) | 'lg' (72px)
//   onClick  — makes it a clickable button (shows edit pencil overlay)
//
// Storage strategy:
//   Source of truth : backend `icon_id` field, passed as `iconId` prop
//   Cache           : localStorage `avatar_${userId}` for instant first render
//   Write-through   : call saveAvatarCache() whenever the icon changes locally

const W = 'white'

// ── 10 predefined icons — id matches backend icon_id (1-based) ───────────────

export const AVATARS = [
  {
    id: 1, label: 'Dalga', color: '#3b82f6',
    svg: (
      <>
        <path d="M3 9c1.5-2.5 3-2.5 4.5 0S10.5 11.5 12 9s3-2.5 4.5 0S19.5 11.5 21 9"
          stroke={W} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M3 15c1.5-2.5 3-2.5 4.5 0S10.5 17.5 12 15s3-2.5 4.5 0S19.5 17.5 21 15"
          stroke={W} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      </>
    ),
  },
  {
    id: 2, label: 'Yaprak', color: '#16a34a',
    svg: (
      <>
        <path d="M12 3C9 6 5 9.5 5 14a7 7 0 0014 0c0-4.5-4-8-7-11z" fill={W}/>
        <line x1="12" y1="14" x2="12" y2="21"
          stroke={W} strokeWidth="2.2" strokeLinecap="round"/>
      </>
    ),
  },
  {
    id: 3, label: 'Güneş', color: '#ea580c',
    svg: (
      <>
        <circle cx="12" cy="12" r="3.5" fill={W}/>
        {[
          [12,2,12,5.5],[12,18.5,12,22],
          [2,12,5.5,12],[18.5,12,22,12],
          [5.6,5.6,7.8,7.8],[16.2,16.2,18.4,18.4],
          [18.4,5.6,16.2,7.8],[7.8,16.2,5.6,18.4],
        ].map(([x1,y1,x2,y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={W} strokeWidth="2" strokeLinecap="round"/>
        ))}
      </>
    ),
  },
  {
    id: 4, label: 'Yıldız', color: '#9333ea',
    svg: (
      <polygon
        points="12,2 14.6,9 22,9 16.4,13.5 18.5,21 12,16.8 5.5,21 7.6,13.5 2,9 9.4,9"
        fill={W}/>
    ),
  },
  {
    id: 5, label: 'Kalp', color: '#db2777',
    svg: (
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={W}/>
    ),
  },
  {
    id: 6, label: 'Damla', color: '#0d9488',
    svg: <path d="M12 2C12 2 5 11 5 15a7 7 0 0014 0C19 11 12 2 12 2z" fill={W}/>,
  },
  {
    id: 7, label: 'Alev', color: '#dc2626',
    svg: (
      <path
        d="M12 2c0 3.5-4 7-4 12a4 4 0 008 0c0-3-1.5-5.5-2.5-7.5C13 9 13 12 11.5 13.5 12.5 10.5 12 6.5 12 2z"
        fill={W}/>
    ),
  },
  {
    id: 8, label: 'Şimşek', color: '#d97706',
    svg: <polygon points="13,2 5,13.5 12,13.5 11,22 19,10.5 12,10.5" fill={W}/>,
  },
  {
    id: 9, label: 'Ay', color: '#4f46e5',
    svg: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={W}/>,
  },
  {
    id: 10, label: 'Elmas', color: '#e11d48',
    svg: (
      <>
        <path d="M12 3L3 9l9 12 9-12L12 3z" fill={W}/>
        <line x1="3" y1="9" x2="21" y2="9" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
      </>
    ),
  },
]

// ── Lookup ────────────────────────────────────────────────────────────────────

// Returns the AVATARS entry for a given 1-based icon_id, or null.
export function getAvatarById(iconId) {
  if (!iconId) return null
  return AVATARS.find((a) => a.id === Number(iconId)) ?? null
}

// ── localStorage cache ────────────────────────────────────────────────────────

const cacheKey = (uid) => `avatar_${uid}`

export function getCachedIconId(userId) {
  if (!userId) return null
  const n = parseInt(localStorage.getItem(cacheKey(userId)), 10)
  return Number.isFinite(n) && n >= 1 && n <= AVATARS.length ? n : null
}

export function saveAvatarCache(userId, iconId) {
  if (userId == null) return
  if (iconId == null) localStorage.removeItem(cacheKey(userId))
  else localStorage.setItem(cacheKey(userId), String(iconId))
}

// Backward-compat aliases (Profile.jsx imported these names before)
export const getAvatarChoice  = getCachedIconId
export const saveAvatarChoice = saveAvatarCache

// ── Initials ──────────────────────────────────────────────────────────────────

export function getInitials(username) {
  if (!username) return '?'
  const parts = username.trim().split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : username.slice(0, 2).toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────

const PX = { sm: 36, md: 48, lg: 72 }

export default function Avatar({ userId, username, size = 'md', iconId, onClick }) {
  const px = PX[size] ?? PX.md

  // Source of truth: iconId prop.  If not provided, fall back to localStorage cache.
  const resolvedId = (iconId !== undefined && iconId !== null)
    ? Number(iconId)
    : getCachedIconId(userId)

  const av       = getAvatarById(resolvedId)
  const initials = getInitials(username)

  return (
    <div
      className={[
        'avatar-c',
        `avatar-c--${size}`,
        av     ? 'avatar-c--icon' : '',
        onClick ? 'avatar-c--btn'  : '',
      ].filter(Boolean).join(' ')}
      style={av ? { background: av.color } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={onClick ? 'Avatarı değiştir' : `${username ?? 'Kullanıcı'} avatarı`}
      title={onClick ? 'Avatarı değiştir' : undefined}
    >
      {av ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"
          style={{ width: px * 0.54, height: px * 0.54 }}>
          {av.svg}
        </svg>
      ) : (
        <span aria-hidden="true" style={{ fontSize: px * 0.34 }}>
          {initials}
        </span>
      )}

      {onClick && (
        <span className="avatar-c__edit-overlay" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
              stroke={W} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </div>
  )
}
