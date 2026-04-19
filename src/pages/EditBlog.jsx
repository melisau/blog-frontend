// EditBlog page — pre-populated form for updating an existing blog post.
// Fetches the blog data and category list on mount.
// Accessible only to authenticated users (PrivateRoute); server enforces ownership.
//
// Endpoints:
//   GET /blogs/{id}    → pre-populate form
//   GET /categories    → populate category dropdown
//   PUT /blogs/{id}    → save changes
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import RichTextEditor from '../components/RichTextEditor'

const FALLBACK_CATEGORIES = ['Teknoloji', 'Genel', 'Yaşam', 'Eğitim', 'Spor', 'Seyahat', 'Yemek', 'Bilim']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

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

  const [fields, setFields] = useState({ title: '', category: '', content: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)

  const [categories,        setCategories]        = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverError, setCoverError] = useState('')
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [initialImageUrl, setInitialImageUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  function isObjectUrl(url) {
    return typeof url === 'string' && url.startsWith('blob:')
  }

  // Fetch the existing blog to pre-populate the form.
  useEffect(() => {
    axiosInstance
      .get(`/blogs/${id}`)
      .then(({ data }) => {
        const imageUrl = data.cover_image_url ?? data.image_url ?? data.imageUrl ?? ''
        setFields({
          title:     data.title     ?? '',
          category:  data.category  ?? data.tag ?? '',
          content:   data.content   ?? data.body ?? '',
        })
        setInitialImageUrl(imageUrl)
        setCoverPreview(imageUrl || null)
        setCoverRemoved(false)
      })
      .catch(() => setServerError('Yazı yüklenemedi.'))
      .finally(() => setFetching(false))
  }, [id])

  useEffect(() => {
    return () => {
      if (isObjectUrl(coverPreview)) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

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

  const applyFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCoverError('Yalnızca resim dosyaları kabul edilir.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setCoverError('Dosya boyutu en fazla 5 MB olabilir.')
      return
    }

    setCoverError('')
    if (isObjectUrl(coverPreview)) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setCoverRemoved(false)
  }, [coverPreview])

  function removeCover() {
    if (isObjectUrl(coverPreview)) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview(null)
    setCoverRemoved(true)
    setCoverError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e) {
    applyFile(e.target.files?.[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    applyFile(e.dataTransfer.files?.[0])
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
      if (coverFile) {
        const fd = new FormData()
        fd.append('title', fields.title.trim())
        fd.append('category', fields.category)
        fd.append('content', fields.content.trim())
        fd.append('cover_image', coverFile)
        await axiosInstance.put(`/blogs/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await axiosInstance.put(`/blogs/${id}`, {
          title: fields.title.trim(),
          category: fields.category,
          content: fields.content.trim(),
          image_url: coverRemoved ? '' : initialImageUrl,
        })
      }
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
      <Link to={`/blogs/${id}`} className="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></Link>

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

          {/* ── Cover Image ───────────────────────────────────────── */}
          <div className="field-group">
            <label className="field-label">
              Kapak Görseli
              <span className="field-label__optional"> (isteğe bağlı)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              tabIndex={-1}
            />

            {coverPreview ? (
              <div className="cover-upload-zone__preview">
                <img src={coverPreview} alt="Kapak önizlemesi" />
                <button
                  type="button"
                  className="cover-upload-zone__remove"
                  onClick={removeCover}
                  aria-label="Görseli kaldır"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                className={`cover-upload-zone${isDragging ? ' cover-upload-zone--dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                aria-label="Kapak görseli yükle"
              >
                <div className="cover-upload-zone__placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="cover-upload-zone__text">
                    Görseli buraya sürükleyin veya
                    <span className="cover-upload-zone__link"> dosya seçin</span>
                  </span>
                  <span className="cover-upload-zone__hint">PNG, JPG, WEBP · Maks. 5 MB</span>
                </div>
              </div>
            )}

            {coverError && <p className="field-error">{coverError}</p>}
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
            <RichTextEditor
              id="content"
              value={fields.content}
              onChange={(next) => {
                setFields((prev) => ({ ...prev, content: next }))
                if (errors.content) setErrors((prev) => ({ ...prev, content: '' }))
              }}
              placeholder="Yazı içeriğini girin…"
              hasError={Boolean(errors.content)}
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
