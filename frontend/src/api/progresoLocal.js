/*
 * Progreso de cada cuenta en este móvil (issue #57), hasta que esté en el servidor (ramas 3 y 4).
 * Al cambiar de cuenta, se guarda el progreso de la anterior y se recupera el de la nueva si ya había entrado aquí
 * (api/sesion.js decide qué se guarda y qué se recupera). Sin almacenamiento (modo privado), no se guarda nada y cada
 * cuenta empieza de cero.
 */
import { claveProgreso, progresoParaGuardar, progresoRecuperado } from './sesion.js';

/** Claves de versiones anteriores del estado: guardaban la cuenta entera (nombre, correo, resumen de la contraseña). */
const CLAVES_ANTIGUAS = ['reto480-estado-v3', 'reto480-estado-v4'];

export function guardarProgreso(estado) {
  if (!estado.cuenta?.email) return;
  try {
    localStorage.setItem(claveProgreso(estado.cuenta.email), JSON.stringify(progresoParaGuardar(estado)));
  } catch {
    // Modo privado: el progreso de la cuenta anterior se pierde al cambiar de cuenta.
  }
}

/** El progreso guardado de la cuenta de ese perfil, o {} si no hay (o era de otra cuenta con el mismo correo). */
export function leerProgreso(perfil) {
  try {
    return progresoRecuperado(JSON.parse(localStorage.getItem(claveProgreso(perfil.email))), perfil);
  } catch {
    return {};
  }
}

export function borrarProgreso(email) {
  try {
    if (email) localStorage.removeItem(claveProgreso(email));
  } catch {
    // Nada que borrar.
  }
}

/** Borra el estado guardado por versiones anteriores de la app. */
export function borrarClavesAntiguas() {
  try {
    for (const clave of CLAVES_ANTIGUAS) localStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}
