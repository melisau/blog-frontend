// Centralised Axios instance used by every API call in the app.
// All components import this instead of raw axios so that auth headers
// and error handling are applied consistently in one place.
import axios from 'axios';
import useToastStore from '../store/toastStore';
import useAuthStore from '../store/authStore';

// baseURL is read from the Vite environment variable defined in .env.
// Falling back to localhost:8000 keeps local development working without a .env file.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

function isAuthEndpoint(url = '') {
  const normalized = String(url).toLowerCase();
  return normalized.includes('/auth/login') || normalized.includes('/auth/register');
}

// Request interceptor — attaches the JWT to every outgoing request.
// Token is read from the Zustand store (getState() works outside React).
// Do NOT use localStorage.getItem('token') here: the persist middleware
// stores everything under the 'auth' key as a JSON object, so the bare
// 'token' key is always null and the header would never be attached.
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Human-readable fallback messages keyed by HTTP status code.
// Shown when the API does not include a recognisable message field.
const STATUS_MESSAGES = {
  400: 'Geçersiz istek. Lütfen bilgileri kontrol edin.',
  401: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  403: 'Bu işlem için yetkiniz bulunmuyor.',
  404: 'Aradığınız içerik bulunamadı.',
  409: 'Bu kayıt zaten mevcut.',
  422: 'Girilen veriler geçersiz.',
  429: 'Çok fazla istek gönderildi. Lütfen bekleyin.',
  500: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
  502: 'Sunucuya ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
  503: 'Hizmet şu anda kullanılamıyor.',
};

// extractMessage — resolves the most human-readable error string from an API
// response body, handling multiple backend conventions:
//
//   • { message: "..." }           — general REST APIs
//   • { error: "..." }             — some Express / Django APIs
//   • { detail: "..." }            — FastAPI simple errors
//   • { detail: [{ loc, msg }] }   — FastAPI Pydantic validation errors (422)
//
// For FastAPI validation arrays each item's `loc` ends with the field name and
// `msg` carries the human error.  We join them so the toast shows all issues.
export function extractMessage(data, status) {
  if (!data) return STATUS_MESSAGES[status] || 'Beklenmedik bir hata oluştu.';

  // FastAPI validation array: [{ loc: ["body", "email"], msg: "..." }, ...]
  if (Array.isArray(data.detail)) {
    const lines = data.detail.map((item) => {
      const field = item.loc?.at(-1) ?? '';
      return field ? `${field}: ${item.msg}` : item.msg;
    });
    return lines.join(' · ') || STATUS_MESSAGES[status];
  }

  // FastAPI simple string detail
  if (typeof data.detail === 'string') return data.detail;

  return (
    data.message ||
    data.error ||
    STATUS_MESSAGES[status] ||
    'Beklenmedik bir hata oluştu.'
  );
}

// Response interceptor — two responsibilities:
//   1. Show a toast for every API error so the user always gets feedback,
//      even when a page component has no inline error state.
//   2. Handle 401 globally: clear the stale token and redirect to /login.
//
// Toasts are dispatched via getState() — no React hook calls allowed here.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { addToast } = useToastStore.getState();

    if (error.response) {
      const { status, data } = error.response;
      const message = extractMessage(data, status);
      const requestUrl = error.config?.url || '';

      if (status === 401) {
        if (isAuthEndpoint(requestUrl)) {
          // Login/register failures are handled inline in their forms.
          return Promise.reject(error);
        }
        // Use the store's logout() so the persisted 'auth' key is properly
        // cleared — removeItem('token') would target the wrong localStorage key.
        useAuthStore.getState().logout();
        addToast({ message, type: 'error' });
        window.location.href = '/login';
      } else if (status >= 500) {
        addToast({ message, type: 'error' });
      } else if (status === 403) {
        addToast({ message, type: 'warning' });
      } else if (status === 404) {
        // 404s are usually handled inline; skip global toast to avoid duplicates.
      } else {
        // Covers 400, 409, 422, 429, etc.
        addToast({ message, type: 'error' });
      }
    } else if (error.request) {
      addToast({
        message: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.',
        type: 'error',
      });
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
