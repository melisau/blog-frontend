export default function CommentForm({ 
  onSubmit, 
  text, 
  setText, 
  error, 
  setError, 
  submitting, 
  success 
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="comment-form">
      <h3 className="comment-form__title">Yorum Yaz</h3>
      
      {error && <div className="auth-server-error" style={{ marginBottom: 12 }}>{error}</div>}
      {success && <div className="comment-form__success">Yorumunuz yayınlandı ✓</div>}

      <div className="field-group">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => { setText(e.target.value); if (error) setError(''); }}
          className="field-input field-textarea"
          placeholder="Düşüncelerinizi paylaşın…"
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        disabled={submitting}
      >
        {submitting ? 'Gönderiliyor…' : 'Yorum Yap'}
      </button>
    </form>
  )
}
