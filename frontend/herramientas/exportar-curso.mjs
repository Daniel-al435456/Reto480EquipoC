// Copia el curso de ejemplo del frontend (src/api/datos.js) al backend, en JSON, para que la API sirva
// el mismo contenido mientras no esté cargado en la base de datos (issue #15).
// Uso, desde la carpeta frontend:  node herramientas/exportar-curso.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cursos, DURACION_ACTIVIDADES, DURACION_RESUMEN } from '../src/api/datos.js';

const destino = fileURLToPath(new URL('../../backend/app/datos/cursos-ejemplo.json', import.meta.url));
const contenido = {
  aviso: 'Generado con frontend/herramientas/exportar-curso.mjs. No editar a mano.',
  duracionActividades: DURACION_ACTIVIDADES,
  duracionResumen: DURACION_RESUMEN,
  cursos,
};
writeFileSync(destino, JSON.stringify(contenido, null, 2) + '\n', 'utf8');
console.log(`Generado ${destino}`);
