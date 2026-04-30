import axiosInstance from '../api/axiosInstance'

const CACHE_TTL_MS = 15_000

let libraryCache = null
let libraryCacheTimestamp = 0
let inFlightLibraryPromise = null

let likesCache = null
let likesCacheTimestamp = 0
let inFlightLikesPromise = null

function normalizeResponse(data) {
  return Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
}

export async function getMyLibrary({ force = false } = {}) {
  const now = Date.now()
  const hasFreshCache =
    !force &&
    Array.isArray(libraryCache) &&
    now - libraryCacheTimestamp < CACHE_TTL_MS

  if (hasFreshCache) return libraryCache
  if (inFlightLibraryPromise) return inFlightLibraryPromise

  inFlightLibraryPromise = axiosInstance
    .get('/users/me/library')
    .then(({ data }) => {
      const normalized = normalizeResponse(data)
      libraryCache = normalized
      libraryCacheTimestamp = Date.now()
      return normalized
    })
    .finally(() => {
      inFlightLibraryPromise = null
    })

  return inFlightLibraryPromise
}

export async function getMyLikes({ force = false } = {}) {
  const now = Date.now()
  const hasFreshCache =
    !force &&
    Array.isArray(likesCache) &&
    now - likesCacheTimestamp < CACHE_TTL_MS

  if (hasFreshCache) return likesCache
  if (inFlightLikesPromise) return inFlightLikesPromise

  inFlightLikesPromise = axiosInstance
    .get('/users/me/likes')
    .then(({ data }) => {
      const normalized = normalizeResponse(data)
      likesCache = normalized
      likesCacheTimestamp = Date.now()
      return normalized
    })
    .finally(() => {
      inFlightLikesPromise = null
    })

  return inFlightLikesPromise
}

export function invalidateLibraryCache() {
  libraryCache = null
  libraryCacheTimestamp = 0
}

export function invalidateLikesCache() {
  likesCache = null
  likesCacheTimestamp = 0
}

// Backward compatibility aliases
export const getMyFavorites = getMyLibrary
export const invalidateMyFavoritesCache = invalidateLibraryCache
