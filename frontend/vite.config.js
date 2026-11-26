import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dirección del backend en desarrollo (backend/README.md: uvicorn en el puerto 8000).
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: la aplicación funciona en cualquier carpeta del servidor
  // (Netlify, GitHub Pages o un subdirectorio de la plataforma de 480 Academy).
  base: './',
  server: {
    // Permite abrir el servidor de desarrollo desde el móvil en la misma red Wi-Fi.
    host: true,
    // Con VITE_API_URL=/ las peticiones a la API van al backend local a través de Vite:
    // sin problemas de CORS y funciona también desde el móvil.
    proxy: {
      '/api': BACKEND,
      '/salud': BACKEND,
    },
  },
});
