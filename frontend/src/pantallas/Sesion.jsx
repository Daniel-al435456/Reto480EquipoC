import { useEffect } from 'react';
import { obtenerCurso } from '../api/cliente.js';
import { Boton } from '../componentes/Boton.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import { Actividades } from './Actividades.jsx';
import { Video } from './Video.jsx';
import comun from './comun.module.css';

/** Recorre los pasos de la sesión de hoy: vídeo o lectura, y después las actividades. */
export function Sesion({ cursoId, paso: pasoTexto, navegar }) {
  const curso = obtenerCurso(cursoId);
  const { estado, irAPaso, terminarSesion, registrarEvento } = useEstado();
  const sesion = estado.sesion;
  const indice = Number(pasoTexto);
  const fin = pasoTexto === 'fin';

  useEffect(() => {
    if (!fin && (!sesion || Number.isNaN(indice) || !sesion.pasos[indice])) {
      navegar(`/curso/${cursoId}/hoy`);
    } else if (!fin && sesion.indice !== indice) {
      irAPaso(indice);
    }
  }, [fin, sesion, indice, cursoId, navegar, irAPaso]);

  if (!curso) return null;

  if (fin) {
    return (
      <Pantalla titulo="¡Sesión completada!" subtitulo={curso.titulo}>
        <p className={comun.correcto}>Has terminado la sesión de hoy. Lo que has aprendido ya cuenta en tu progreso.</p>
        <Boton anchoCompleto onClick={() => navegar('/progreso')}>
          Ver mi progreso
        </Boton>
        <Boton anchoCompleto variante="secundario" onClick={() => navegar(`/curso/${cursoId}/hoy`)}>
          Hacer otra sesión
        </Boton>
      </Pantalla>
    );
  }

  const paso = sesion?.pasos[indice];
  if (!paso) return null;
  const leccion = curso.lecciones.find((l) => l.id === paso.leccionId);

  const siguiente = () => {
    if (indice + 1 < sesion.pasos.length) {
      navegar(`/curso/${cursoId}/sesion/${indice + 1}`);
    } else {
      registrarEvento('sesion_completada', { cursoId });
      terminarSesion();
      navegar(`/curso/${cursoId}/sesion/fin`);
    }
  };

  const salir = () => {
    registrarEvento('sesion_abandonada', { cursoId, paso: indice });
    terminarSesion();
    navegar(`/curso/${cursoId}/hoy`);
  };

  const comunes = {
    leccion,
    paso,
    numero: indice + 1,
    total: sesion.pasos.length,
    alSiguiente: siguiente,
    alSalir: salir,
    navegar,
  };

  if (paso.tipo === 'actividades') {
    const anterior = sesion.pasos[indice - 1];
    return <Actividades key={indice} {...comunes} cuentaComoLeccion={anterior?.tipo !== 'resumen'} />;
  }
  return <Video key={indice} {...comunes} />;
}
