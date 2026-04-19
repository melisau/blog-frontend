import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import RichTextEditor from '../components/RichTextEditor'

const FALLBACK_CATEGORIES = ['Teknoloji', 'Genel', 'Yaşam', 'Eğitim', 'Spor', 'Seyahat', 'Yemek', 'Bilim']
  .map((name) => ({ id: name, name }))

const MAX_TAGS = 5
const MAX_TAG_LENGTH = 24
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

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

  const [fields, setFields]         = useState({ title: '', category: '', content: '' })
  const [tags, setTags]             = useState([])
  const [tagInput, setTagInput]     = useState('')
  const [tagError, setTagError]     = useState('')
  const [errors, setErrors]         = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]       = useState(false)

  // Cover image
  const [coverFile, setCoverFile]       = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverError, setCoverError]     = useState('')
  const [isDragging, setIsDragging]     = useState(false)

  const [categories,        setCategories]        = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const tagInputRef  = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    axiosInstance
      .get('/categories')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? data?.categories ?? [])
        const mapped = list.map((c) =>
          typeof c === 'string'
            ? { id: c, name: c }
            : { id: c.id ?? c._id ?? c.name ?? c.title ?? String(c), name: c.name ?? c.title ?? String(c) }
        )
        setCategories(mapped.length > 0 ? mapped : FALLBACK_CATEGORIES)
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES))
      .finally(() => setCategoriesLoading(false))
  }, [])

  // Revoke preview URL when component unmounts or file changes to avoid memory leaks
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // ── Cover image helpers ─────────────────────────────────────────────────────

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
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }, [coverPreview])

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview(null)
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

  // ── Tag helpers ─────────────────────────────────────────────────────────────

  function addTag(raw) {
    const tag = raw.trim().replace(/,+$/, '')
    if (!tag) return
    if (tag.length < 2) { setTagError('Etiket en az 2 karakter olmalıdır.'); return }
    if (tag.length > MAX_TAG_LENGTH) { setTagError(`Etiket en fazla ${MAX_TAG_LENGTH} karakter olabilir.`); return }
    if (tags.includes(tag)) { setTagError('Bu etiket zaten eklenmiş.'); return }
    if (tags.length >= MAX_TAGS) { setTagError(`En fazla ${MAX_TAGS} etiket eklenebilir.`); return }
    setTags((prev) => [...prev, tag])
    setTagInput('')
    setTagError('')
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
      setTagError('')
    }
  }

  function removeTag(index) {
    setTags((prev) => prev.filter((_, i) => i !== index))
    setTagError('')
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return }

    setLoading(true)
    setServerError('')

    try {
      const fd = new FormData()
      fd.append('title',       fields.title.trim())
      fd.append('content',     fields.content.trim())
      fd.append('category_id', fields.category)
      fd.append('tags',        JSON.stringify(tags))
      if (coverFile) fd.append('cover_image', coverFile)

      const { data } = await axiosInstance.post('/blogs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/blogs/${data.id}`)
    } catch (err) {
      setServerError(
        err.response?.data?.detail ?? err.response?.data?.message ?? 'Yazı oluşturulamadı. Lütfen tekrar deneyin.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </Link>

      <div className="post-form-card">
        <div className="auth-header">
          <h1 className="auth-title">Yeni Yazı</h1>
          <p className="auth-subtitle">Yeni bir blog yazısı oluşturun</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          {serverError && (
            <div className="auth-server-error" role="alert">{serverError}</div>
          )}

          {/* ── Title ── */}
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

          {/* ── Cover Image ── */}
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

          {/* ── Category ── */}
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
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category && <p className="field-error">{errors.category}</p>}
          </div>

          {/* ── Content ── */}
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

          {/* ── Tags ── */}
          <div className="field-group">
            <label className="field-label">
              Etiketler
              <span className="field-label__optional"> (isteğe bağlı)</span>
            </label>

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
