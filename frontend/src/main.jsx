import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { iniciarPwa } from './pwa.js';
import './estilos/base.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Instalación, actualizaciones y service worker (este último solo en producción).
iniciarPwa({ registrarServiceWorker: import.meta.env.PROD });
