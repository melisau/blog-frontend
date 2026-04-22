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

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axiosInstance.get('/categories')
      const list = Array.isArray(data?.items) ? data.items : []
      setCategories(list.map(mapCategory))
    } catch {
      setError('Kategoriler yüklenemedi. Lütfen tekrar deneyin.')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    categoriesLoading: loading,
    categoriesError: error,
    retryCategories: fetchCategories,
  }
}
