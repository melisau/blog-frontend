// Centralised Axios instance used by every API call in the app.
// All components import this instead of raw axios so that auth headers
// and error handling are applied consistently in one place.
import axios from 'axios';

// baseURL is read from the Vite environment variable defined in .env.
// Falling back to localhost:8000 keeps local development working without
// a .env file.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Request interceptor — attaches the JWT stored in localStorage to every
// outgoing request as a Bearer token. Runs before the request is sent,
// so the token is always fresh if the user just logged in.
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handles expired or invalid tokens globally.
// A 401 means the server rejected the credentials, so the stale token is
// removed and the user is redirected to the login page.  This prevents
// silent failures where protected pages appear to load but return no data.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
