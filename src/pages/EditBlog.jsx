// EditBlog page — pre-populated form for updating an existing blog post.
// Fetches the blog data and category list on mount.
// Accessible only to authenticated users (PrivateRoute); server enforces ownership.
//
// Endpoints:
//   GET /blogs/{id}    → pre-populate form
//   GET /categories    → populate category dropdown
//   PUT /blogs/{id}    → save changes
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

const FALLBACK_CATEGORIES = ['Teknoloji', 'Genel', 'Yaşam', 'Eğitim', 'Spor', 'Seyahat', 'Yemek', 'Bilim']

function validate(fields) {
  const errors = {}
  if (!fields.title.trim()) errors.title = 'Başlık zorunludur.'
  else if (fields.title.trim().length < 5) errors.title = 'Başlık en az 5 karakter olmalıdır.'
  if (!fields.category) errors.category = 'Kategori seçimi zorunludur.'
  if (!fields.content.trim()) errors.content = 'İçerik zorunludur.'
  else if (fields.content.trim().length < 20) errors.content = 'İçerik en az 20 karakter olmalıdır.'
  return errors
}

export default function EditBlog() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [fields, setFields] = useState({ title: '', category: '', content: '', image_url: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)

  const [categories,        setCategories]        = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Fetch the existing blog to pre-populate the form.
  useEffect(() => {
    axiosInstance
      .get(`/blogs/${id}`)
      .then(({ data }) => {
        setFields({
          title:     data.title     ?? '',
          category:  data.category  ?? data.tag ?? '',
          content:   data.content   ?? data.body ?? '',
          image_url: data.image_url ?? data.imageUrl ?? '',
        })
      })
      .catch(() => setServerError('Yazı yüklenemedi.'))
      .finally(() => setFetching(false))
  }, [id])

  // Fetch categories from GET /categories; fall back to hardcoded list.
  useEffect(() => {
    axiosInstance
      .get('/categories')
      .then(({ data }) => {
        const list  = Array.isArray(data) ? data : (data?.items ?? data?.categories ?? [])
        const names = list.map((c) => (typeof c === 'string' ? c : (c.name ?? c.title ?? String(c))))
        setCategories(names.length > 0 ? names : FALLBACK_CATEGORIES)
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES))
      .finally(() => setCategoriesLoading(false))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setLoading(true)
    setServerError('')
    try {
      await axiosInstance.put(`/blogs/${id}`, {
        title:     fields.title,
        category:  fields.category,
        content:   fields.content,
        image_url: fields.image_url,
      })
      navigate(`/blogs/${id}`)
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
        err.response?.data?.detail  ||
        'Yazı güncellenemedi. Lütfen tekrar deneyin.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="page-container page-container--narrow">
        <div className="skeleton-line skeleton-line--short" style={{ marginBottom: 16 }} />
        <div className="skeleton-line" style={{ height: 40, marginBottom: 12 }} />
        <div className="skeleton-line skeleton-line--long" />
        <div className="skeleton-line skeleton-line--long" style={{ marginTop: 8 }} />
      </div>
    )
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to={`/blogs/${id}`} className="back-link">← Yazıya Dön</Link>

      <div className="post-form-card">
        <div className="auth-header">
          <h1 className="auth-title">Yazıyı Düzenle</h1>
          <p className="auth-subtitle">#{id} numaralı yazıyı düzenleyin</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          {serverError && (
            <div className="auth-server-error" role="alert">{serverError}</div>
          )}

          {/* ── Title ──────────────────────────────────────────────── */}
          <div className="field-group">
            <label htmlFor="title" className="field-label">Başlık</label>
            <input
              id="title"
              name="title"
              type="text"
              value={fields.title}
              onChange={handleChange}
              className={`field-input${errors.title ? ' field-input--error' : ''}`}
              placeholder="Yazı başlığını girin"
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>

          {/* ── Image URL ─────────────────────────────────────────── */}
          <div className="field-group">
            <label htmlFor="image_url" className="field-label">
              Kapak Görseli URL
              <span className="field-label__optional"> (isteğe bağlı)</span>
            </label>
            <input
              id="image_url"
              name="image_url"
              type="url"
              value={fields.image_url}
              onChange={handleChange}
              className="field-input"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* ── Category ───────────────────────────────────────────── */}
          <div className="field-group">
            <label htmlFor="category" className="field-label">Kategori</label>
            <select
              id="category"
              name="category"
              value={fields.category}
              onChange={handleChange}
              disabled={categoriesLoading}
              className={`field-input field-select${errors.category ? ' field-input--error' : ''}`}
            >
              <option value="" disabled>
                {categoriesLoading ? 'Kategoriler yükleniyor…' : 'Kategori seçin…'}
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="field-error">{errors.category}</p>}
          </div>

          {/* ── Content ────────────────────────────────────────────── */}
          <div className="field-group">
            <label htmlFor="content" className="field-label">İçerik</label>
            <textarea
              id="content"
              name="content"
              rows={12}
              value={fields.content}
              onChange={handleChange}
              className={`field-input field-textarea${errors.content ? ' field-input--error' : ''}`}
              placeholder="Yazı içeriğini girin…"
            />
            <div className="field-hint">{fields.content.trim().length} karakter</div>
            {errors.content && <p className="field-error">{errors.content}</p>}
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Kaydediliyor…' : 'Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
