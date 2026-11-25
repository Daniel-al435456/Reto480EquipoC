/* Comparación de rutas con parámetros ("/curso/:cursoId"). Sin dependencias, para poder probarla. */

/**
 * Compara una ruta con un patrón como "/curso/:id/sesion/:paso".
 * Devuelve los parámetros o null si no coincide.
 */
export function coincide(patron, ruta) {
  const partesPatron = patron.split('/').filter(Boolean);
  const partesRuta = ruta.split('/').filter(Boolean);
  if (partesPatron.length !== partesRuta.length) return null;
  const parametros = {};
  for (let i = 0; i < partesPatron.length; i++) {
    if (partesPatron[i].startsWith(':')) {
      parametros[partesPatron[i].slice(1)] = decodeURIComponent(partesRuta[i]);
    } else if (partesPatron[i] !== partesRuta[i]) {
      return null;
    }
  }
  return parametros;
}
