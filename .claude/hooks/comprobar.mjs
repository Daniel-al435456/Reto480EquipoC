// Sensor automático para Claude Code. La lógica está en los scripts de frontend/package.json;
// este archivo solo los llama y devuelve el error al asistente para que lo corrija.
//
//   rapido: tras editar un archivo de frontend/src o frontend/pruebas, ejecuta "npm test".
//   final:  cuando el asistente da la tarea por terminada, ejecuta "npm test" y "npm run build"
//           si ha cambiado algo en frontend/. Las pruebas en navegador quedan para "npm run verificar".
//
// Código de salida 2: Claude Code muestra el error al asistente (y, en "final", no le deja terminar).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FRONTEND = join(RAIZ, 'frontend');
const modo = process.argv[2];
let entrada = {};
try {
  entrada = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  // Sin datos de entrada: se comprueba igualmente.
}

function ejecutar(comando) {
  execSync(comando, { cwd: FRONTEND, stdio: 'pipe', encoding: 'utf8' });
}

function fallar(comando, error) {
  const salida = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n');
  process.stderr.write(`"${comando}" ha fallado en frontend/. Corrige el error antes de seguir:\n${salida}\n`);
  process.exit(2);
}

function hayCambiosEnFrontend() {
  try {
    return execSync('git status --porcelain -- frontend', { cwd: RAIZ, encoding: 'utf8' }).trim() !== '';
  } catch {
    return true;
  }
}

if (modo === 'rapido') {
  const fichero = entrada.tool_input?.file_path ?? '';
  const ruta = relative(FRONTEND, fichero).replaceAll('\\', '/');
  if (!/^(src|pruebas)\//.test(ruta)) process.exit(0);
  try {
    ejecutar('npm test');
  } catch (error) {
    fallar('npm test', error);
  }
}

if (modo === 'final') {
  // Si ya se bloqueó una vez y el asistente sigue sin poder arreglarlo, se le deja parar para no entrar en bucle.
  if (entrada.stop_hook_active || !hayCambiosEnFrontend()) process.exit(0);
  for (const comando of ['npm test', 'npm run build']) {
    try {
      ejecutar(comando);
    } catch (error) {
      fallar(comando, error);
    }
  }
}
