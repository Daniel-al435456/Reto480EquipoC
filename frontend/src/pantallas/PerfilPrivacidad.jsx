import { useState } from 'react';
import { Boton } from '../componentes/Boton.jsx';
import { Interruptor } from '../componentes/Interruptor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { PieLegal } from '../componentes/PieLegal.jsx';
import { esMenor, useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Perfil.module.css';

/** Descarga un archivo JSON con los datos del alumno (derecho de acceso y portabilidad). */
function descargarDatos(estado) {
  const { hashContrasena, ...cuenta } = estado.cuenta ?? {};
  const datos = {
    exportado: new Date().toISOString(),
    cuenta,
    alias: estado.alias,
    modoAnonimo: estado.anonimo,
    tramoEdad: estado.tramoEdad,
    consentimientoFamilia: estado.consentimientoFamilia,
    preferencias: { ...estado.ajustes, tutorIA: estado.tutorIA, modoEstudio: estado.modo },
    progreso: { cursoId: estado.cursoId, dominio: estado.dominio, completadas: estado.completadas },
    conversacionTutor: estado.mensajesTutor,
    eventos: estado.eventos,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'mis-datos-480-academy.json';
  enlace.click();
  URL.revokeObjectURL(url);
}

/** Perfil → Privacidad y datos: tutor con IA, qué datos usa, descargar y borrar datos. */
export function PerfilPrivacidad({ navegar }) {
  const { estado, cambiarTutorIA, borrarHistorialTutor, registrarEvento } = useEstado();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [aviso, setAviso] = useState('');

  return (
    <Pantalla titulo="Privacidad y datos" alVolver={() => navegar('/perfil')} textoVolver="Volver al perfil">
      <Interruptor
        titulo="Tutor con IA"
        descripcion="Si lo desactivas, no se envía nada a la IA y puedes escribir a un tutor de la academia."
        activo={estado.tutorIA}
        alCambiar={(valor) => {
          cambiarTutorIA(valor);
          registrarEvento('tutor_ia_cambiado', { activo: valor });
        }}
      />

      <section className={`${comun.tarjeta} ${estilos.datosIA}`} aria-labelledby="titulo-datos-ia">
        <h2 id="titulo-datos-ia">Qué datos usa la IA</h2>
        <p>
          <strong>Sí recibe:</strong> tu alias, {esMenor(estado) ? 'que eres menor de edad (para adaptar el tono), ' : ''}
          tu nivel en cada tema, tus respuestas y el texto de tus preguntas al tutor, sin correos, teléfonos ni nombres.
        </p>
        <p>
          <strong>Nunca recibe:</strong> tu nombre, apellidos, correo, empresa ni tu edad exacta.
        </p>
        <p className={comun.secundario}>Las conversaciones con el tutor se guardan 90 días.</p>
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-mis-datos">
        <h2 id="titulo-mis-datos">Tus datos</h2>
        <div className={comun.acciones}>
          <Boton
            variante="secundario"
            onClick={() => {
              descargarDatos(estado);
              registrarEvento('datos_descargados');
            }}
          >
            Descargar mis datos
          </Boton>
        </div>
        {confirmarBorrado ? (
          <div className={estilos.confirmarBloque} role="group" aria-label="Confirmar borrado">
            <p>¿Borrar toda la conversación con el tutor? No se puede deshacer.</p>
            <div className={comun.acciones}>
              <Boton
                variante="secundario"
                onClick={() => {
                  borrarHistorialTutor();
                  registrarEvento('historial_tutor_borrado');
                  setConfirmarBorrado(false);
                  setAviso('Historial con el tutor borrado.');
                }}
              >
                Sí, borrar
              </Boton>
              <Boton variante="texto" onClick={() => setConfirmarBorrado(false)}>
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <Boton variante="peligro" onClick={() => setConfirmarBorrado(true)}>
            Borrar mi historial con el tutor
          </Boton>
        )}
        <p role="status" className={comun.secundario}>
          {aviso}
        </p>
      </section>

      <PieLegal navegar={navegar} />
    </Pantalla>
  );
}
