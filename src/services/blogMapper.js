import { extractTags, toPlainExcerpt } from '../utils/blogText'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function parseBlogDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const raw = value.trim()
  if (!raw) return null

  // Backend bazen UTC zamanı timezone suffix olmadan döndürüyor.
  // Böyle durumda "3 saat önce" kayması olmaması için UTC kabul ediyoruz.
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
  const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const parsed = new Date(hasExplicitTimezone ? normalized : `${normalized}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatBlogDate(dateRaw) {
  if (!dateRaw) return ''
  const date = parseBlogDate(dateRaw)
  if (!date) return ''

  const now = new Date()
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()

  if (isSameDay) {
    const diffMs = now.getTime() - date.getTime()
    if (diffMs <= 0) return 'az önce'
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return 'az önce'
    if (diffMinutes < 60) return `${diffMinutes} dk önce`
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours} saat önce`
  }

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

export function extractBlogList(data) {
  if (Array.isArray(data)) return data
  return data?.items ?? data?.results ?? data?.blogs ?? data?.posts ?? data?.data ?? data?.content ?? []
}

export function normalizeBlog(raw, excerptLength = 150) {
  const dateRaw = raw.created_at ?? raw.createdAt ?? raw.date ?? null
  const date = formatBlogDate(dateRaw)

  const rawExcerpt = raw.excerpt ?? raw.summary ?? raw.description ?? raw.content ?? raw.body ?? ''
  const excerpt = toPlainExcerpt(rawExcerpt, excerptLength)

  const embeddedName = raw.author?.username ?? raw.author?.name ?? raw.author_name ?? raw.owner_name ?? null
  const embeddedIconId = raw.author?.icon_id ?? raw.author?.iconId ?? raw.owner?.icon_id ?? null

  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? raw.headline ?? '(Başlıksız)',
    excerpt,
    date,
    category: typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? null),
    tags: extractTags(raw),
    authorId: raw.author?.id ?? raw.author_id ?? raw.user?.id ?? raw.user_id ?? raw.created_by?.id ?? raw.created_by ?? null,
    author: embeddedName ? { username: embeddedName, iconId: embeddedIconId } : null,
    imageUrl: resolveImageUrl(raw.cover_image_url ?? raw.image_url ?? raw.imageUrl ?? null),
    saveCount: raw.save_count ?? raw.saves_count ?? 0,
    likeCount: raw.like_count ?? raw.likes_count ?? raw.favorite_count ?? raw.favorites_count ?? 0,
    commentCount: raw.comment_count ?? raw.comments_count ?? 0,
  }
}

export function normalizeBlogs(data, excerptLength = 150) {
  return extractBlogList(data).map((item) => normalizeBlog(item, excerptLength))
}
