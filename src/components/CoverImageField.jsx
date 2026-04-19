export default function CoverImageField({
  fileInputRef,
  preview,
  error,
  isDragging,
  onFileChange,
  onRemove,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  return (
    <div className="field-group">
      <label className="field-label">
        Kapak Görseli
        <span className="field-label__optional"> (isteğe bağlı)</span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        style={{ display: 'none' }}
        tabIndex={-1}
      />

      {preview ? (
        <div className="cover-upload-zone__preview">
          <img src={preview} alt="Kapak önizlemesi" />
          <button
            type="button"
            className="cover-upload-zone__remove"
            onClick={onRemove}
            aria-label="Görseli kaldır"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          className={`cover-upload-zone${isDragging ? ' cover-upload-zone--dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
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

      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
