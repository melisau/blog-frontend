import axiosInstance from '../api/axiosInstance'

const BLOG_TTL_MS = 10_000
const COMMENTS_TTL_MS = 10_000
const USER_TTL_MS = 60_000

const blogCache = new Map()
const commentsCache = new Map()
const userCache = new Map()

const inFlightBlog = new Map()
const inFlightComments = new Map()
const inFlightUsers = new Map()

function isFresh(entry, ttl) {
  return !!entry && Date.now() - entry.timestamp < ttl
}

function normalizeUser(data) {
  return {
    id: data?.id ?? null,
    username: data?.username ?? data?.name ?? data?.full_name ?? null,
    iconId: data?.icon_id ?? data?.iconId ?? null,
  }
}

export async function getBlogById(blogId, { force = false } = {}) {
  const key = String(blogId)
  const cached = blogCache.get(key)
  if (!force && isFresh(cached, BLOG_TTL_MS)) return cached.value

  if (inFlightBlog.has(key)) return inFlightBlog.get(key)

  const request = axiosInstance
    .get(`/blogs/${blogId}`)
    .then(({ data }) => {
      blogCache.set(key, { value: data, timestamp: Date.now() })
      return data
    })
    .finally(() => {
      inFlightBlog.delete(key)
    })

  inFlightBlog.set(key, request)
  return request
}

export async function getCommentsByBlogId(blogId, { force = false } = {}) {
  const key = String(blogId)
  const cached = commentsCache.get(key)
  if (!force && isFresh(cached, COMMENTS_TTL_MS)) return cached.value

  if (inFlightComments.has(key)) return inFlightComments.get(key)

  const request = axiosInstance
    .get(`/blogs/${blogId}/comments`)
    .then(({ data }) => {
      commentsCache.set(key, { value: data, timestamp: Date.now() })
      return data
    })
    .finally(() => {
      inFlightComments.delete(key)
    })

  inFlightComments.set(key, request)
  return request
}

export async function getUserSummaryById(userId, { force = false } = {}) {
  const key = String(userId)
  const cached = userCache.get(key)
  if (!force && isFresh(cached, USER_TTL_MS)) return cached.value

  if (inFlightUsers.has(key)) return inFlightUsers.get(key)

  const request = axiosInstance
    .get(`/users/${userId}`)
    .then(({ data }) => {
      const normalized = normalizeUser(data)
      userCache.set(key, { value: normalized, timestamp: Date.now() })
      return normalized
    })
    .finally(() => {
      inFlightUsers.delete(key)
    })

  inFlightUsers.set(key, request)
  return request
}
