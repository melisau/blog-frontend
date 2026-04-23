import axiosInstance from '../api/axiosInstance'

const CACHE_TTL_MS = 15_000

let favoritesCache = null
let cacheTimestamp = 0
let inFlightFavoritesPromise = null

function normalizeFavoritesResponse(data) {
  return Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.data ?? [])
}

export async function getMyFavorites({ force = false } = {}) {
  const now = Date.now()
  const hasFreshCache =
    !force &&
    Array.isArray(favoritesCache) &&
    now - cacheTimestamp < CACHE_TTL_MS

  if (hasFreshCache) return favoritesCache
  if (inFlightFavoritesPromise) return inFlightFavoritesPromise

  inFlightFavoritesPromise = axiosInstance
    .get('/users/me/favorites')
    .then(({ data }) => {
      const normalized = normalizeFavoritesResponse(data)
      favoritesCache = normalized
      cacheTimestamp = Date.now()
      return normalized
    })
    .finally(() => {
      inFlightFavoritesPromise = null
    })

  return inFlightFavoritesPromise
}

export function invalidateMyFavoritesCache() {
  favoritesCache = null
  cacheTimestamp = 0
}
