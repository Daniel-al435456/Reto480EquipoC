/*
 * Alias anónimos del alumno (pantallas pendientes de votación del equipo).
 * Mientras no exista backend, el alias se genera en el dispositivo a partir de esta lista.
 */

const ALIAS = [
  'Estrella azul',
  'Cometa verde',
  'Píxel curioso',
  'Faro tranquilo',
  'Brújula roja',
  'Nube veloz',
  'Ola serena',
  'Cohete gris',
  'Luna atenta',
  'Rayo amable',
  'Bosque claro',
  'Prisma alegre',
];

/** Devuelve un alias de la lista distinto del actual. */
export function generarAlias(actual = '') {
  const opciones = ALIAS.filter((a) => a !== actual);
  return opciones[Math.floor(Math.random() * opciones.length)];
}

/**
 * Patrón de 5 × 5 píxeles a partir del alias, simétrico como los avatares de 480.
 * El mismo alias genera siempre el mismo avatar. Devuelve 25 valores verdadero/falso.
 */
export function patronAvatar(alias) {
  let semilla = 2166136261;
  for (const caracter of alias || '480') {
    semilla ^= caracter.codePointAt(0);
    semilla = Math.imul(semilla, 16777619) >>> 0;
  }
  const celdas = [];
  for (let fila = 0; fila < 5; fila++) {
    const mitad = [0, 1, 2].map((col) => ((semilla >>> (fila * 3 + col)) & 1) === 1);
    celdas.push(mitad[0], mitad[1], mitad[2], mitad[1], mitad[0]);
  }
  // Garantiza que el avatar nunca quede vacío.
  celdas[12] = true;
  return celdas;
}
