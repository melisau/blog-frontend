// NewBlog page — form for creating a blog post.
// Accessible only to authenticated users (enforced by PrivateRoute in App.jsx).
// Fields: title, content (textarea), category (select from GET /categories), tags (chip input).
// After a successful POST the user is redirected to the newly created blog's
// detail page using the id returned by the API.
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

// Fallback list shown when GET /categories fails or returns an empty array.
const FALLBACK_CATEGORIES = ['Teknoloji', 'Genel', 'Yaşam', 'Eğitim', 'Spor', 'Seyahat', 'Yemek', 'Bilim']

const MAX_TAGS = 5   // prevent tag spam
const MAX_TAG_LENGTH = 24

// Returns a map of field-name → error message. Empty map means valid.
function validate(fields) {
  const errors = {}
  if (!fields.title.trim())
    errors.title = 'Başlık zorunludur.'
  else if (fields.title.trim().length < 5)
    errors.title = 'Başlık en az 5 karakter olmalıdır.'
  if (!fields.category)
    errors.category = 'Kategori seçimi zorunludur.'
  if (!fields.content.trim())
    errors.content = 'İçerik zorunludur.'
  else if (fields.content.trim().length < 20)
    errors.content = 'İçerik en az 20 karakter olmalıdır.'
  return errors
}

export default function NewBlog() {
  const navigate = useNavigate()

  const [fields, setFields] = useState({ title: '', category: '', content: '' })
  const [tags, setTags]         = useState([])
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState('')
  const [errors, setErrors]     = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]   = useState(false)

  // Categories fetched from GET /categories; falls back to FALLBACK_CATEGORIES.
  const [categories,        setCategories]        = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const tagInputRef = useRef(null)

  useEffect(() => {
    axiosInstance
      .get('/categories')
      .then(({ data }) => {
        // API may return [{ id, name }] objects or plain strings.
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.categories ?? [])
        const names = list.map((c) => (typeof c === 'string' ? c : (c.name ?? c.title ?? String(c))))
        setCategories(names.length > 0 ? names : FALLBACK_CATEGORIES)
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES))
      .finally(() => setCategoriesLoading(false))
  }, [])

  // Generic handler for title / category / content.
  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // Add a tag from the current tagInput value.
  // Called on Enter key or comma character.
  function addTag(raw) {
    const tag = raw.trim().replace(/,+$/, '')   // strip trailing commas
    if (!tag) return

    if (tag.length < 2) {
      setTagError('Etiket en az 2 karakter olmalıdır.')
      return
    }
    if (tag.length > MAX_TAG_LENGTH) {
      setTagError(`Etiket en fazla ${MAX_TAG_LENGTH} karakter olabilir.`)
      return
    }
    if (tags.includes(tag)) {
      setTagError('Bu etiket zaten eklenmiş.')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setTagError(`En fazla ${MAX_TAGS} etiket eklenebilir.`)
      return
    }

    setTags((prev) => [...prev, tag])
    setTagInput('')
    setTagError('')
  }

  function handleTagKeyDown(e) {
    // Enter or comma → commit the current input as a tag
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    // Backspace on empty input → remove the last tag
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
      setTagError('')
    }
  }

  function removeTag(index) {
    setTags((prev) => prev.filter((_, i) => i !== index))
    setTagError('')
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
      // JWT is attached automatically by the Axios request interceptor.
      const { data } = await axiosInstance.post('/blogs', {
        title:    fields.title,
        category: fields.category,
        content:  fields.content,
        tags,
      })
      navigate(`/blogs/${data.id}`)
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Yazı oluşturulamadı. Lütfen tekrar deneyin.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">← Ana Sayfa</Link>

      <div className="post-form-card">
        <div className="auth-header">
          <h1 className="auth-title">Yeni Yazı</h1>
          <p className="auth-subtitle">Yeni bir blog yazısı oluşturun</p>
        </div>

        {/* noValidate suppresses browser native tooltips in favour of custom errors */}
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
            <div className="field-hint">
              {fields.content.trim().length} karakter
            </div>
            {errors.content && <p className="field-error">{errors.content}</p>}
          </div>

          {/* ── Tags ───────────────────────────────────────────────── */}
          <div className="field-group">
            <label className="field-label">
              Etiketler
              <span className="field-label__optional"> (isteğe bağlı)</span>
            </label>

            {/* Chip container — clicking anywhere focuses the hidden input */}
            <div
              className={`tag-input-box${tagError ? ' field-input--error' : ''}`}
              onClick={() => tagInputRef.current?.focus()}
            >
              {tags.map((tag, i) => (
                <span key={i} className="tag-chip">
                  #{tag}
                  <button
                    type="button"
                    className="tag-chip__remove"
                    onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                    aria-label={`${tag} etiketini kaldır`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.length < MAX_TAGS && (
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    // Commit immediately on comma character
                    if (e.target.value.includes(',')) {
                      addTag(e.target.value)
                    } else {
                      setTagInput(e.target.value)
                      if (tagError) setTagError('')
                    }
                  }}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  className="tag-input-field"
                  placeholder={tags.length === 0 ? 'Etiket ekle, Enter veya , ile onayla' : ''}
                />
              )}
            </div>

            <div className="field-hint">
              {tags.length}/{MAX_TAGS} etiket · Enter veya virgül ile ekleyin · Backspace ile silin
            </div>
            {tagError && <p className="field-error">{tagError}</p>}
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Kaydediliyor…' : 'Yayınla'}
          </button>
        </form>
      </div>
    </div>
  )
}
