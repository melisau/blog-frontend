import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'

vi.mock('../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

class MockIntersectionObserver {
  static instance = null
  constructor(cb) {
    this.cb = cb
    MockIntersectionObserver.instance = this
  }
  observe() {}
  disconnect() {}
  trigger(isIntersecting = true) {
    this.cb([{ isIntersecting }])
  }
}

function makeBlogs(count, start = 1) {
  return Array.from({ length: count }).map((_, idx) => {
    const id = start + idx
    return {
      id,
      title: `Blog ${id}`,
      excerpt: `Icerik ${id}`,
      content: `Icerik ${id}`,
      author: { id: 10, username: 'melisa' },
      created_at: '2026-04-20T10:00:00Z',
      tags: [],
    }
  })
}

function renderHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.IntersectionObserver = MockIntersectionObserver
    useAuth.mockReturnValue({ isAuthenticated: true })
    axiosInstance.post.mockResolvedValue({ data: {} })
    axiosInstance.delete.mockResolvedValue({ data: {} })
  })

  it('scroll ile sonraki blog batchini getirir', async () => {
    const firstBatch = makeBlogs(6, 1)
    const secondBatch = makeBlogs(2, 7)

    axiosInstance.get.mockImplementation((url, config = {}) => {
      if (url === '/users/me/library') return Promise.resolve({ data: [] })
      if (url === '/users/me/likes') return Promise.resolve({ data: [] })
      if (url === '/blogs' && config?.params?.limit === 100) return Promise.resolve({ data: [] })
      if (url === '/blogs' && config?.params?.skip === 0) return Promise.resolve({ data: { items: firstBatch } })
      if (url === '/blogs' && config?.params?.skip === 6) return Promise.resolve({ data: { items: secondBatch } })
      return Promise.resolve({ data: [] })
    })

    renderHome()
    expect(await screen.findByText('Blog 1')).toBeInTheDocument()

    await act(async () => {
      MockIntersectionObserver.instance.trigger(true)
    })

    expect(await screen.findByText('Blog 7')).toBeInTheDocument()
    expect(axiosInstance.get).toHaveBeenCalledWith('/blogs', expect.objectContaining({
      params: expect.objectContaining({ skip: 6, limit: 6 }),
    }))
  })

  it('kitapliga ekle butonu tiklandiginda endpointi cagirir', async () => {
    axiosInstance.get.mockImplementation((url, config = {}) => {
      if (url === '/users/me/library') return Promise.resolve({ data: [] })
      if (url === '/users/me/likes') return Promise.resolve({ data: [] })
      if (url === '/blogs' && config?.params?.limit === 100) return Promise.resolve({ data: [] })
      if (url === '/blogs' && config?.params?.skip === 0) return Promise.resolve({ data: { items: makeBlogs(1, 1) } })
      return Promise.resolve({ data: { items: [] } })
    })

    renderHome()
    const saveButtons = await screen.findAllByRole('button', { name: 'Kitaplığa ekle' })
    await userEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/users/me/library/1')
    })
  })
})
