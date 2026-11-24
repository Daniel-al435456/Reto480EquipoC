import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: la aplicación funciona en cualquier carpeta del servidor
  // (Netlify, GitHub Pages o un subdirectorio de la plataforma de 480 Academy).
  base: './',
  server: {
    // Permite abrir el servidor de desarrollo desde el móvil en la misma red Wi-Fi.
    host: true,
  },
});
