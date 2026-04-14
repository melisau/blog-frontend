// Login page — handles user authentication.
// Validates input on the client before hitting the API to avoid
// unnecessary network requests for obviously invalid data.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// Simple regex — enough for client-side UX; the server performs real validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns an object whose keys are field names and values are error messages.
// An empty object means the form is valid.
function validate(fields) {
  const errors = {};
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
  return errors;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [fields, setFields] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  // serverError holds messages returned by the API (e.g. "invalid credentials").
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear the per-field error as soon as the user starts correcting the input.
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
      const { data } = await axiosInstance.post('/auth/login', {
        email: fields.email,
        password: fields.password,
      });
      // Persist the token via AuthContext, then send the user to the home page.
      login(data.token);
      navigate('/');
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Hoş Geldiniz</h1>
          <p className="auth-subtitle">Hesabınıza giriş yapın</p>
        </div>

        {/* noValidate disables browser tooltips so our custom errors show instead */}
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          {serverError && (
            <div className="auth-server-error" role="alert">
              {serverError}
            </div>
          )}

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
              autoComplete="current-password"
              value={fields.password}
              onChange={handleChange}
              className={`field-input${errors.password ? ' field-input--error' : ''}`}
              placeholder="••••••••"
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <p className="auth-switch">
          Hesabınız yok mu?{' '}
          <Link to="/register" className="auth-link">
            Kayıt Olun
          </Link>
        </p>
      </div>
    </div>
  );
}
