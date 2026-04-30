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
import CoverImageField from '../components/CoverImageField'
import { useCategories } from '../hooks/useCategories'
import { resolveImageUrl } from '../services/blogMapper'

const MAX_TAGS = 5
const MAX_TAG_LENGTH = 24
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

function validate(fields) {
  const errors = {}
  if (!fields.title.trim()) errors.title = 'Başlık zorunludur.'
  else if (fields.title.trim().length < 5) errors.title = 'Başlık en az 5 karakter olmalıdır.'
  if (!fields.categoryId) errors.category = 'Kategori seçimi zorunludur.'
  if (!fields.content.trim()) errors.content = 'İçerik zorunludur.'
  else if (fields.content.trim().length < 20) errors.content = 'İçerik en az 20 karakter olmalıdır.'
  return errors
}

export default function EditBlog() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [fields, setFields] = useState({ title: '', categoryId: '', content: '' })
  const [tags, setTags]             = useState([])
  const [tagInput, setTagInput]     = useState('')
  const [tagError, setTagError]     = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)

  const { categories, categoriesLoading, categoriesError, retryCategories } = useCategories()
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverError, setCoverError] = useState('')
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const tagInputRef  = useRef(null)
  const fileInputRef = useRef(null)

  function isObjectUrl(url) {
    return typeof url === 'string' && url.startsWith('blob:')
  }

  // Fetch the existing blog to pre-populate the form.
  useEffect(() => {
    axiosInstance
      .get(`/blogs/${id}`)
      .then(({ data }) => {
        const rawImageUrl = data.cover_image_url ?? ''
        setFields({
          title: data.title ?? '',
          categoryId: data.category?.id ?? '',
          content: data.content ?? '',
        })
        setTags(data.tags ?? [])
        setCoverPreview(rawImageUrl ? resolveImageUrl(rawImageUrl) : null)
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

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (name === 'categoryId' && errors.category) {
      setErrors((prev) => ({ ...prev, category: '' }))
      return
    }
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
        fd.append('category_id', fields.categoryId)
        fd.append('content', fields.content.trim())
        fd.append('tags', JSON.stringify(tags))
        fd.append('cover_image', coverFile)
        await axiosInstance.put(`/blogs/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await axiosInstance.put(`/blogs/${id}`, {
          title: fields.title.trim(),
          category_id: fields.categoryId,
          content: fields.content.trim(),
          tags: tags,
          remove_cover_image: coverRemoved,
        })
      }
      navigate(`/blogs/${id}`)
    } catch (err) {
      setServerError(
        err.response?.data?.detail ||
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
          {categoriesError && (
            <div className="auth-server-error" role="alert">
              {categoriesError}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: 8 }}
                onClick={retryCategories}
              >
                Tekrar Dene
              </button>
            </div>
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

          <CoverImageField
            fileInputRef={fileInputRef}
            preview={coverPreview}
            error={coverError}
            isDragging={isDragging}
            onFileChange={handleFileChange}
            onRemove={removeCover}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          {/* ── Category ───────────────────────────────────────────── */}
          <div className="field-group">
            <label htmlFor="categoryId" className="field-label">Kategori</label>
            <select
              id="categoryId"
              name="categoryId"
              value={fields.categoryId}
              onChange={handleChange}
              disabled={categoriesLoading || Boolean(categoriesError)}
              className={`field-input field-select${errors.category ? ' field-input--error' : ''}`}
            >
              <option value="" disabled>
                {categoriesLoading ? 'Kategoriler yükleniyor…' : categoriesError ? 'Kategoriler yüklenemedi' : 'Kategori seçin…'}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
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

          {/* ── Tags ───────────────────────────────────────────────── */}
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

          <button type="submit" disabled={loading || categoriesLoading || Boolean(categoriesError)} className="auth-btn">
            {loading ? 'Kaydediliyor…' : 'Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
