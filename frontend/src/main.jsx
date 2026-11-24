import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './estilos/base.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registro del service worker (solo en producción, para no interferir con el desarrollo).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Si el navegador no lo permite, la aplicación funciona igual, solo que sin modo sin conexión.
    });
  });
}
