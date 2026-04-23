import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '../api/axiosInstance'

function mapCategory(item) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
  }
}

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCategories = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axiosInstance.get('/categories', { signal })
      const list = Array.isArray(data?.items) ? data.items : []
      setCategories(list.map(mapCategory))
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      setError('Kategoriler yüklenemedi. Lütfen tekrar deneyin.')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal)
    return () => controller.abort()
  }, [fetchCategories])

  return {
    categories,
    categoriesLoading: loading,
    categoriesError: error,
    retryCategories: fetchCategories,
  }
}
