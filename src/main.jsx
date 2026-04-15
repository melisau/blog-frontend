// Entry point — mounts the React app into the DOM.
// BrowserRouter must wrap everything that uses React Router hooks.
// AuthProvider is no longer required because auth state is managed by
// Zustand, which does not need a React context Provider.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
