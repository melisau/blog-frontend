// NewPost page — form for creating a blog post.
// Accessible only to authenticated users (enforced by PrivateRoute in App.jsx).
// After a successful POST the user is redirected to the newly created post's
// detail page using the id returned by the API.
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

export default function NewPost() {
  const navigate = useNavigate()
  const [fields, setFields] = useState({ title: '', content: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

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
      // The JWT is attached automatically by the Axios request interceptor.
      const { data } = await axiosInstance.post('/posts', {
        title: fields.title,
        content: fields.content,
      })
      // Navigate to the new post so the user can see the published result.
      navigate(`/posts/${data.id}`)
    } catch (err) {
      setServerError(err.response?.data?.message || 'Yazı oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="back-link">← Ana Sayfa</Link>

      <div className="auth-card" style={{ maxWidth: '100%' }}>
        <div className="auth-header">
          <h1 className="auth-title">Yeni Yazı</h1>
          <p className="auth-subtitle">Yeni bir blog yazısı oluşturun</p>
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
            {loading ? 'Kaydediliyor…' : 'Yayınla'}
          </button>
        </form>
      </div>
    </div>
  )
}
