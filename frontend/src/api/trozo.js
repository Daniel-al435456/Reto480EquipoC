/**
 * Dónde está el vídeo respecto al trozo de la lección (inicio y fin en segundos).
 * "antes": el alumno ha ido a un punto anterior al trozo (con 1 s de margen).
 * "despues": ha llegado al final del trozo o lo ha pasado.
 * "dentro": está dentro del trozo. Sin fin, el trozo llega hasta el final del vídeo.
 */
export function estadoTrozo(tiempo, inicio = 0, fin = null) {
  if (fin && tiempo >= fin) return 'despues';
  if (tiempo < inicio - 1) return 'antes';
  return 'dentro';
}

/** Segundos en formato m:ss, como en YouTube: 212 → "3:32". */
export function formatoMinuto(segundos = 0) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
