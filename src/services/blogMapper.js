import { extractTags, toPlainExcerpt } from '../utils/blogText'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  const date = dateRaw
    ? new Date(dateRaw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

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
    favoriteCount: raw.favorite_count ?? raw.favorites_count ?? raw.like_count ?? raw.likes_count ?? 0,
    commentCount: raw.comment_count ?? raw.comments_count ?? 0,
  }
}

export function normalizeBlogs(data, excerptLength = 150) {
  return extractBlogList(data).map((item) => normalizeBlog(item, excerptLength))
}
