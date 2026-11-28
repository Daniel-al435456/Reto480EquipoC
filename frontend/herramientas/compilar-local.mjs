// Compila la app sin backend (modo local) en dist-local/, para las pruebas en navegador del modo local
// (pruebas/e2e/local.test.js). Uso, desde la carpeta frontend:  npm run build:local
// Se hace con un script de Node y no con "VITE_API_URL= vite build" para que funcione también en Windows.
import { build } from 'vite';

// Una variable del entorno manda sobre las de los ficheros .env: vacía, la app no usa backend.
process.env.VITE_API_URL = '';
await build({ mode: 'test', build: { outDir: 'dist-local', emptyOutDir: true }, logLevel: 'warn' });
