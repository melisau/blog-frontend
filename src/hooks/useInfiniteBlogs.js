import { useCallback, useEffect, useRef, useState } from 'react'
import axiosInstance from '../api/axiosInstance'
import { extractBlogList, normalizeBlogs } from '../services/blogMapper'

function normalizeTagValue(value) {
  return String(value ?? '').trim().toLocaleLowerCase('tr')
}

function matchesActiveTag(blog, activeTag) {
  const wantedTag = normalizeTagValue(activeTag)
  if (!wantedTag) return true
  const tags = Array.isArray(blog?.tags) ? blog.tags : []
  return tags.some((item) => normalizeTagValue(item) === wantedTag)
}

export function useInfiniteBlogs({ batchSize = 6, category, tag, query }) {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(true)

  const loadMoreRef = useRef(null)
  const observerRef = useRef(null)
  const skipRef = useRef(0)
  const hasMoreRef = useRef(true)
  const isLoadingRef = useRef(false)
  const authorCacheRef = useRef(new Map())
  const requestSeqRef = useRef(0)

  const hydrateAuthors = useCallback(async (list) => {
    const missingUids = [...new Set(list.filter((b) => !b.author && b.authorId).map((b) => b.authorId))]
    if (missingUids.length === 0) return list

    const authorMap = {}
    const uncachedIds = []
    missingUids.forEach((id) => {
      const cached = authorCacheRef.current.get(String(id))
      if (cached) authorMap[id] = cached
      else uncachedIds.push(id)
    })

    try {
      if (uncachedIds.length > 0) {
        const results = await Promise.all(uncachedIds.map((id) => axiosInstance.get(`/users/${id}`)))
        results.forEach(({ data: u }) => {
          const payload = {
            username: u.username ?? u.name ?? u.full_name ?? null,
            iconId: u.icon_id ?? u.iconId ?? null,
          }
          authorMap[u.id] = payload
          authorCacheRef.current.set(String(u.id), payload)
        })
      }
    } catch {
      // Yazar bilgisi çözümlenemezse mevcut liste korunur.
    }

    return list.map((b) => ({
      ...b,
      author: b.author ?? (b.authorId && authorMap[b.authorId]
        ? {
            username: authorMap[b.authorId].username,
            iconId: authorMap[b.authorId].iconId,
          }
        : null),
    }))
  }, [])

  const fetchBlogs = useCallback(async ({ reset = false } = {}) => {
    if (isLoadingRef.current) return
    if (!reset && !hasMoreRef.current) return

    isLoadingRef.current = true
    setError('')

    if (reset) {
      setLoading(true)
      setLoadingMore(false)
      setHasMore(true)
      hasMoreRef.current = true
      skipRef.current = 0
    } else {
      setLoadingMore(true)
    }

    try {
      const currentRequest = ++requestSeqRef.current
      const params = { skip: reset ? 0 : skipRef.current, limit: batchSize }
      if (category) params.category = category
      if (tag) params.tag = tag
      if (query) params.q = query

      const { data } = await axiosInstance.get('/blogs', { params })
      const normalized = normalizeBlogs(data)
      const visibleBlogs = tag
        ? normalized.filter((item) => matchesActiveTag(item, tag))
        : normalized
      const rawList = extractBlogList(data)

      setBlogs((prev) => {
        if (reset) return visibleBlogs
        const seen = new Set(prev.map((item) => String(item.id)))
        const next = [...prev]
        visibleBlogs.forEach((item) => {
          const id = String(item.id)
          if (!seen.has(id)) {
            seen.add(id)
            next.push(item)
          }
        })
        return next
      })

      const nextHasMore = rawList.length === batchSize
      setHasMore(nextHasMore)
      hasMoreRef.current = nextHasMore
      skipRef.current = (reset ? 0 : skipRef.current) + batchSize

      hydrateAuthors(visibleBlogs).then((hydrated) => {
        if (requestSeqRef.current !== currentRequest) return
        setBlogs((prev) => {
          const byId = new Map(hydrated.map((item) => [String(item.id), item]))
          return prev.map((item) => byId.get(String(item.id)) ?? item)
        })
      })
    } catch {
      setError('Bloglar yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [batchSize, category, tag, query, hydrateAuthors])

  useEffect(() => {
    fetchBlogs({ reset: true })
  }, [fetchBlogs])

  useEffect(() => {
    if (loading || !hasMore || error || !loadMoreRef.current) return

    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingRef.current) {
          fetchBlogs({ reset: false })
        }
      },
      { rootMargin: '140px 0px' }
    )
    observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [fetchBlogs, hasMore, loading, error])

  return { blogs, loading, loadingMore, error, hasMore, loadMoreRef }
}
