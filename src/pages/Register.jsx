// Register page — creates a new user account.
// confirmPassword is validated client-side only; it is intentionally
// not sent to the API because the server does not need the duplicate field.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a map of field-name → error message. Empty map means valid.
function validate(fields) {
  const errors = {};
  if (!fields.username.trim()) {
    errors.username = 'Kullanıcı adı zorunludur.';
  } else if (fields.username.trim().length < 3) {
    errors.username = 'Kullanıcı adı en az 3 karakter olmalıdır.';
  }
  if (!fields.email.trim()) {
    errors.email = 'E-posta adresi zorunludur.';
  } else if (!EMAIL_RE.test(fields.email)) {
    errors.email = 'Geçerli bir e-posta adresi girin.';
  }
  if (!fields.password) {
    errors.password = 'Şifre zorunludur.';
  } else if (fields.password.length < 6) {
    errors.password = 'Şifre en az 6 karakter olmalıdır.';
  }
  // Confirm password is checked last so the password error shows first if both are wrong.
  if (!fields.confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunludur.';
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Şifreler eşleşmiyor.';
  }
  return errors;
}

export default function Register() {
  const navigate = useNavigate();

  const [fields, setFields] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clears the inline error for a field as soon as the user edits it.
  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      // confirmPassword is excluded — the API only needs username, email, password.
      await axiosInstance.post('/auth/register', {
        username: fields.username,
        email: fields.email,
        password: fields.password,
      });
      // On success, redirect to login instead of auto-login so the user
      // explicitly signs in after registration.
      navigate('/login');
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Kayıt olunamadı. Lütfen tekrar deneyin.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Hesap Oluştur</h1>
          <p className="auth-subtitle">Blogumuza katılın</p>
        </div>

        {/* noValidate turns off native browser validation bubbles */}
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          {serverError && (
            <div className="auth-server-error" role="alert">
              {serverError}
            </div>
          )}

          <div className="field-group">
            <label htmlFor="username" className="field-label">
              Kullanıcı Adı
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={fields.username}
              onChange={handleChange}
              className={`field-input${errors.username ? ' field-input--error' : ''}`}
              placeholder="kullanici_adi"
            />
            {errors.username && <p className="field-error">{errors.username}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="email" className="field-label">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={handleChange}
              className={`field-input${errors.email ? ' field-input--error' : ''}`}
              placeholder="ornek@mail.com"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password" className="field-label">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={fields.password}
              onChange={handleChange}
              className={`field-input${errors.password ? ' field-input--error' : ''}`}
              placeholder="••••••••"
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="confirmPassword" className="field-label">
              Şifre Tekrarı
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={handleChange}
              className={`field-input${errors.confirmPassword ? ' field-input--error' : ''}`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="field-error">{errors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Kayıt yapılıyor…' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="auth-switch">
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className="auth-link">
            Giriş Yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
