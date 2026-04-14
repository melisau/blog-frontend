// EditPost page — pre-populated form for updating an existing post.
// On mount, the current post is fetched so the form is not empty.
// Accessible only to authenticated users (enforced by PrivateRoute in App.jsx);
// server-side ownership is verified when the PUT request is sent.
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

// Returns a map of field-name → error message. Empty map means valid.
function validate(fields) {
  const errors = {}
  if (!fields.title.trim()) errors.title = 'Başlık zorunludur.'
  else if (fields.title.trim().length < 5) errors.title = 'Başlık en az 5 karakter olmalıdır.'
  if (!fields.content.trim()) errors.content = 'İçerik zorunludur.'
  else if (fields.content.trim().length < 20) errors.content = 'İçerik en az 20 karakter olmalıdır.'
  return errors
}

export default function EditPost() {
  // id comes from the URL segment defined in App.jsx as /edit-post/:id
  const { id } = useParams()
  const navigate = useNavigate()

  const [fields, setFields] = useState({ title: '', content: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  // fetching tracks the initial data load, separate from the submit loading state.
  const [fetching, setFetching] = useState(true)

  // Fetch the existing post once when the component mounts (or when id changes).
  // If the request fails (e.g. 404 or network error) an inline error is shown
  // instead of leaving the form blank with no feedback.
  useEffect(() => {
    axiosInstance
      .get(`/posts/${id}`)
      .then(({ data }) => setFields({ title: data.title, content: data.content }))
      .catch(() => setServerError('Yazı yüklenemedi.'))
      .finally(() => setFetching(false))
  }, [id])

  // Clears the per-field error the moment the user starts fixing it.
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
      // JWT is attached automatically by the Axios request interceptor.
      await axiosInstance.put(`/posts/${id}`, {
        title: fields.title,
        content: fields.content,
      })
      // On success, go back to the post detail page.
      navigate(`/posts/${id}`)
    } catch (err) {
      setServerError(err.response?.data?.message || 'Yazı güncellenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // Show a loading indicator while the existing post data is being fetched.
  if (fetching) {
    return (
      <div className="page-container page-container--narrow">
        <p className="auth-subtitle" style={{ textAlign: 'center', paddingTop: '40px' }}>
          Yükleniyor…
        </p>
      </div>
    )
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to={`/posts/${id}`} className="back-link">← Yazıya Dön</Link>

      <div className="auth-card" style={{ maxWidth: '100%' }}>
        <div className="auth-header">
          <h1 className="auth-title">Yazıyı Düzenle</h1>
          <p className="auth-subtitle">#{id} numaralı yazıyı düzenleyin</p>
        </div>

        {/* noValidate suppresses browser native tooltips in favour of custom errors */}
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          {serverError && (
            <div className="auth-server-error" role="alert">{serverError}</div>
          )}

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

          <div className="field-group">
            <label htmlFor="content" className="field-label">İçerik</label>
            <textarea
              id="content"
              name="content"
              rows={10}
              value={fields.content}
              onChange={handleChange}
              className={`field-input field-textarea${errors.content ? ' field-input--error' : ''}`}
              placeholder="Yazı içeriğini girin…"
            />
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
